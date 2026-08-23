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


def test_ai_endpoint_never_returns_fake_data_without_key(client, auth_headers):
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
    assert response.status_code == 503
    assert response.json()["code"] == "ai_not_configured"


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


def test_calendar_requires_a_session(client):
    response = client.get("/api/v1/calendar/events")
    assert response.status_code == 401
