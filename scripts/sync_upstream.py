#!/usr/bin/env python3
"""Bring calesthio/OpenMontage (remote `origin`, branch `main`) into the current branch.

Never leaves the working copy worse than it found it:

1. fetch; nothing to do if already up to date
2. abort if an uncommitted local file is also changed upstream
3. REHEARSAL in a throwaway worktree: merge + your uncommitted files + test suite.
   A conflict or a red test stops here, with HEAD untouched.
4. tag the current HEAD as `pre-sync/<timestamp>`, then merge for real
5. re-run the tests in the real tree; if red, `git reset --keep` to the tag
   (uncommitted work is kept)

Never pushes. Usage:
    .venv/bin/python scripts/sync_upstream.py            # sync
    .venv/bin/python scripts/sync_upstream.py --check    # only report
"""

from __future__ import annotations

import argparse
import shlex
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path

EXIT_OK = 0
EXIT_BEHIND = 10  # --check only: upstream has commits we do not
EXIT_BAD_STATE = 2
EXIT_DIRTY_OVERLAP = 3
EXIT_CONFLICT = 4
EXIT_TESTS_FAILED = 5
EXIT_ROLLED_BACK = 6

# Uncommitted files bigger than this (renders, footage) are not copied into the
# rehearsal: tests never read them and they would make the rehearsal slow.
_OVERLAY_MAX_BYTES = 5 * 1024 * 1024


def _git(repo: Path, *args: str, check: bool = True) -> subprocess.CompletedProcess:
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True, check=check)


def _out(repo: Path, *args: str) -> str:
    return _git(repo, *args).stdout.strip()


def _lines(text: str) -> list[str]:
    return [line for line in text.splitlines() if line]


def _say(msg: str) -> None:
    print(f"[sync] {msg}", flush=True)


def _dirty_files(repo: Path) -> list[str]:
    """Tracked files with uncommitted changes plus untracked, non-ignored files."""
    tracked = _lines(_out(repo, "diff", "--name-only", "HEAD"))
    untracked = _lines(_out(repo, "ls-files", "--others", "--exclude-standard"))
    return sorted(set(tracked) | set(untracked))


def _run_tests(cmd: str, cwd: Path) -> tuple[bool, str]:
    proc = subprocess.run(cmd, shell=True, cwd=cwd, capture_output=True, text=True)
    tail = "\n".join((proc.stdout + proc.stderr).strip().splitlines()[-15:])
    return proc.returncode == 0, tail


def _install_python_deps(repo: Path) -> None:
    # The venv is uv-built and has no bin/pip; `python -m pip` is what exists.
    python = repo / ".venv" / "bin" / "python"
    req = repo / "requirements-dev.txt"
    if python.exists() and req.exists():
        _say("requirements changed upstream: installing into .venv")
        subprocess.run([str(python), "-m", "pip", "install", "-q", "-r", str(req)], cwd=repo, check=False)


def _rehearse(repo: Path, ref: str, dirty: list[str], test_cmd: str) -> int:
    tmp = Path(tempfile.mkdtemp(prefix="openmontage-rehearsal-"))
    wt = tmp / "rehearsal"
    try:
        _git(repo, "worktree", "add", "-q", "--detach", str(wt), "HEAD")
        merge = _git(wt, "merge", "--no-edit", "-q", ref, check=False)
        if merge.returncode != 0:
            conflicts = _lines(_out(wt, "diff", "--name-only", "--diff-filter=U"))
            _say("CONFLICT in rehearsal, nothing was touched. Files to resolve by hand:")
            for f in conflicts or [merge.stderr.strip()]:
                _say(f"  - {f}")
            return EXIT_CONFLICT

        for rel in dirty:
            src = repo / rel
            if src.is_file() and src.stat().st_size <= _OVERLAY_MAX_BYTES:
                dst = wt / rel
                dst.parent.mkdir(parents=True, exist_ok=True)
                shutil.copy2(src, dst)

        _say(f"rehearsal: running tests ({test_cmd})")
        ok, tail = _run_tests(test_cmd, wt)
        if not ok:
            _say("TESTS FAILED in rehearsal, nothing was touched. Last lines:")
            print(tail)
            return EXIT_TESTS_FAILED
        return EXIT_OK
    finally:
        _git(repo, "worktree", "remove", "--force", str(wt), check=False)
        shutil.rmtree(tmp, ignore_errors=True)
        _git(repo, "worktree", "prune", check=False)


def main(argv: list[str] | None = None) -> int:
    root = Path(__file__).resolve().parents[1]
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--repo", type=Path, default=root)
    p.add_argument("--remote", default="origin")
    p.add_argument("--branch", default="main")
    p.add_argument("--check", action="store_true", help="report only, change nothing")
    p.add_argument("--no-deps", action="store_true", help="skip pip/npm installs")
    p.add_argument(
        "--test-cmd",
        default=f"{shlex.quote(str(root / '.venv' / 'bin' / 'python'))} -m pytest tests -q -x -p no:cacheprovider",
    )
    args = p.parse_args(argv)
    repo: Path = args.repo.resolve()
    ref = f"{args.remote}/{args.branch}"

    if (repo / ".git" / "MERGE_HEAD").exists() or (repo / ".git" / "rebase-merge").exists():
        _say("a merge or rebase is already in progress; finish or abort it first")
        return EXIT_BAD_STATE
    branch = _git(repo, "symbolic-ref", "--short", "-q", "HEAD", check=False).stdout.strip()
    if not branch:
        _say("HEAD is detached; check out a branch first")
        return EXIT_BAD_STATE

    fetched = _git(repo, "fetch", "-q", args.remote, args.branch, check=False)
    if fetched.returncode != 0:
        _say(f"could not fetch {ref}: {fetched.stderr.strip()}")
        return EXIT_BAD_STATE

    behind = int(_out(repo, "rev-list", "--count", f"HEAD..{ref}"))
    ahead = int(_out(repo, "rev-list", "--count", f"{ref}..HEAD"))
    _say(f"branch '{branch}': {behind} behind {ref}, {ahead} ahead")
    if behind == 0:
        _say("already up to date")
        return EXIT_OK
    if args.check:
        for line in _lines(_out(repo, "log", "--oneline", f"HEAD..{ref}"))[:15]:
            _say(f"  {line}")
        return EXIT_BEHIND

    upstream_changed = set(_lines(_out(repo, "diff", "--name-only", f"HEAD...{ref}")))
    dirty = _dirty_files(repo)
    overlap = sorted(upstream_changed.intersection(dirty))
    if overlap:
        _say("ABORT: these files have uncommitted edits AND changed upstream. Commit them first:")
        for f in overlap:
            _say(f"  - {f}")
        return EXIT_DIRTY_OVERLAP

    if not args.no_deps and any(f.startswith("requirements") for f in upstream_changed):
        _install_python_deps(repo)

    code = _rehearse(repo, ref, dirty, args.test_cmd)
    if code != EXIT_OK:
        return code

    tag = f"pre-sync/{time.strftime('%Y%m%d-%H%M%S')}"
    _git(repo, "tag", tag, "HEAD")
    _say(f"rehearsal green; backup tag {tag}; merging for real")
    merge = _git(repo, "merge", "--no-edit", "-q", ref, check=False)
    if merge.returncode != 0:
        _git(repo, "merge", "--abort", check=False)
        _say(f"real merge failed and was aborted: {merge.stderr.strip()}")
        return EXIT_CONFLICT

    if not args.no_deps and upstream_changed & {
        "remotion-composer/package.json",
        "remotion-composer/package-lock.json",
    }:
        _say("remotion-composer dependencies changed: npm install")
        subprocess.run(["npm", "install", "--silent"], cwd=repo / "remotion-composer", check=False)

    ok, tail = _run_tests(args.test_cmd, repo)
    if not ok:
        _git(repo, "reset", "--keep", tag)
        _say(f"tests failed after merge; ROLLED BACK to {tag} (your uncommitted work is kept)")
        print(tail)
        return EXIT_ROLLED_BACK

    _say(f"done: merged {behind} upstream commit(s). Undo with: git reset --keep {tag}")
    return EXIT_OK


if __name__ == "__main__":
    sys.exit(main())
