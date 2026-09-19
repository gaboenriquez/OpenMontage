from __future__ import annotations

from unittest.mock import MagicMock, patch

from tools.audio.ai33_tts import Ai33TTS
from tools.base_tool import ToolStatus


def _response(*, json_data=None, status_code=200):
    response = MagicMock()
    response.status_code = status_code
    response.json.return_value = json_data
    response.raise_for_status.return_value = None
    return response


def test_get_status_requires_api_key(monkeypatch):
    monkeypatch.delenv("AI33_API_KEY", raising=False)
    monkeypatch.delenv("AI33_PRO_API_KEY", raising=False)
    monkeypatch.delenv("OPENSPEAKER_API_KEY", raising=False)
    assert Ai33TTS().get_status() == ToolStatus.UNAVAILABLE

    monkeypatch.setenv("AI33_API_KEY", "test-key")
    assert Ai33TTS().get_status() == ToolStatus.AVAILABLE


def test_list_voices_with_explicit_provider_passes_query_param(monkeypatch):
    monkeypatch.setenv("AI33_API_KEY", "test-key")
    tool = Ai33TTS()

    with patch(
        "requests.get",
        return_value=_response(json_data=[{"id": "elevenlabs_x"}]),
    ) as mock_get:
        result = tool.execute({"operation": "list_voices", "provider": "elevenlabs"})

    assert result.success is True
    assert result.data["voices"] == [{"id": "elevenlabs_x"}]
    mock_get.assert_called_once()
    assert mock_get.call_args.kwargs["params"] == {"provider": "elevenlabs"}
    assert mock_get.call_args.args[0].endswith("/voices")


def test_list_voices_without_provider_queries_all_known_providers(monkeypatch):
    monkeypatch.setenv("AI33_API_KEY", "test-key")
    tool = Ai33TTS()

    with patch(
        "requests.get",
        side_effect=lambda url, headers, params, timeout: _response(
            json_data=[{"provider": params["provider"]}]
        ),
    ) as mock_get:
        result = tool.execute({"operation": "list_voices"})

    assert result.success is True
    assert mock_get.call_count == len(Ai33TTS.KNOWN_PROVIDERS)
    for provider in Ai33TTS.KNOWN_PROVIDERS:
        assert provider in result.data["voices"]
        assert result.data["voices"][provider] == [{"provider": provider}]


def test_list_voices_reports_partial_failures(monkeypatch):
    monkeypatch.setenv("AI33_API_KEY", "test-key")
    tool = Ai33TTS()

    def fake_get(url, headers, params, timeout):
        if params["provider"] == "edge":
            raise RuntimeError("boom")
        return _response(json_data=[{"provider": params["provider"]}])

    with patch("requests.get", side_effect=fake_get):
        result = tool.execute({"operation": "list_voices"})

    assert result.success is True
    assert "edge" not in result.data["voices"]
    assert "edge" in result.data["errors"]


def test_list_voices_400_without_provider_param_is_fixed(monkeypatch):
    # Regression test: the old code called GET /voices with no query params,
    # which the live API 400s on. Confirm every call now includes `provider`.
    monkeypatch.setenv("AI33_API_KEY", "test-key")
    tool = Ai33TTS()

    with patch(
        "requests.get", return_value=_response(json_data=[])
    ) as mock_get:
        tool.execute({"operation": "list_voices", "provider": "minimax"})

    _, kwargs = mock_get.call_args
    assert "params" in kwargs and kwargs["params"].get("provider") == "minimax"
