def test_health_reports_ai_state(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert "aiConfigured" in response.json()
    assert "anthropic" in response.json()["aiProviders"]


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
        "platform": "instagram",
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
    assert saved.json()["profile"]["platform"] == "instagram"
    assert saved.json()["profile"]["nicheTopic"] == "coaching TikTok local"

    loaded = client.get("/api/v1/creator/profile", headers=auth_headers)
    assert loaded.status_code == 200
    assert loaded.json()["profile"]["platform"] == "instagram"
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


def test_single_idea_generation_is_complete_and_saved(client, auth_headers):
    response = client.post(
        "/api/v1/ideas/generate-one",
        headers=auth_headers,
        json={
            "profile": {
                "goal": "traffic",
                "niche": "clear",
                "nicheTopic": "recettes antillaises rapides",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "carousel",
                "time": "3-5h",
                "monetization": "affiliate",
            },
            "account_context": None,
            "count": 1,
        },
    )

    assert response.status_code == 200
    report = response.json()
    assert report["analysisId"].startswith("ana_")
    assert len(report["scriptSteps"]) >= 5
    assert "colombo" in " ".join(report["scriptSteps"]).lower()
    history = client.get("/api/v1/analyses?kind=idea&limit=20", headers=auth_headers)
    assert history.status_code == 200
    assert report["analysisId"] in {item["id"] for item in history.json()["analyses"]}


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


def test_anthropic_vision_provider_returns_validated_json():
    from app.ai import AIEngine
    from app.config import Settings

    class TextBlock:
        type = "text"
        text = '{"score":82,"summary":"Lecture réelle"}'

    class FakeMessages:
        async def create(self, **kwargs):
            assert kwargs["model"] == "claude-sonnet-4-5-20250929"
            assert kwargs["messages"][0]["content"][0]["type"] == "image"
            return type("Response", (), {"content": [TextBlock()]})()

    engine = AIEngine(Settings(openai_api_key="", anthropic_api_key="test-anthropic"))
    engine.anthropic_client = type("Client", (), {"messages": FakeMessages()})()
    schema = {
        "type": "object",
        "additionalProperties": False,
        "required": ["score", "summary"],
        "properties": {
            "score": {"type": "integer"},
            "summary": {"type": "string"},
        },
    }

    import asyncio

    result = asyncio.run(
        engine.generate_json(
            model="gpt-test",
            feature="vision_test",
            prompt="Analyse",
            schema=schema,
            media=[
                {
                    "type": "input_image",
                    "image_url": "data:image/jpeg;base64,aW1hZ2U=",
                    "detail": "high",
                }
            ],
        )
    )
    assert result["score"] == 82
    assert result["_model"].startswith("claude-sonnet")


def test_ai_provider_follows_the_model_that_answered():
    from app.main import ai_provider_for_model

    assert ai_provider_for_model("claude-sonnet-4-5-20250929") == "anthropic"
    assert ai_provider_for_model("gpt-5-mini") == "openai"


def test_anthropic_is_the_primary_provider_for_every_ai_feature():
    from app.ai import AIEngine
    from app.config import Settings

    engine = AIEngine(Settings(openai_api_key="openai-test", anthropic_api_key="anthropic-test"))
    calls = []

    async def fake_anthropic(**kwargs):
        calls.append(("anthropic", kwargs["feature"]))
        return {"ok": True, "_model": "claude-test"}

    async def fake_openai(**kwargs):
        calls.append(("openai", kwargs["feature"]))
        return {"ok": True, "_model": "gpt-test"}

    engine._generate_anthropic = fake_anthropic
    engine._generate_openai = fake_openai

    import asyncio

    result = asyncio.run(
        engine.generate_json(
            model="gpt-test",
            feature="all_features",
            prompt="Analyse",
            schema={"type": "object", "properties": {}},
        )
    )
    assert result["_model"] == "claude-test"
    assert calls == [("anthropic", "all_features")]


def test_analysis_history_can_be_reopened_and_deleted(client, auth_headers):
    analysis_id = client.app.state.db.save_analysis(
        "usr_tests", "content", {"score": 73, "summary": "Test sauvegardé"}
    )

    history = client.get("/api/v1/analyses?kind=content", headers=auth_headers)
    assert history.status_code == 200
    assert history.json()["analyses"][0]["id"] == analysis_id
    assert history.json()["analyses"][0]["report"]["score"] == 73

    deleted = client.delete(f"/api/v1/analyses/{analysis_id}", headers=auth_headers)
    assert deleted.status_code == 204
    assert client.get("/api/v1/analyses?kind=content", headers=auth_headers).json()["analyses"] == []


def test_next_actions_are_personalized_and_saved(client, auth_headers):
    class FakeAI:
        configured = True

        async def generate_json(self, **kwargs):
            assert kwargs["feature"] == "next_growth_actions"
            assert "Cycles précédents" in kwargs["prompt"]
            return {
                "summary": "Trois actions ciblées sur le prochain signal utile.",
                "actions": [
                    {
                        "title": "Clarifier la bio",
                        "instruction": "Écris une promesse mesurable pour les indépendants.",
                        "deadlineDays": 2,
                        "successMetric": "La promesse est comprise en moins de 5 secondes.",
                    },
                    {
                        "title": "Publier une preuve",
                        "instruction": "Montre un avant et un après sur un cas réel.",
                        "deadlineDays": 4,
                        "successMetric": "Le contenu reçoit un enregistrement ou une demande.",
                    },
                    {
                        "title": "Mesurer le test",
                        "instruction": "Relève les sauvegardes et les commentaires après 24 heures.",
                        "deadlineDays": 7,
                        "successMetric": "Une décision de répétition est prise avec les données.",
                    },
                ],
                "_model": "claude-test",
            }

    from app.main import app

    original = app.state.ai
    app.state.ai = FakeAI()
    try:
        response = client.post(
            "/api/v1/profile/actions/next",
            headers=auth_headers,
            json={
                "profile": {
                    "platform": "tiktok",
                    "goal": "revenue",
                    "niche": "broad",
                    "nicheTopic": "marketing pour indépendants",
                    "followers": "100-1000",
                    "cadence": "3-4",
                    "format": "mixed",
                    "time": "3-5h",
                    "monetization": "service",
                },
                "account_context": {"score": 64, "nextAction": "Clarifier la promesse."},
            },
        )
    finally:
        app.state.ai = original

    assert response.status_code == 200
    assert response.json()["analysisId"].startswith("ana_")
    assert response.json()["actions"][0]["deadlineDays"] == 2
    history = client.get("/api/v1/analyses?kind=actions", headers=auth_headers)
    assert history.status_code == 200
    assert history.json()["analyses"][0]["id"] == response.json()["analysisId"]


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
                "strengths": ["Format clair", "Cadence réaliste", "Piste de revenu choisie"],
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
    assert len(response.json()["strengths"]) == 3
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
    assert len(response.json()["strengths"]) == 3
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
    response = client.post(
        "/api/v1/auth/preview",
        headers={"X-Viraly-Installation": "iphone-test-installation"},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["token"].startswith("preview_")
    assert payload["expiresAt"] > "2026-08-25"
    authorized = client.get(
        "/api/v1/calendar/events",
        headers={"Authorization": f"Bearer {payload['token']}"},
    )
    assert authorized.status_code == 200

    same_installation = client.post(
        "/api/v1/auth/preview",
        headers={"X-Viraly-Installation": "iphone-test-installation"},
    )
    other_installation = client.post(
        "/api/v1/auth/preview",
        headers={"X-Viraly-Installation": "second-test-installation"},
    )
    assert same_installation.json()["token"] == payload["token"]
    assert other_installation.json()["token"] != payload["token"]


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


def test_profile_analysis_reports_when_ai_is_unavailable(client, auth_headers):
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

    assert response.status_code == 503
    payload = response.json()
    assert payload["code"] == "not_configured"


def test_carousel_analysis_reports_when_ai_is_unavailable(client, auth_headers):
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

    assert response.status_code == 503
    payload = response.json()
    assert payload["code"] == "not_configured"


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


def test_weekly_plan_has_exact_personalized_mix_and_seven_days(client, auth_headers):
    response = client.post(
        "/api/v1/plans/generate",
        headers=auth_headers,
        json={
            "profile": {
                "goal": "traffic",
                "niche": "clear",
                "nicheTopic": "recettes antillaises rapides",
                "followers": "100-1000",
                "cadence": "3-4",
                "format": "carousel",
                "time": "3-5h",
                "monetization": "affiliate",
            },
            "starting_date": "2026-08-25",
            "timezone": "Europe/Paris",
        },
    )

    assert response.status_code == 200
    plan = response.json()
    assert plan["contentMix"] == {"videos": 1, "carousels": 4, "stories": 1}
    assert len([event for event in plan["events"] if event["type"] == "video"]) == 1
    assert len([event for event in plan["events"] if event["type"] == "carousel"]) == 4
    assert len([event for event in plan["events"] if event["type"] == "story"]) == 1
    assert plan["durationDays"] == 7
    assert plan["startDate"] == "2026-08-25"
    assert plan["endDate"] == "2026-08-31"
    assert "recettes antillaises rapides" in plan["strategyDecision"]
    assert plan["revenuePotentialAfter"].endswith("€/mois")
    feed_events = [event for event in plan["events"] if event["type"] in {"video", "carousel"}]
    assert all("\n" in event["hook"] for event in feed_events)
    assert all(event["cta"] == "" for event in plan["events"])
    assert any("colombo" in event["hook"].lower() for event in feed_events)
    assert all("Vérification" not in event["hook"] for event in feed_events)


def test_old_plans_are_kept_while_active_ai_calendar_is_replaced(client, auth_headers):
    initial_history = client.get("/api/v1/plans?limit=8", headers=auth_headers).json()["plans"]
    payload = {
        "profile": {
            "goal": "reach",
            "niche": "tech",
            "followers": "0-100",
            "cadence": "1-2",
            "format": "mixed",
            "time": "1-2h",
            "monetization": "affiliate",
        },
        "starting_date": "2026-08-25",
        "timezone": "Europe/Paris",
    }
    first = client.post("/api/v1/plans/generate", headers=auth_headers, json=payload)
    payload["starting_date"] = "2026-09-01"
    second = client.post("/api/v1/plans/generate", headers=auth_headers, json=payload)

    assert first.status_code == 200
    assert second.status_code == 200
    history = client.get("/api/v1/plans?limit=8", headers=auth_headers).json()["plans"]
    calendar = client.get("/api/v1/calendar/events", headers=auth_headers).json()["events"]
    assert len(history) == len(initial_history) + 2
    assert history[0]["id"] == second.json()["id"]
    assert len(calendar) == len(second.json()["events"])
    assert {event["date"] for event in calendar} == {
        event["date"] for event in second.json()["events"]
    }

    deleted = client.delete(
        f"/api/v1/plans/{first.json()['id']}", headers=auth_headers
    )
    assert deleted.status_code == 204
    remaining_ids = {
        plan["id"]
        for plan in client.get("/api/v1/plans?limit=30", headers=auth_headers).json()["plans"]
    }
    assert first.json()["id"] not in remaining_ids
    assert second.json()["id"] in remaining_ids


def test_plan_and_coach_reuse_latest_saved_profile_analysis(client, auth_headers):
    client.app.state.db.save_analysis(
        "usr_tests",
        "profile",
        {
            "score": 89,
            "metrics": {"followers": "2.4K"},
            "summary": "Le profil montre une promesse déjà claire.",
        },
    )
    profile = {
        "goal": "revenue",
        "niche": "clear",
        "nicheTopic": "coaching TikTok local",
        "followers": "0-100",
        "cadence": "3-4",
        "format": "camera",
        "time": "3-5h",
        "monetization": "service",
    }
    plan_response = client.post(
        "/api/v1/plans/generate",
        headers=auth_headers,
        json={
            "profile": profile,
            "account_context": None,
            "starting_date": "2026-08-25",
            "timezone": "Europe/Paris",
        },
    )
    coach_response = client.post(
        "/api/v1/coach",
        headers=auth_headers,
        json={
            "question": "Combien dois-je publier cette semaine ?",
            "profile": profile,
            "account_context": None,
            "strategy_context": None,
        },
    )

    assert plan_response.status_code == 200
    assert plan_response.json()["accountScore"] == 89
    assert coach_response.status_code == 200
    assert "3 vidéos, 2 carrousels et 1 story sur 7 jours" in coach_response.json()["answer"]
    assert "score observé 89/100" in coach_response.json()["why"]
    assert coach_response.json()["question"] == "Combien dois-je publier cette semaine ?"
    assert coach_response.json()["analysisId"].startswith("ana_")

    coach_history = client.get(
        "/api/v1/analyses?kind=coach&limit=20", headers=auth_headers
    ).json()["analyses"]
    assert coach_history[0]["report"]["question"] == coach_response.json()["question"]
    assert coach_history[0]["report"]["answer"] == coach_response.json()["answer"]

    deleted_coach = client.delete(
        f"/api/v1/analyses/{coach_response.json()['analysisId']}",
        headers=auth_headers,
    )
    assert deleted_coach.status_code == 204
    remaining_coach_ids = {
        item["id"]
        for item in client.get(
        "/api/v1/analyses?kind=coach&limit=20", headers=auth_headers
        ).json()["analyses"]
    }
    assert coach_response.json()["analysisId"] not in remaining_coach_ids


def test_plan_supports_14_and_30_days_with_one_story_max_per_week(client, auth_headers):
    profile = {
        "goal": "community",
        "niche": "fitness",
        "followers": "100-1000",
        "cadence": "3-4",
        "format": "mixed",
        "time": "3-5h",
        "monetization": "product",
    }
    expected = {
        14: {"videos": 5, "carousels": 5, "stories": 2},
        30: {"videos": 11, "carousels": 11, "stories": 4},
    }

    for days, mix in expected.items():
        response = client.post(
            "/api/v1/plans/generate",
            headers=auth_headers,
            json={
                "profile": profile,
                "starting_date": "2026-09-01",
                "days": days,
                "timezone": "Europe/Paris",
            },
        )
        assert response.status_code == 200
        plan = response.json()
        assert plan["durationDays"] == days
        assert plan["contentMix"] == mix
        story_dates = [event["date"] for event in plan["events"] if event["type"] == "story"]
        assert len(story_dates) == mix["stories"]
        assert len(story_dates) <= days // 7


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
