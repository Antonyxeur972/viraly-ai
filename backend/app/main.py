from __future__ import annotations

import base64
import hmac
import json
import secrets
import time as unix_time
from datetime import date, datetime, time, timedelta, timezone
from hashlib import sha256
from pathlib import Path
from typing import Annotated, Any
from urllib.parse import urlencode

import httpx
from fastapi import Depends, FastAPI, File, Form, Header, HTTPException, Query, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from starlette.concurrency import run_in_threadpool

from .ai import AIEngine, AIUnavailableError
from .config import settings
from .database import Database
from .media import extract_video_assets, image_item, read_upload
from .schemas import (
    CALENDAR_SCHEMA,
    COACH_SCHEMA,
    CONTENT_SCHEMA,
    IDEA_SCHEMA,
    IDEAS_SCHEMA,
    ONBOARDING_SCHEMA,
    PROFILE_SCHEMA,
    STRATEGY_SCHEMA,
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarGenerationRequest,
    CoachRequest,
    IdeaAnalysisRequest,
    IdeaGenerationRequest,
    StrategyRequest,
    CreatorProfile,
    GoogleCodeExchange,
)


app = FastAPI(title="VIRALY AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.state.db = Database(settings.database_path)
app.state.ai = AIEngine(settings)


@app.middleware("http")
async def security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "no-referrer"
    if request.url.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    return response


@app.exception_handler(AIUnavailableError)
async def ai_unavailable_handler(_, error: AIUnavailableError):
    return JSONResponse(
        status_code=503,
        content={"detail": str(error), "code": "ai_not_configured"},
    )


def database() -> Database:
    return app.state.db


def ai_engine() -> AIEngine:
    return app.state.ai


def require_user(
    authorization: Annotated[str | None, Header()] = None,
    db: Database = Depends(database),
) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(401, "Session VIRALY AI manquante.")
    token = authorization.split(" ", 1)[1].strip()
    user_id = db.user_for_session(token)
    if user_id:
        return user_id
    if settings.dev_token and hmac.compare_digest(token, settings.dev_token):
        return db.ensure_dev_session(token)
    raise HTTPException(401, "Session VIRALY AI invalide ou expirée.")


def ensure_ai_budget(db: Database, user_id: str) -> None:
    limit = (
        settings.preview_ai_daily_limit
        if user_id.startswith("usr_preview_")
        else settings.ai_daily_limit
    )
    if db.daily_ai_usage(user_id) >= limit:
        raise HTTPException(429, "Limite IA quotidienne atteinte.")


def compact_context(value: Any) -> str:
    return json.dumps(value or {}, ensure_ascii=False, separators=(",", ":"))[:12000]


def onboarding_fallback(profile: CreatorProfile) -> dict[str, Any]:
    cadence = {
        "1-2": "2 contenus par semaine",
        "3-4": "3 contenus par semaine",
        "5-7": "5 contenus par semaine",
        "multiple": "1 contenu par jour avec un jour de récupération",
    }.get(profile.cadence, "3 contenus par semaine")
    score = 48
    score += 12 if profile.niche == "clear" else 5 if profile.niche == "broad" else 0
    score += 10 if profile.cadence in {"3-4", "5-7"} else 4
    score += 8 if profile.time in {"6-10h", "10h+"} else 4
    score += 7 if profile.format != "mixed" else 4
    score = min(score, 86)

    niche_priority = {
        "clear": "Formule une promesse unique et répète-la sur trois contenus.",
        "broad": "Réduis ta niche à une audience, un problème et un résultat précis.",
        "hesitating": "Teste deux angles de niche pendant sept jours avec le même format.",
        "none": "Choisis une niche à l'intersection de ton expérience, d'une demande et d'une offre.",
    }.get(profile.niche, "Précise ton audience et le résultat promis.")
    goal_priority = {
        "reach": "Teste deux hooks par sujet et mesure les vues après 24 heures.",
        "community": "Termine chaque contenu par une question qui appelle une réponse précise.",
        "traffic": "Relie chaque publication à une ressource ou une prochaine étape mesurable.",
        "revenue": "Valide une offre simple avant d'augmenter le volume de publication.",
    }.get(profile.goal, "Définis un indicateur principal à suivre chaque semaine.")
    format_priority = {
        "camera": "Prépare des scripts courts : tension, preuve, action.",
        "voice": "Construis une bibliothèque de plans et de voix off réutilisables.",
        "carousel": "Fais de la première slide une promesse et de la dernière un appel à l'action.",
        "mixed": "Garde un format principal et un seul format secondaire pendant deux semaines.",
    }.get(profile.format, "Stabilise un format reconnaissable pendant deux semaines.")
    revenue_direction = {
        "affiliate": "Commence par une ressource affiliée directement liée au problème traité.",
        "service": "Propose un diagnostic court pour valider la demande avant une offre complète.",
        "product": "Transforme la question la plus fréquente en ressource numérique minimale.",
        "shop": "Teste des démonstrations produit centrées sur l'usage, la preuve et l'objection.",
    }.get(profile.monetization, "Valide une première piste de revenu avec une action mesurable.")

    return {
        "score": score,
        "summary": (
            "Ce premier bilan est calculé à partir de tes réponses. "
            "Ta priorité est de stabiliser un positionnement, un format et un rythme mesurable."
        ),
        "priorities": [niche_priority, goal_priority, format_priority],
        "cycle": cadence,
        "firstWeek": [
            "Jour 1 : préciser la promesse et préparer trois hooks",
            "Jour 3 : publier un contenu de preuve ou de démonstration",
            "Jour 6 : analyser les signaux et réécrire le meilleur angle",
        ],
        "revenueDirection": revenue_direction,
        "source": "profile_rules",
    }


def google_configured() -> bool:
    return bool(
        settings.google_client_id
        and settings.google_client_secret
        and settings.google_state_secret
        and settings.google_callback_url
    )


def allowed_google_return_url(url: str) -> bool:
    normalized = url.rstrip("/")
    return any(
        normalized == prefix or normalized.startswith(f"{prefix}/")
        for prefix in settings.google_return_prefixes
    )


def encode_google_state(return_to: str) -> str:
    payload = json.dumps(
        {
            "return_to": return_to,
            "nonce": secrets.token_urlsafe(16),
            "exp": int(unix_time.time()) + 600,
        },
        separators=(",", ":"),
    ).encode()
    encoded = base64.urlsafe_b64encode(payload).rstrip(b"=").decode()
    signature = hmac.new(
        settings.google_state_secret.encode(), encoded.encode(), sha256
    ).hexdigest()
    return f"{encoded}.{signature}"


def decode_google_state(state: str) -> str:
    try:
        encoded, signature = state.split(".", 1)
        expected = hmac.new(
            settings.google_state_secret.encode(), encoded.encode(), sha256
        ).hexdigest()
        if not hmac.compare_digest(signature, expected):
            raise ValueError
        padding = "=" * (-len(encoded) % 4)
        payload = json.loads(base64.urlsafe_b64decode(encoded + padding))
        return_to = str(payload["return_to"])
        if int(payload["exp"]) < int(unix_time.time()):
            raise ValueError
        if not allowed_google_return_url(return_to):
            raise ValueError
        return return_to
    except (KeyError, TypeError, ValueError, json.JSONDecodeError) as error:
        raise HTTPException(400, "État OAuth Google invalide ou expiré.") from error


def app_redirect(return_to: str, **params: str) -> RedirectResponse:
    separator = "&" if "?" in return_to else "?"
    return RedirectResponse(f"{return_to}{separator}{urlencode(params)}", status_code=302)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "aiConfigured": ai_engine().configured,
        "googleConfigured": google_configured(),
        "models": {
            "visual": settings.visual_model,
            "strategy": settings.strategy_model,
            "fast": settings.fast_model,
        },
    }


@app.get("/api/v1/auth/google/start")
def start_google_auth(return_to: str = Query(...)):
    if not google_configured():
        raise HTTPException(503, "La connexion Google n'est pas activée.")
    if not allowed_google_return_url(return_to):
        raise HTTPException(400, "Adresse de retour Google non autorisée.")
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": settings.google_callback_url,
        "response_type": "code",
        "scope": "openid email profile",
        "state": encode_google_state(return_to),
        "prompt": "select_account",
    }
    return RedirectResponse(
        f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}",
        status_code=302,
    )


@app.get("/api/v1/auth/google/callback")
async def google_auth_callback(
    state: str = Query(...),
    code: str | None = Query(default=None),
    error: str | None = Query(default=None),
    db: Database = Depends(database),
):
    return_to = decode_google_state(state)
    if error:
        return app_redirect(return_to, error="Connexion Google annulée.")
    if not code:
        return app_redirect(return_to, error="Code Google manquant.")

    async with httpx.AsyncClient(timeout=20) as client:
        response = await client.post(
            "https://oauth2.googleapis.com/token",
            data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": settings.google_callback_url,
                "grant_type": "authorization_code",
            },
        )
    if response.status_code != 200:
        return app_redirect(return_to, error="Google n'a pas validé la connexion.")

    token_payload = response.json()
    raw_id_token = token_payload.get("id_token")
    if not raw_id_token:
        return app_redirect(return_to, error="Identité Google manquante.")
    try:
        identity = await run_in_threadpool(
            google_id_token.verify_oauth2_token,
            raw_id_token,
            google_requests.Request(),
            settings.google_client_id,
        )
    except ValueError:
        return app_redirect(return_to, error="Identité Google invalide.")

    subject = str(identity.get("sub") or "")
    email = str(identity.get("email") or "")
    name = str(identity.get("name") or email.split("@", 1)[0] or "Créateur")
    if not subject or not email:
        return app_redirect(return_to, error="Profil Google incomplet.")
    exchange_code = db.create_google_login(subject, email, name)
    return app_redirect(return_to, code=exchange_code)


@app.post("/api/v1/auth/google/session")
def exchange_google_session(
    payload: GoogleCodeExchange, db: Database = Depends(database)
):
    session = db.consume_oauth_code(payload.code)
    if not session:
        raise HTTPException(401, "Code Google invalide ou expiré.")
    return session


@app.post("/api/v1/auth/preview")
def create_preview_session(request: Request, db: Database = Depends(database)):
    if not settings.preview_access_enabled or not settings.preview_secret:
        raise HTTPException(503, "La version de test n'est pas activée.")

    day = date.today().isoformat()
    client_ip = request.client.host if request.client else "unknown"
    identity = hmac.new(
        settings.preview_secret.encode(), f"{day}:{client_ip}".encode(), sha256
    ).hexdigest()
    token = f"preview_{hmac.new(settings.preview_secret.encode(), identity.encode(), sha256).hexdigest()}"
    user_id = f"usr_preview_{identity[:32]}"
    tomorrow = datetime.combine(
        date.today() + timedelta(days=1), time.min, tzinfo=timezone.utc
    ).isoformat()
    db.ensure_preview_session(token, user_id, tomorrow)
    return {"token": token, "name": "Créateur test", "expiresAt": tomorrow}


@app.post("/api/v1/profile/analyze")
async def analyze_profile(
    screenshot: Annotated[UploadFile, File()],
    source: Annotated[str, Form()] = "tiktok_profile_screenshot",
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    if not (screenshot.content_type or "").startswith("image/"):
        raise HTTPException(415, "La capture doit être une image.")
    data = await read_upload(
        screenshot, min(settings.max_upload_bytes, 15 * 1024 * 1024)
    )
    ensure_ai_budget(db, user_id)
    report = await ai.generate_json(
        model=settings.visual_model,
        feature="profile_analysis",
        effort="low",
        schema=PROFILE_SCHEMA,
        prompt=(
            "Analyse cette capture de profil TikTok. Extrais uniquement ce qui est réellement visible. "
            "Évalue le positionnement, la cohérence des couvertures, la promesse de bio, le chemin de "
            "conversion et la préparation à la monétisation. Les compteurs illisibles doivent être null. "
            f"Source déclarée: {source}."
        ),
        media=[
            image_item(
                data,
                screenshot.content_type or "image/jpeg",
                detail="original",
            )
        ],
    )
    db.record_ai_usage(user_id, "profile-analysis", settings.visual_model)
    report["analysisId"] = db.save_analysis(user_id, "profile", report)
    report["authenticatedTikTokData"] = False
    return report


@app.post("/api/v1/content/analyze")
async def analyze_content(
    type: Annotated[str, Form()],
    goal: Annotated[str, Form()] = "revenue",
    assets: Annotated[list[UploadFile], File(alias="assets[]")] = [],
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    if type not in {"video", "carousel"}:
        raise HTTPException(422, "Type de contenu invalide.")
    if not assets or len(assets) > 10:
        raise HTTPException(422, "Sélectionne entre 1 et 10 médias.")

    media: list[dict[str, Any]] = []
    transcript: str | None = None
    if type == "video":
        upload = assets[0]
        if not (upload.content_type or "").startswith("video/"):
            raise HTTPException(415, "Le média sélectionné doit être une vidéo.")
        data = await read_upload(upload, settings.max_upload_bytes)
        frames, audio_path = extract_video_assets(
            data, Path(upload.filename or "video.mp4").suffix
        )
        media = [image_item(frame, "image/jpeg", detail="high") for frame in frames]
        if audio_path:
            try:
                transcript = await ai.transcribe(audio_path)
            finally:
                Path(audio_path).unlink(missing_ok=True)
    else:
        for upload in assets:
            if not (upload.content_type or "").startswith("image/"):
                raise HTTPException(
                    415, "Un carrousel doit contenir uniquement des images."
                )
            data = await read_upload(
                upload, min(settings.max_upload_bytes, 15 * 1024 * 1024)
            )
            media.append(
                image_item(data, upload.content_type or "image/jpeg", detail="high")
            )

    ensure_ai_budget(db, user_id)
    prompt = (
        f"Analyse ce {type} TikTok pour l'objectif {goal}. Les images sont ordonnées. "
        "Évalue hook/couverture, clarté, progression, rétention probable, preuve, partage, sauvegarde "
        "et conversion. Un score doit être justifié par des éléments visibles; ne prétends pas connaître "
        "la rétention réelle avant publication. Propose une version révisée et un CTA lié au revenu."
    )
    if transcript:
        prompt += f" Transcription audio automatique: {transcript[:10000]}"
    report = await ai.generate_json(
        model=settings.visual_model,
        feature="content_analysis",
        effort="medium",
        schema=CONTENT_SCHEMA,
        prompt=prompt,
        media=media,
    )
    db.record_ai_usage(user_id, "content-analysis", settings.visual_model)
    report["analysisId"] = db.save_analysis(user_id, "content", report)
    report["transcriptAvailable"] = bool(transcript)
    return report


@app.post("/api/v1/ideas/analyze")
async def analyze_idea(
    request: IdeaAnalysisRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    ensure_ai_budget(db, user_id)
    report = await ai.generate_json(
        model=settings.strategy_model,
        feature="idea_analysis",
        effort="low",
        schema=IDEA_SCHEMA,
        prompt=(
            f"Analyse cette idée avant tournage: {request.idea}\n"
            f"Profil créateur: {compact_context(request.profile.model_dump())}\n"
            f"Contexte compte: {compact_context(request.account_context)}\n"
            "Le score mesure précision de promesse, tension, valeur partageable, adéquation audience, "
            "faisabilité et lien revenu. Donne un hook et un script directement filmables."
        ),
    )
    db.record_ai_usage(user_id, "idea-analysis", settings.strategy_model)
    report["analysisId"] = db.save_analysis(user_id, "idea", report)
    return report


@app.post("/api/v1/onboarding/analyze")
async def analyze_onboarding(
    profile: CreatorProfile,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    ensure_ai_budget(db, user_id)
    try:
        report = await ai.generate_json(
            model=settings.strategy_model,
            feature="onboarding_report",
            effort="low",
            schema=ONBOARDING_SCHEMA,
            prompt=(
                f"Établis le premier bilan de ce créateur: {compact_context(profile.model_dump())}. "
                "Le score mesure uniquement la préparation opérationnelle déclarée, pas le potentiel viral garanti. "
                "Respecte exactement sa cadence et son temps disponible. Donne trois priorités, un cycle réaliste, "
                "une première semaine et une direction de revenu cohérente."
            ),
        )
    except AIUnavailableError:
        report = onboarding_fallback(profile)
    else:
        report["source"] = "openai"
        db.record_ai_usage(user_id, "onboarding", settings.strategy_model)
    report["analysisId"] = db.save_analysis(user_id, "onboarding", report)
    return report


@app.post("/api/v1/ideas/generate")
async def generate_ideas(
    request: IdeaGenerationRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    ensure_ai_budget(db, user_id)
    report = await ai.generate_json(
        model=settings.strategy_model,
        feature="idea_generation",
        effort="low",
        schema=IDEAS_SCHEMA,
        prompt=(
            f"Génère exactement {request.count} idées distinctes et réalisables. "
            f"Profil: {compact_context(request.profile.model_dump())}. "
            f"Contexte compte: {compact_context(request.account_context)}. "
            "Aucune tendance temps réel ne doit être inventée. Chaque idée doit avoir une promesse, "
            "un format, un effort réaliste et un chemin de monétisation cohérent."
        ),
    )
    db.record_ai_usage(user_id, "idea-generation", settings.strategy_model)
    db.save_analysis(user_id, "ideas", report)
    return report


@app.post("/api/v1/coach")
async def coach(
    request: CoachRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    ensure_ai_budget(db, user_id)
    report = await ai.generate_json(
        model=settings.fast_model,
        feature="coach_answer",
        effort="low",
        schema=COACH_SCHEMA,
        prompt=(
            f"Question: {request.question}\n"
            f"Profil: {compact_context(request.profile.model_dump())}\n"
            f"Compte: {compact_context(request.account_context)}\n"
            f"Stratégie: {compact_context(request.strategy_context)}\n"
            "Réponds sans présenter les conseils génériques comme des vérités algorithmiques. "
            "Quand les données manquent, propose un protocole de test mesurable."
        ),
    )
    db.record_ai_usage(user_id, "coach", settings.fast_model)
    db.save_analysis(user_id, "coach", report)
    return report


@app.get("/api/v1/strategy")
def get_strategy(
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    strategy = db.get_strategy(user_id)
    if not strategy:
        raise HTTPException(404, "Aucune stratégie générée.")
    return strategy


@app.post("/api/v1/strategy/generate")
async def generate_strategy(
    request: StrategyRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    ensure_ai_budget(db, user_id)
    strategy = await ai.generate_json(
        model=settings.strategy_model,
        feature="creator_strategy",
        effort="medium",
        schema=STRATEGY_SCHEMA,
        prompt=(
            f"Crée une stratégie TikTok personnalisée. Profil: {compact_context(request.profile.model_dump())}. "
            f"Analyse de compte disponible: {compact_context(request.account_context)}. "
            f"Fuseau: {request.timezone}. Les créneaux sont des hypothèses à tester 14 jours, pas des vérités. "
            "Pour lien bio, LIVE et Shop, indique que les critères varient selon pays, âge, état et type de compte. "
            "Les fourchettes de revenu doivent être indicatives, modestes et accompagnées de leur base de calcul."
        ),
    )
    db.record_ai_usage(user_id, "strategy", settings.strategy_model)
    db.save_strategy(user_id, strategy)
    return strategy


@app.get("/api/v1/calendar/events")
def list_calendar_events(
    start: str | None = Query(default=None),
    end: str | None = Query(default=None),
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    return {"events": db.list_events(user_id, start, end)}


@app.post("/api/v1/calendar/events")
def create_calendar_event(
    request: CalendarEventCreate,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    return db.create_event(user_id, request.model_dump())


@app.patch("/api/v1/calendar/events/{event_id}")
def update_calendar_event(
    event_id: str,
    request: CalendarEventUpdate,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    event = db.update_event(
        user_id, event_id, request.model_dump(exclude_unset=True)
    )
    if not event:
        raise HTTPException(404, "Événement introuvable.")
    return event


@app.delete("/api/v1/calendar/events/{event_id}", status_code=204)
def delete_calendar_event(
    event_id: str,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    if not db.delete_event(user_id, event_id):
        raise HTTPException(404, "Événement introuvable.")


@app.post("/api/v1/calendar/generate")
async def generate_calendar(
    request: CalendarGenerationRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    try:
        start = date.fromisoformat(request.starting_date)
    except ValueError as error:
        raise HTTPException(422, "Date de départ invalide.") from error
    end = start + timedelta(days=request.days - 1)
    ensure_ai_budget(db, user_id)
    result = await ai.generate_json(
        model=settings.fast_model,
        feature="content_calendar",
        effort="low",
        schema=CALENDAR_SCHEMA,
        prompt=(
            f"Génère un calendrier du {start.isoformat()} au {end.isoformat()} inclus. "
            f"Profil: {compact_context(request.profile.model_dump())}. "
            f"Stratégie validée: {compact_context(request.strategy)}. "
            "Respecte strictement la cadence et le temps disponible. Répartis recherche, vidéos, carrousels, "
            "stories et LIVE seulement quand cohérent. Chaque événement doit avoir un hook et un CTA concret."
        ),
    )
    db.record_ai_usage(user_id, "calendar", settings.fast_model)
    events = [
        db.create_event(
            user_id, {**event, "status": "planned", "source": "ai"}
        )
        for event in result["events"]
        if start.isoformat() <= event["date"] <= end.isoformat()
    ]
    return {"events": events}
