"""sync_upstream must never leave the working copy worse than it found it."""

from __future__ import annotations

import importlib.util
import subprocess
from pathlib import Path

import pytest

_SPEC = importlib.util.spec_from_file_location(
    "sync_upstream", Path(__file__).resolve().parents[2] / "scripts" / "sync_upstream.py"
)
sync = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(sync)


def _git(cwd: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=cwd, check=True, capture_output=True, text=True
    ).stdout.strip()


def _commit(repo: Path, name: str, content: str, msg: str) -> None:
    (repo / name).parent.mkdir(parents=True, exist_ok=True)
    (repo / name).write_text(content)
    _git(repo, "add", name)
    _git(repo, "commit", "-qm", msg)


@pytest.fixture
def repos(tmp_path):
    """upstream (calesthio stand-in) and a local clone on its own branch."""
    up = tmp_path / "upstream"
    up.mkdir()
    _git(up, "init", "-q", "-b", "main")
    _git(up, "config", "user.email", "t@t")
    _git(up, "config", "user.name", "t")
    _commit(up, "a.txt", "base\n", "base")
    local = tmp_path / "local"
    _git(tmp_path, "clone", "-q", str(up), str(local))
    _git(local, "config", "user.email", "t@t")
    _git(local, "config", "user.name", "t")
    _git(local, "checkout", "-qb", "mine")
    _commit(local, "mine.txt", "local work\n", "local")
    return up, local


def _run(local: Path, test_cmd: str = "true") -> int:
    return sync.main(["--repo", str(local), "--test-cmd", test_cmd, "--no-deps"])


def test_up_to_date_is_noop(repos):
    _, local = repos
    head = _git(local, "rev-parse", "HEAD")
    assert _run(local) == sync.EXIT_OK
    assert _git(local, "rev-parse", "HEAD") == head


def test_clean_merge_lands_and_tags_backup(repos):
    up, local = repos
    _commit(up, "b.txt", "new upstream\n", "upstream fix")
    before = _git(local, "rev-parse", "HEAD")
    assert _run(local) == sync.EXIT_OK
    assert (local / "b.txt").exists()
    assert (local / "mine.txt").exists()
    tags = _git(local, "tag", "--list", "pre-sync/*").splitlines()
    assert tags and _git(local, "rev-parse", tags[-1]) == before


def test_uncommitted_file_touched_upstream_aborts_without_changes(repos):
    up, local = repos
    _commit(up, "a.txt", "upstream edit\n", "upstream edits a")
    (local / "a.txt").write_text("my unsaved edit\n")
    head = _git(local, "rev-parse", "HEAD")
    assert _run(local) == sync.EXIT_DIRTY_OVERLAP
    assert _git(local, "rev-parse", "HEAD") == head
    assert (local / "a.txt").read_text() == "my unsaved edit\n"


def test_conflict_is_caught_in_rehearsal_and_head_untouched(repos):
    up, local = repos
    _commit(up, "mine.txt", "upstream version\n", "upstream conflicts")
    head = _git(local, "rev-parse", "HEAD")
    assert _run(local) == sync.EXIT_CONFLICT
    assert _git(local, "rev-parse", "HEAD") == head
    assert _git(local, "status", "--porcelain") == ""
    assert "rehearsal" not in _git(local, "worktree", "list")


def test_failing_tests_block_the_merge(repos):
    up, local = repos
    _commit(up, "b.txt", "new upstream\n", "upstream fix")
    head = _git(local, "rev-parse", "HEAD")
    assert _run(local, test_cmd="false") == sync.EXIT_TESTS_FAILED
    assert _git(local, "rev-parse", "HEAD") == head
    assert not (local / "b.txt").exists()


def test_uncommitted_work_survives_a_successful_sync(repos):
    up, local = repos
    _commit(up, "b.txt", "new upstream\n", "upstream fix")
    (local / "notes.md").write_text("untracked idea\n")
    (local / "mine.txt").write_text("edited, not committed\n")
    assert _run(local) == sync.EXIT_OK
    assert (local / "notes.md").read_text() == "untracked idea\n"
    assert (local / "mine.txt").read_text() == "edited, not committed\n"
    assert (local / "b.txt").exists()


def test_check_only_reports_behind_without_merging(repos):
    up, local = repos
    _commit(up, "b.txt", "x\n", "upstream fix")
    head = _git(local, "rev-parse", "HEAD")
    code = sync.main(["--repo", str(local), "--check"])
    assert code == sync.EXIT_BEHIND
    assert _git(local, "rev-parse", "HEAD") == head
