from __future__ import annotations

from unittest.mock import MagicMock, patch

from tools.audio.voicestudio_tts import VoiceStudioTTS
from tools.base_tool import ToolStatus


def _response(*, content=b"", json_data=None, status_code=200, ctype="audio/wav"):
    response = MagicMock()
    response.status_code = status_code
    response.ok = status_code < 400
    response.content = content
    response.headers = {"Content-Type": ctype}
    response.json.return_value = json_data
    response.text = str(json_data)
    return response


def test_status_available_only_when_backend_reports_ok():
    with patch("requests.get", return_value=_response(json_data={"status": "ok"})):
        assert VoiceStudioTTS().get_status() == ToolStatus.AVAILABLE
    # "starting" means the ML runtime is still loading: not usable yet.
    with patch("requests.get", return_value=_response(json_data={"status": "starting"})):
        assert VoiceStudioTTS().get_status() == ToolStatus.UNAVAILABLE
    with patch("requests.get", side_effect=ConnectionError("refused")):
        assert VoiceStudioTTS().get_status() == ToolStatus.UNAVAILABLE


def test_owner_alias_resolves_to_gabriel_profile(tmp_path):
    out = tmp_path / "n.wav"
    with patch("requests.post", return_value=_response(content=b"RIFF....WAVE")) as post:
        result = VoiceStudioTTS().execute(
            {"text": "Hola", "voice_id": "mi voz", "output_path": str(out)}
        )
    assert result.success is True
    assert post.call_args.kwargs["json"]["voice"] == VoiceStudioTTS.OWNER_VOICE
    assert post.call_args.args[0].endswith("/v1/audio/speech")
    assert out.read_bytes() == b"RIFF....WAVE"
    assert result.cost_usd == 0.0


def test_json_error_body_is_not_written_as_audio(tmp_path):
    out = tmp_path / "n.wav"
    err = _response(json_data={"detail": "model busy"}, status_code=503, ctype="application/json")
    with patch("requests.post", return_value=err):
        result = VoiceStudioTTS().execute({"text": "Hola", "output_path": str(out)})
    assert result.success is False
    assert "503" in result.error
    assert not out.exists()


def test_empty_text_rejected():
    assert VoiceStudioTTS().execute({"text": "  "}).success is False


def test_list_voices_returns_profiles_only():
    voices = {
        "voices": [
            {"voice_id": "alloy", "type": "openai_alias"},
            {"voice_id": "a60a560e", "name": "Gabriel", "type": "profile"},
        ]
    }
    with patch("requests.get", return_value=_response(json_data=voices, ctype="application/json")):
        result = VoiceStudioTTS().execute({"operation": "list_voices"})
    assert result.success is True
    assert [v["voice_id"] for v in result.data["voices"]] == ["a60a560e"]
