def test_health_reports_ai_state(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "aiConfigured" in response.json()


def test_calendar_crud_is_persistent(client, auth_headers):
    created = client.post(
        "/api/v1/calendar/events",
        headers=auth_headers,
        json={
            "date": "2026-08-24",
            "time": "19:20",
            "type": "video",
            "title": "Audit de niche",
            "hook": "Ta niche attire-t-elle des acheteurs ?",
            "cta": "Enregistre la grille",
        },
    )
    assert created.status_code == 200
    event_id = created.json()["id"]

    listed = client.get("/api/v1/calendar/events", headers=auth_headers)
    assert listed.status_code == 200
    assert listed.json()["events"][0]["title"] == "Audit de niche"

    updated = client.patch(
        f"/api/v1/calendar/events/{event_id}",
        headers=auth_headers,
        json={"status": "published"},
    )
    assert updated.status_code == 200
    assert updated.json()["status"] == "published"

    deleted = client.delete(
        f"/api/v1/calendar/events/{event_id}", headers=auth_headers
    )
    assert deleted.status_code == 204
    assert (
        client.get("/api/v1/calendar/events", headers=auth_headers).json()[
            "events"
        ]
        == []
    )


def test_creator_profile_is_persistent(client, auth_headers):
    profile = {
        "goal": "revenue",
        "niche": "clear",
        "nicheTopic": "coaching TikTok local",
        "followers": "100-1000",
        "cadence": "3-4",
        "format": "carousel",
        "time": "3-5h",
        "monetization": "service",
    }

    saved = client.put(
        "/api/v1/creator/profile", headers=auth_headers, json=profile
    )
    assert saved.status_code == 200
    assert saved.json()["profile"]["nicheTopic"] == "coaching TikTok local"

    loaded = client.get("/api/v1/creator/profile", headers=auth_headers)
    assert loaded.status_code == 200
    assert loaded.json()["profile"]["format"] == "carousel"

    deleted = client.delete("/api/v1/creator/profile", headers=auth_headers)
    assert deleted.status_code == 204

    empty = client.get("/api/v1/creator/profile", headers=auth_headers)
    assert empty.status_code == 200
    assert empty.json()["profile"] is None


def test_idea_analysis_falls_back_without_key(client, auth_headers):
    response = client.post(
        "/api/v1/ideas/analyze",
        headers=auth_headers,
        json={
            "idea": "Trois erreurs qui bloquent les vues TikTok",
            "profile": {
                "goal": "reach",
                "niche": "clear",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "camera",
                "time": "3-5h",
                "monetization": "affiliate",
            },
        },
    )
    assert response.status_code == 200
    assert response.json()["source"] == "fallback_rules"
    assert response.json()["analysisId"].startswith("ana_")


def test_ai_authentication_error_is_sanitized(client):
    from openai import AuthenticationError
    from app.ai import AIEngine, AIUnavailableError
    from app.config import Settings

    class FailingResponses:
        async def create(self, **_):
            raise AuthenticationError(
                "invalid key",
                response=type("Response", (), {"request": None, "status_code": 401, "headers": {}})(),
                body={"error": {"message": "secret details"}},
            )

    engine = AIEngine(Settings())
    engine.client = type("Client", (), {"responses": FailingResponses()})()

    import asyncio

    try:
        asyncio.run(
            engine.generate_json(
                model="test-model",
                feature="test",
                prompt="test",
                schema={"type": "object", "properties": {}},
            )
        )
    except AIUnavailableError as error:
        assert "renouvelée" in str(error)
        assert "secret details" not in str(error)
    else:
        raise AssertionError("AIUnavailableError attendue")


def test_onboarding_uses_structured_ai_and_persists_result(client, auth_headers):
    class FakeAI:
        configured = True

        async def generate_json(self, **kwargs):
            assert kwargs["feature"] == "onboarding_report"
            assert kwargs["model"]
            return {
                "score": 61,
                "summary": "Une base réaliste à structurer.",
                "priorities": ["Préciser la promesse", "Tester deux hooks", "Mesurer les sauvegardes"],
                "cycle": "3 contenus par semaine",
                "firstWeek": ["Recherche", "Tutoriel", "Retour d'expérience"],
                "revenueDirection": "Valider d'abord une demande d'audit.",
            }

    from app.main import app

    original = app.state.ai
    app.state.ai = FakeAI()
    try:
        response = client.post(
            "/api/v1/onboarding/analyze",
            headers=auth_headers,
            json={
                "goal": "revenue",
                "niche": "broad",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "camera",
                "time": "3-5h",
                "monetization": "service",
            },
        )
    finally:
        app.state.ai = original

    assert response.status_code == 200
    assert response.json()["score"] == 61
    assert response.json()["analysisId"].startswith("ana_")


def test_onboarding_falls_back_to_profile_rules_when_ai_is_unavailable(client, auth_headers):
    from app.ai import AIEngine
    from app.config import Settings
    from app.main import app

    original = app.state.ai
    app.state.ai = AIEngine(Settings(openai_api_key=""))
    try:
        response = client.post(
            "/api/v1/onboarding/analyze",
            headers=auth_headers,
            json={
                "goal": "revenue",
                "niche": "broad",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "camera",
                "time": "3-5h",
                "monetization": "service",
            },
        )
    finally:
        app.state.ai = original

    assert response.status_code == 200
    assert response.json()["source"] == "profile_rules"
    assert len(response.json()["priorities"]) == 3
    assert response.json()["analysisId"].startswith("ana_")


def test_calendar_requires_a_session(client):
    response = client.get("/api/v1/calendar/events")
    assert response.status_code == 401


def test_preview_session_is_disabled_by_default(client, monkeypatch):
    from dataclasses import replace
    from app import main

    monkeypatch.setattr(main, "settings", replace(main.settings, preview_access_enabled=False))
    response = client.post("/api/v1/auth/preview")
    assert response.status_code == 503


def test_preview_session_issues_reusable_token(client, monkeypatch):
    from dataclasses import replace
    from app import main

    monkeypatch.setattr(
        main,
        "settings",
        replace(
            main.settings,
            preview_access_enabled=True,
            preview_secret="test-preview-secret",
        ),
    )
    response = client.post("/api/v1/auth/preview")

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"].startswith("preview_")
    assert payload["expiresAt"] > "2026-08-25"
    authorized = client.get(
        "/api/v1/calendar/events",
        headers={"Authorization": f"Bearer {payload['token']}"},
    )
    assert authorized.status_code == 200


def test_google_auth_reports_missing_configuration(client, monkeypatch):
    from dataclasses import replace
    from app import main

    monkeypatch.setattr(main, "settings", replace(main.settings, google_client_id=""))
    status = client.get("/api/v1/auth/google/status")
    assert status.status_code == 200
    assert status.json()["configured"] is False
    assert "GOOGLE_CLIENT_ID" in status.json()["missing"]

    response = client.get(
        "/api/v1/auth/google/start",
        params={"return_to": "viralyai://auth/google"},
        follow_redirects=False,
    )
    assert response.status_code == 302
    assert "Google+n%27est+pas+encore+activ%C3%A9" in response.headers["location"]


def test_profile_analysis_falls_back_when_ai_is_unavailable(client, auth_headers):
    from app.ai import AIEngine
    from app.config import Settings
    from app.main import app

    original = app.state.ai
    app.state.ai = AIEngine(Settings(openai_api_key=""))
    try:
        response = client.post(
            "/api/v1/profile/analyze",
            headers=auth_headers,
            data={"source": "tiktok_profile_screenshot"},
            files={"screenshot": ("profile.jpg", b"fake-image", "image/jpeg")},
        )
    finally:
        app.state.ai = original

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "fallback_rules"
    assert payload["analysisId"].startswith("ana_")
    assert payload["authenticatedTikTokData"] is False


def test_carousel_analysis_falls_back_when_ai_is_unavailable(client, auth_headers):
    from app.ai import AIEngine
    from app.config import Settings
    from app.main import app

    original = app.state.ai
    app.state.ai = AIEngine(Settings(openai_api_key=""))
    try:
        response = client.post(
            "/api/v1/content/analyze",
            headers=auth_headers,
            data={"type": "carousel", "goal": "revenue"},
            files=[
                ("assets[]", ("slide-1.jpg", b"fake-image-1", "image/jpeg")),
                ("assets[]", ("slide-2.jpg", b"fake-image-2", "image/jpeg")),
            ],
        )
    finally:
        app.state.ai = original

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "fallback_rules"
    assert len(payload["dimensions"]) >= 4
    assert payload["analysisId"].startswith("ana_")


def test_video_analysis_is_temporarily_disabled(client, auth_headers):
    response = client.post(
        "/api/v1/content/analyze",
        headers=auth_headers,
        data={"type": "video", "goal": "revenue"},
        files={"assets[]": ("clip.mp4", b"fake-video", "video/mp4")},
    )

    assert response.status_code == 422
    assert "désactivée" in response.json()["detail"]


def test_coach_falls_back_when_ai_is_unavailable(client, auth_headers):
    response = client.post(
        "/api/v1/coach",
        headers=auth_headers,
        json={
            "question": "Quelle heure pour poster ?",
            "profile": {
                "goal": "revenue",
                "niche": "clear",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "camera",
                "time": "3-5h",
                "monetization": "service",
            },
            "account_context": None,
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "fallback_rules"
    assert payload["actions"]
    assert payload["calendarSuggestion"]


def test_strategy_falls_back_when_ai_is_unavailable(client, auth_headers):
    response = client.post(
        "/api/v1/strategy/generate",
        headers=auth_headers,
        json={
            "profile": {
                "goal": "revenue",
                "niche": "clear",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "camera",
                "time": "3-5h",
                "monetization": "service",
            },
            "account_context": None,
            "timezone": "Europe/Paris",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["source"] == "fallback_rules"
    assert len(payload["niches"]) >= 2
    assert "eligibility" not in payload
    assert "livePlan" not in payload


def test_custom_niche_personalizes_strategy_fallback(client, auth_headers):
    response = client.post(
        "/api/v1/strategy/generate",
        headers=auth_headers,
        json={
            "profile": {
                "goal": "traffic",
                "niche": "clear",
                "nicheTopic": "recettes antillaises rapides",
                "followers": "0-100",
                "cadence": "1-2",
                "format": "carousel",
                "time": "1-2h",
                "monetization": "affiliate",
            },
            "account_context": None,
            "timezone": "Europe/Paris",
        },
    )

    assert response.status_code == 200
    assert "recettes antillaises rapides" in response.json()["niches"][0]["name"]


def test_google_state_and_one_time_session_exchange(client, monkeypatch):
    from dataclasses import replace
    from urllib.parse import parse_qs, urlparse
    from app import main

    monkeypatch.setattr(
        main,
        "settings",
        replace(
            main.settings,
            google_client_id="client-id",
            google_client_secret="client-secret",
            google_state_secret="state-secret",
        ),
    )
    started = client.get(
        "/api/v1/auth/google/start",
        params={"return_to": "viralyai://auth/google"},
        follow_redirects=False,
    )
    assert started.status_code == 302
    query = parse_qs(urlparse(started.headers["location"]).query)
    assert query["client_id"] == ["client-id"]
    assert main.decode_google_state(query["state"][0]) == "viralyai://auth/google"

    code = main.app.state.db.create_google_login(
        "google-subject", "creator@example.com", "Creator"
    )
    exchanged = client.post("/api/v1/auth/google/session", json={"code": code})
    assert exchanged.status_code == 200
    assert exchanged.json()["token"]
    assert client.post("/api/v1/auth/google/session", json={"code": code}).status_code == 401


def test_managed_google_session_exchange_creates_app_session(client, monkeypatch):
    from app import main

    class FakeResponse:
        status_code = 200

        def json(self):
            return {
                "email": "creator@example.com",
                "name": "Creator",
                "picture": "https://example.com/p.png",
                "session_token": "managed_session_token_123",
            }

    class FakeClient:
        def __init__(self, *_, **__):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return False

        async def get(self, url, headers):
            assert "session-data" in url
            assert headers["X-Session-ID"] == "managed-session-id"
            return FakeResponse()

    monkeypatch.setattr(main.httpx, "AsyncClient", FakeClient)
    response = client.post(
        "/api/v1/auth/session",
        json={"session_id": "managed-session-id"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"] == "managed_session_token_123"
    assert payload["email"] == "creator@example.com"
    authorized = client.get(
        "/api/v1/calendar/events",
        headers={"Authorization": "Bearer managed_session_token_123"},
    )
    assert authorized.status_code == 200
