from __future__ import annotations

import base64
import hmac
import json
import secrets
import time as unix_time
from datetime import date, datetime, time, timedelta, timezone
from hashlib import sha256
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
from .media import image_item, read_upload
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
    ManagedSessionExchange,
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


def has_ai_budget(db: Database, user_id: str) -> bool:
    limit = (
        settings.preview_ai_daily_limit
        if user_id.startswith("usr_preview_")
        else settings.ai_daily_limit
    )
    return db.daily_ai_usage(user_id) < limit


def compact_context(value: Any) -> str:
    return json.dumps(value or {}, ensure_ascii=False, separators=(",", ":"))[:12000]


def preferred_format(profile: CreatorProfile) -> str:
    return {
        "camera": "vidéo face caméra",
        "voice": "vidéo voix off",
        "carousel": "carrousel",
        "mixed": "format mixte",
    }.get(profile.format, "format mixte")


def niche_label(profile: CreatorProfile) -> str:
    custom = (profile.nicheTopic or "").strip()
    if custom:
        return custom[:120]
    return {
        "education": "éducation / pédagogie",
        "business": "business / argent",
        "fitness": "fitness / bien-être",
        "beauty": "beauté / skincare",
        "food": "food / recettes",
        "travel": "voyage / lifestyle",
        "tech": "IA / tech / outils",
        "personal": "développement personnel",
        "clear": "ta niche actuelle",
        "broad": "ton thème large",
        "hesitating": "tes niches en test",
        "none": "une niche à valider",
    }.get(profile.niche, "ta niche")


def monetization_label(profile: CreatorProfile) -> str:
    return {
        "affiliate": "affiliation",
        "service": "service ou diagnostic",
        "product": "produit digital",
        "partnerships": "partenariats de marque",
    }.get(profile.monetization, "première offre simple")


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
        "partnerships": "Crée trois contenus de preuve qui montrent aux marques ton angle et la réaction recherchée.",
    }.get(profile.monetization, "Valide une première piste de revenu avec une action mesurable.")

    return {
        "score": score,
        "summary": (
            "Ce premier bilan est calculé à partir de tes réponses. "
            f"Ta priorité est de stabiliser un positionnement en {niche_label(profile)}, "
            "un format et un rythme mesurable."
        ),
        "priorities": [niche_priority, goal_priority, format_priority],
        "cycle": cadence,
        "firstWeek": [
            f"Jour 1 : préciser la promesse pour {niche_label(profile)} et préparer trois hooks",
            "Jour 3 : publier un contenu de preuve ou de démonstration",
            "Jour 6 : analyser les signaux et réécrire le meilleur angle",
        ],
        "revenueDirection": revenue_direction,
        "source": "profile_rules",
    }


def profile_fallback(source: str) -> dict[str, Any]:
    return {
        "score": 54,
        "confidence": "faible",
        "summary": (
            "Lecture visuelle limitée pour cette session. Ce bilan prudent se concentre sur les fondations "
            "qui peuvent être corrigées sans inventer de métriques."
        ),
        "visibleSignals": [
            "Capture importée depuis la galerie",
            "Données TikTok non authentifiées",
            f"Source déclarée: {source}",
        ],
        "priorities": [
            "Rendre la bio lisible en une promesse claire: audience, problème, résultat.",
            "Uniformiser les trois dernières couvertures pour qu'elles vendent la même transformation.",
            "Ajouter une action mesurable: commentaire, sauvegarde, ressource ou message privé.",
        ],
        "metrics": {
            "followers": None,
            "likes": None,
            "videos": None,
            "bio": None,
            "handle": None,
        },
        "accountPositioning": (
            "Positionnement à valider: choisis une seule audience prioritaire et répète la promesse "
            "sur 5 publications avant de changer d'angle."
        ),
        "revenueReadiness": (
            "Préparation revenu moyenne: commence par une offre légère ou une ressource gratuite "
            "liée au problème principal pour mesurer l'intention."
        ),
        "nextAction": (
            "Publie une série de 3 contenus: problème fréquent, preuve courte, solution actionnable."
        ),
        "source": "fallback_rules",
    }


def content_fallback(content_type: str, asset_count: int, transcript: str | None) -> dict[str, Any]:
    is_carousel = content_type == "carousel"
    format_label = "carrousel" if is_carousel else "vidéo"
    score = 58 + min(asset_count, 5) * 3
    if transcript:
        score += 5
    score = min(score, 76)
    return {
        "score": score,
        "summary": (
            f"Audit structurel du {format_label}: la lecture visuelle détaillée n'est pas disponible pour cette session. "
            "Le verdict se concentre donc sur la séquence, la clarté et le chemin de conversion."
        ),
        "revenueCta": (
            "Commente 'PLAN' si tu veux la checklist, puis enregistre ce contenu pour l'appliquer."
        ),
        "improvements": [
            "Renforcer la première seconde ou la première slide avec une promesse mesurable.",
            "Montrer plus tôt la preuve: résultat, exemple, avant/après ou erreur concrète.",
            "Terminer par une action liée au revenu: ressource, diagnostic, produit ou message privé.",
        ],
        "dimensions": [
            {
                "name": "Hook",
                "score": max(score - 8, 0),
                "evidence": "Le fichier est prêt pour analyse, mais les détails visuels fins ne sont pas disponibles.",
                "action": "Ouvre avec une tension claire: erreur, gain, coût caché ou résultat attendu.",
            },
            {
                "name": "Clarté",
                "score": score,
                "evidence": f"{asset_count} média(s) fourni(s), ce qui permet de structurer une séquence.",
                "action": "Garde une idée par scène ou slide, avec un texte court et lisible.",
            },
            {
                "name": "Rétention",
                "score": max(score - 4, 0),
                "evidence": "La rétention réelle devra être validée après publication.",
                "action": "Ajoute une micro-promesse au milieu: 'le point 3 change tout'.",
            },
            {
                "name": "Revenu",
                "score": max(score - 10, 0),
                "evidence": "Le lien entre contenu et conversion doit être explicite.",
                "action": "Relie le sujet à une offre simple: checklist, audit, affiliation ou produit utile.",
            },
        ],
        "revisedHook": (
            "Tu fais probablement cette erreur sans le voir: voici comment la corriger en moins de 30 secondes."
        ),
        "storyboard": [
            "0-2s: nommer le problème ou l'erreur avec un résultat concret.",
            "2-8s: montrer l'exemple ou la situation avant correction.",
            "8-18s: donner les étapes dans l'ordre, sans détour.",
            "18-25s: montrer le bénéfice attendu et inviter à sauvegarder.",
        ],
        "revenuePotential": {
            "level": "moyen",
            "path": "Transformer le contenu en entrée vers une ressource, un diagnostic ou une offre affiliée.",
            "basis": "Estimation prudente basée sur la structure fournie, pas sur des métriques TikTok réelles.",
        },
        "source": "fallback_rules",
    }


def idea_fallback(idea: str, profile: CreatorProfile) -> dict[str, Any]:
    clean_idea = idea.strip()
    niche = niche_label(profile)
    return {
        "score": 68 if profile.niche in {"clear", "broad"} else 58,
        "summary": (
            f"Premier filtre stratégique pour {niche}: l'idée est exploitable si elle promet un résultat précis "
            "et prouve vite pourquoi le spectateur doit rester."
        ),
        "optimizedHook": f"Tu veux vraiment réussir ça ? Voici l'erreur cachée derrière: {clean_idea[:90]}",
        "scriptSteps": [
            "Nommer le problème en une phrase très directe.",
            "Montrer un exemple concret ou une preuve visible.",
            "Donner trois étapes applicables sans jargon.",
            f"Finir par une action liée à {monetization_label(profile)}.",
        ],
        "audiencePromise": f"L'audience {niche} repart avec une décision ou une correction immédiate.",
        "revenuePath": (
            f"Relier l'idée à {monetization_label(profile)} via une ressource, un diagnostic ou un produit utile."
        ),
        "risks": [
            "Promesse trop large si l'audience n'est pas nommée.",
            "CTA faible si aucune prochaine étape n'est proposée.",
        ],
        "source": "fallback_rules",
    }


def ideas_fallback(profile: CreatorProfile, count: int) -> dict[str, Any]:
    format_name = preferred_format(profile)
    niche = niche_label(profile)
    revenue = monetization_label(profile)
    base = [
        ("3 erreurs qui bloquent tes résultats", "Corriger les erreurs invisibles que ton audience répète."),
        ("Avant/après d'une décision simple", "Montrer le gain concret d'une meilleure méthode."),
        ("La checklist à appliquer aujourd'hui", "Transformer un sujet flou en étapes sauvegardables."),
        ("Ce que personne ne te dit avant de commencer", "Créer de la tension avec une vérité utile."),
        ("J'analyse un cas réel en 60 secondes", "Prouver ton expertise sur un exemple compréhensible."),
        ("Le plan 7 jours pour progresser", "Créer une série facile à suivre et à convertir."),
        ("Stoppe cette habitude si tu veux avancer", "Utiliser une objection forte pour déclencher l'attention."),
        ("La méthode courte pour obtenir un premier signal", "Réduire la friction et inviter à tester."),
    ]
    return {
        "ideas": [
            {
                "title": title,
                "format": format_name,
                "promise": f"{promise} Angle: {niche}.",
                "score": min(86, 64 + index * 3),
                "revenuePath": f"CTA vers {revenue}: commentaire mot-clé, lien bio ou message privé.",
                "effort": "faible" if index < 2 else "moyen",
            }
            for index, (title, promise) in enumerate(base[:count])
        ],
        "source": "fallback_rules",
    }


def coach_fallback(request: CoachRequest) -> dict[str, Any]:
    question = request.question.lower()
    profile = request.profile
    niche = niche_label(profile)
    if "heure" in question or "poster" in question:
        answer = "Teste 2 créneaux fixes pendant 14 jours: 12h15 et 19h30, puis garde celui qui gagne en sauvegardes et commentaires."
        calendar = "Ajoute deux publications cette semaine: mardi 19h30 et jeudi 12h15."
    elif "live" in question:
        answer = "Prépare les LIVE comme un rendez-vous de conversion: un sujet précis, 3 preuves, 1 offre ou ressource en fin de session."
        calendar = "Place un LIVE court de 25 minutes après une publication forte."
    elif "story" in question:
        answer = "Utilise les stories pour chauffer l'audience: coulisses, sondage, preuve, puis rappel vers le contenu principal."
        calendar = "Ajoute 3 stories les jours sans publication."
    else:
        answer = (
            "Priorité: clarifie la promesse, publie avec un rythme stable, puis relie chaque contenu à une action mesurable."
        )
        calendar = "Planifie une publication de preuve et une publication tutoriel cette semaine."
    return {
        "answer": answer,
        "why": (
            f"Décision construite à partir de ta niche ({niche}), de ton objectif {profile.goal}, "
            f"format {preferred_format(profile)}, monétisation {monetization_label(profile)}."
        ),
        "actions": [
            "Choisir un seul indicateur principal pour 7 jours.",
            "Publier une série de 3 contenus sur le même problème.",
            "Changer seulement le hook entre deux tests.",
            "Relier le CTA à une action mesurable: sauvegarde, commentaire, clic ou message.",
        ],
        "calendarSuggestion": calendar,
        "confidence": "moyenne",
        "source": "fallback_rules",
    }


def strategy_fallback(profile: CreatorProfile, account_context: dict[str, Any] | None) -> dict[str, Any]:
    revenue = monetization_label(profile)
    format_name = preferred_format(profile)
    niche = niche_label(profile)
    has_context = bool(account_context)
    return {
        "summary": (
            f"Direction retenue: devenir le compte qui simplifie {niche} avec des preuves courtes, "
            "des checklists sauvegardables et une ressource claire à demander en commentaire."
        ),
        "niches": [
            {
                "name": f"Stratégie principale: {niche} en 30 secondes",
                "audience": f"Audience intéressée par {niche} et qui veut un résultat mesurable rapidement.",
                "edge": f"Prendre parti: arrêter les conseils vagues et montrer une correction {niche} immédiatement visible.",
                "revenueAngle": f"Chaque post finit vers {revenue} avec un mot-clé à commenter.",
                "score": 78 if has_context else 70,
            },
            {
                "name": "Pilier 1: erreurs fréquentes",
                "audience": f"Débutants ou curieux qui consomment déjà du contenu {niche}.",
                "edge": "Tu nommes une erreur précise, puis tu montres le bon geste.",
                "revenueAngle": "Le CTA propose la checklist complète.",
                "score": 74,
            },
            {
                "name": "Pilier 2: analyses de cas",
                "audience": "Personnes qui veulent se reconnaître dans un exemple concret.",
                "edge": "Tu montres un cas avant/après ou une comparaison simple.",
                "revenueAngle": "Convertir vers diagnostic, ressource ou recommandation utile.",
                "score": 72,
            },
        ],
        "postingSlots": [
            {
                "day": "Mardi",
                "time": "19:30",
                "reason": "Créneau de test après journée, souvent plus propice aux commentaires.",
                "testProtocol": "Comparer commentaires/sauvegardes à 24h avec le jeudi midi.",
            },
            {
                "day": "Jeudi",
                "time": "12:15",
                "reason": "Créneau court pour tester un contenu utile et sauvegardable.",
                "testProtocol": "Garder le même sujet, changer seulement le hook.",
            },
            {
                "day": "Dimanche",
                "time": "18:00",
                "reason": "Bon moment pour contenu bilan, plan ou préparation de semaine.",
                "testProtocol": "Mesurer partages et clics vers l'action proposée.",
            },
        ],
        "weeklyCycle": [
            "Jour 1: rechercher 5 questions récurrentes et choisir une promesse.",
            "Jour 2: publier un contenu problème + correction.",
            "Jour 3: poster 2 stories pour sonder l'objection principale.",
            "Jour 4: publier une preuve ou analyse de cas.",
            "Jour 6: publier un carrousel checklist ou une vidéo plan d'action.",
            "Jour 7: lire les métriques et recycler le meilleur angle.",
        ],
        "storyPlan": [
            "Sondage simple avant publication.",
            "Coulisse ou preuve après publication.",
            "Question-réponse sur l'objection qui revient.",
            "Rappel vers la ressource ou l'action principale.",
        ],
        "revenuePaths": [
            {
                "name": revenue.title(),
                "nextAction": "Créer une action simple: commentaire mot-clé, message privé ou ressource.",
                "contentDirection": f"Publier des contenus {niche} qui exposent le problème puis montrent la correction.",
                "range": "0-300 €/mois au départ",
                "basis": "Fourchette prudente pour un compte en validation, sans métriques TikTok authentifiées.",
            },
            {
                "name": "Trafic qualifié",
                "nextAction": "Préparer une page ou ressource liée à la bio dès que l'option est disponible.",
                "contentDirection": "Utiliser tutoriels, preuves et comparatifs pour filtrer les bons prospects.",
                "range": "Variable selon clics et offre",
                "basis": "Le trafic dépendra du taux de clic, de la confiance et de la clarté du CTA.",
            },
        ],
        "source": "fallback_rules",
    }


def calendar_fallback(
    profile: CreatorProfile, strategy: dict[str, Any], start: date, days: int
) -> dict[str, Any]:
    slots = strategy.get("postingSlots") or []
    slot_times = [slot.get("time", "19:00") for slot in slots if isinstance(slot, dict)]
    default_times = slot_times or ["19:30", "12:15", "18:00"]
    cadence_count = {
        "1-2": 3,
        "3-4": 5,
        "5-7": 7,
        "multiple": 7,
    }.get(profile.cadence, 5)
    total = min(days, cadence_count)
    types = ["video", "story", "carousel", "research", "video", "carousel", "story"]
    niche = niche_label(profile)
    events = []
    for index in range(total):
        event_date = start + timedelta(days=index)
        event_type = types[index % len(types)]
        events.append(
            {
                "date": event_date.isoformat(),
                "time": default_times[index % len(default_times)],
                "type": event_type,
                "title": [
                    f"Erreur {niche} que tout le monde répète",
                    f"Sondage: le blocage numéro 1 en {niche}",
                    f"Checklist {niche} à sauvegarder",
                    f"Recherche: 5 questions clients en {niche}",
                    f"Avant/après concret en {niche}",
                    f"Carrousel: méthode simple {niche}",
                    f"Story rappel: ressource {niche}",
                ][index % 7],
                "hook": f"En {niche}, tu peux corriger ça aujourd'hui avec une seule décision.",
                "cta": f"Commente PLAN ou passe à l'étape liée à {monetization_label(profile)}.",
            }
        )
    return {"events": events, "source": "fallback_rules"}


def google_configured() -> bool:
    return bool(
        settings.google_client_id
        and settings.google_client_secret
        and settings.google_state_secret
        and settings.google_callback_url
    )


def google_missing_configuration() -> list[str]:
    missing = []
    if not settings.google_client_id:
        missing.append("GOOGLE_CLIENT_ID")
    if not settings.google_client_secret:
        missing.append("GOOGLE_CLIENT_SECRET")
    if not settings.google_state_secret:
        missing.append("VIRALY_GOOGLE_STATE_SECRET")
    if not settings.google_callback_url:
        missing.append("VIRALY_GOOGLE_CALLBACK_URL")
    return missing


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


@app.get("/api/v1/auth/google/status")
def google_auth_status():
    return {
        "configured": google_configured(),
        "missing": google_missing_configuration(),
        "callbackUrl": settings.google_callback_url,
        "allowedReturnPrefixes": list(settings.google_return_prefixes),
    }


@app.get("/api/v1/auth/google/start")
def start_google_auth(return_to: str = Query(...)):
    if not allowed_google_return_url(return_to):
        raise HTTPException(400, "Adresse de retour Google non autorisée.")
    if not google_configured():
        return app_redirect(
            return_to,
            error="Google n'est pas encore activé. Accès test disponible.",
        )
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


@app.post("/api/v1/auth/session")
async def exchange_managed_auth_session(
    payload: ManagedSessionExchange, db: Database = Depends(database)
):
    async with httpx.AsyncClient(timeout=15.0) as client:
        try:
            response = await client.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": payload.session_id},
            )
        except httpx.HTTPError as error:
            raise HTTPException(
                502, "Connexion Google temporairement indisponible."
            ) from error

    if response.status_code != 200:
        raise HTTPException(401, "Session Google invalide ou expirée.")

    data = response.json()
    email = str(data.get("email") or "").strip().lower()
    if not email:
        raise HTTPException(401, "Profil Google incomplet.")
    name = str(data.get("name") or email.split("@", 1)[0] or "Créateur")
    session_token = str(data.get("session_token") or "").strip()
    if not session_token:
        raise HTTPException(401, "Session Google incomplète.")
    return db.create_managed_login(
        email=email,
        name=name,
        session_token=session_token,
        picture=str(data.get("picture") or ""),
    )


@app.post("/api/v1/auth/preview")
def create_preview_session(request: Request, db: Database = Depends(database)):
    if not settings.preview_access_enabled or not settings.preview_secret:
        raise HTTPException(503, "La version de test n'est pas activée.")

    client_ip = request.client.host if request.client else "unknown"
    identity = hmac.new(
        settings.preview_secret.encode(), client_ip.encode(), sha256
    ).hexdigest()
    token = f"preview_{hmac.new(settings.preview_secret.encode(), identity.encode(), sha256).hexdigest()}"
    user_id = f"usr_preview_{identity[:32]}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    db.ensure_preview_session(token, user_id, expires_at)
    return {"token": token, "name": "Créateur test", "expiresAt": expires_at}


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
    report = None
    if has_ai_budget(db, user_id):
        try:
            report = await ai.generate_json(
                model=settings.visual_model,
                feature="profile_analysis",
                effort="medium",
                verbosity="medium",
                schema=PROFILE_SCHEMA,
                prompt=(
                    "Analyse cette capture de profil TikTok comme un audit de conversion. Extrais uniquement ce qui est lisible. "
                    "Identifie les preuves visibles dans la bio, les compteurs et les couvertures. Formule la promesse comprise "
                    "par un nouveau visiteur en cinq secondes, puis repère la rupture principale entre découverte, confiance et action. "
                    "Classe les corrections par impact et effort, et propose une action exécutable aujourd'hui avec un résultat observable. "
                    "Les compteurs illisibles doivent être null. Ne déduis aucune performance vidéo depuis les miniatures. "
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
            report["source"] = "openai"
            db.record_ai_usage(user_id, "profile-analysis", settings.visual_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = profile_fallback(source)
    report["analysisId"] = db.save_analysis(user_id, "profile", report)
    report["authenticatedTikTokData"] = False
    return report


@app.get("/api/v1/creator/profile")
def get_creator_profile(
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    return {"profile": db.get_creator_profile(user_id)}


@app.put("/api/v1/creator/profile")
def save_creator_profile(
    profile: CreatorProfile,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    payload = profile.model_dump()
    db.save_creator_profile(user_id, payload)
    return {"profile": payload}


@app.delete("/api/v1/creator/profile", status_code=204)
def delete_creator_profile(
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    db.delete_creator_profile(user_id)
    return None


@app.post("/api/v1/content/analyze")
async def analyze_content(
    type: Annotated[str, Form()],
    goal: Annotated[str, Form()] = "revenue",
    assets: Annotated[list[UploadFile], File(alias="assets[]")] = [],
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    if type == "video":
        raise HTTPException(
            422,
            "Analyse vidéo désactivée temporairement pour garder VIRALY AI rapide. Utilise l'analyse photo ou carrousel.",
        )
    if type != "carousel":
        raise HTTPException(422, "Type de contenu invalide.")
    if not assets or len(assets) > 10:
        raise HTTPException(422, "Sélectionne entre 1 et 10 médias.")

    media: list[dict[str, Any]] = []
    transcript: str | None = None
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

    prompt = (
        f"Audite ce {type} TikTok pour l'objectif {goal}. Les images sont ordonnées comme elles seront publiées. "
        "Pour chaque dimension, cite un élément visible précis puis donne une seule correction prioritaire. "
        "Vérifie la couverture, la compréhension sans contexte, la progression slide par slide, la preuve, "
        "la valeur de sauvegarde ou partage et la continuité vers le CTA. Le score mesure la qualité observable, "
        "jamais la rétention réelle avant publication. Réécris la couverture, ordonne un storyboard publiable "
        "et termine par un CTA cohérent avec l'objectif sans promesse de revenu."
    )
    if transcript:
        prompt += f" Transcription audio automatique: {transcript[:10000]}"
    report = None
    if has_ai_budget(db, user_id):
        try:
            report = await ai.generate_json(
                model=settings.visual_model,
                feature="content_analysis",
                effort="medium",
                verbosity="medium",
                schema=CONTENT_SCHEMA,
                prompt=prompt,
                media=media,
            )
            report["source"] = "openai"
            db.record_ai_usage(user_id, "content-analysis", settings.visual_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = content_fallback(type, len(assets), transcript)
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
    report = None
    if has_ai_budget(db, user_id):
        try:
            report = await ai.generate_json(
                model=settings.strategy_model,
                feature="idea_analysis",
                effort="low",
                verbosity="medium",
                schema=IDEA_SCHEMA,
                prompt=(
                    f"Analyse cette idée avant tournage: {request.idea}\n"
                    f"Profil créateur: {compact_context(request.profile.model_dump())}\n"
                    f"Contexte compte: {compact_context(request.account_context)}\n"
                    "Évalue la précision de la promesse, la tension, l'utilité partageable, l'adéquation audience, "
                    "la faisabilité et le lien revenu. Identifie le principal risque d'indifférence. "
                    "Donne un hook de douze mots maximum et un script directement filmable, avec une fonction claire pour chaque étape."
                ),
            )
            report["source"] = "openai"
            db.record_ai_usage(user_id, "idea-analysis", settings.strategy_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = idea_fallback(request.idea, request.profile)
    report["analysisId"] = db.save_analysis(user_id, "idea", report)
    return report


@app.post("/api/v1/onboarding/analyze")
async def analyze_onboarding(
    profile: CreatorProfile,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    report = None
    if has_ai_budget(db, user_id):
        try:
            report = await ai.generate_json(
                model=settings.strategy_model,
                feature="onboarding_report",
                effort="medium",
                verbosity="medium",
                schema=ONBOARDING_SCHEMA,
                prompt=(
                    f"Établis le premier bilan de ce créateur: {compact_context(profile.model_dump())}. "
                    "Le score mesure uniquement la préparation opérationnelle déclarée, pas le potentiel viral garanti. "
                    "Respecte exactement sa cadence, son format naturel et son temps disponible. Prends parti pour un système simple. "
                    "Donne trois priorités ordonnées, un cycle réaliste, une première semaine concrète et une direction de revenu "
                    "qui correspond au niveau actuel du compte."
                ),
            )
            report["source"] = "openai"
            db.record_ai_usage(user_id, "onboarding", settings.strategy_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = onboarding_fallback(profile)
    report["analysisId"] = db.save_analysis(user_id, "onboarding", report)
    return report


@app.post("/api/v1/ideas/generate")
async def generate_ideas(
    request: IdeaGenerationRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    report = None
    if has_ai_budget(db, user_id):
        try:
            report = await ai.generate_json(
                model=settings.strategy_model,
                feature="idea_generation",
                effort="low",
                verbosity="low",
                schema=IDEAS_SCHEMA,
                prompt=(
                    f"Génère exactement {request.count} idées distinctes et réalisables. "
                    f"Profil: {compact_context(request.profile.model_dump())}. "
                    f"Contexte compte: {compact_context(request.account_context)}. "
                    "Aucune tendance temps réel ne doit être inventée. Répartis les idées entre preuve, erreur, méthode et objection; "
                    "aucune ne doit reformuler la précédente. Le titre doit pouvoir servir de texte d'ouverture à l'écran. "
                    "Chaque idée doit avoir une promesse spécifique, un format, un effort réaliste et un chemin de monétisation cohérent."
                ),
            )
            report["source"] = "openai"
            db.record_ai_usage(user_id, "idea-generation", settings.strategy_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = ideas_fallback(request.profile, request.count)
    db.save_analysis(user_id, "ideas", report)
    return report


@app.post("/api/v1/coach")
async def coach(
    request: CoachRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    report = None
    if has_ai_budget(db, user_id):
        try:
            coach_model = (
                settings.strategy_model
                if request.account_context and len(request.question.strip()) >= 80
                else settings.fast_model
            )
            report = await ai.generate_json(
                model=coach_model,
                feature="coach_answer",
                effort="medium" if coach_model == settings.strategy_model else "low",
                verbosity="medium",
                schema=COACH_SCHEMA,
                prompt=(
                    f"Question: {request.question}\n"
                    f"Profil: {compact_context(request.profile.model_dump())}\n"
                    f"Compte: {compact_context(request.account_context)}\n"
                    f"Stratégie: {compact_context(request.strategy_context)}\n"
                    "Réponds d'abord par une décision nette adaptée à ce profil. Justifie-la par les données disponibles. "
                    "Transforme-la en une à quatre actions réalisables cette semaine. Quand une donnée manque, "
                    "propose un test A/B qui ne change qu'une variable, avec métrique et règle de décision."
                ),
            )
            report["source"] = "openai"
            db.record_ai_usage(user_id, "coach", coach_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = coach_fallback(request)
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
    strategy = None
    if has_ai_budget(db, user_id):
        try:
            strategy = await ai.generate_json(
                model=settings.strategy_model,
                feature="creator_strategy",
                effort="high",
                verbosity="medium",
                schema=STRATEGY_SCHEMA,
                prompt=(
            f"Crée une stratégie TikTok personnalisée. Profil: {compact_context(request.profile.model_dump())}. "
            f"Analyse de compte disponible: {compact_context(request.account_context)}. "
            f"Fuseau: {request.timezone}. Les créneaux sont des hypothèses à tester 14 jours, pas des vérités. "
            "Prends parti pour une stratégie principale et fais des autres niches des piliers secondaires, pas des alternatives. "
            "La synthèse doit nommer l'audience, le problème récurrent, la promesse éditoriale et le mécanisme de conversion. "
            "Donne des idées de posts spécifiques à cette niche, avec une preuve ou un exemple attendu, jamais des titres génériques. "
            "Chaque créneau doit inclure un protocole 14 jours où une seule variable change et une règle de décision. "
            "Ne parle pas d'éligibilité, de LIVE ou de TikTok Shop. "
            "Les fourchettes de revenu doivent être indicatives, modestes et accompagnées de leur base de calcul."
        ),
            )
            strategy["source"] = "openai"
            db.record_ai_usage(user_id, "strategy", settings.strategy_model)
        except AIUnavailableError:
            strategy = None
    if strategy is None:
        strategy = strategy_fallback(request.profile, request.account_context)
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
    result = None
    if has_ai_budget(db, user_id):
        try:
            result = await ai.generate_json(
                model=settings.fast_model,
                feature="content_calendar",
                effort="low",
                verbosity="low",
                schema=CALENDAR_SCHEMA,
                prompt=(
                    f"Génère un calendrier du {start.isoformat()} au {end.isoformat()} inclus. "
                    f"Profil: {compact_context(request.profile.model_dump())}. "
            f"Stratégie validée: {compact_context(request.strategy)}. "
            "Respecte strictement la cadence et le temps disponible. Répartis recherche, vidéos, carrousels, "
            "et stories seulement quand cohérent. Aucun titre générique: chaque événement doit viser une question, "
            "une erreur ou une objection précise de la niche. Fournis un hook prononçable ou affichable et un CTA concret. "
            "Le calendrier doit alterner acquisition, confiance et conversion sans dépasser la cadence déclarée."
        ),
            )
            result["source"] = "openai"
            db.record_ai_usage(user_id, "calendar", settings.fast_model)
        except AIUnavailableError:
            result = None
    if result is None:
        result = calendar_fallback(request.profile, request.strategy, start, request.days)
    events = [
        db.create_event(
            user_id, {**event, "status": "planned", "source": "ai"}
        )
        for event in result["events"]
        if start.isoformat() <= event["date"] <= end.isoformat()
    ]
    return {"events": events}
