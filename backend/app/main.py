from __future__ import annotations

import asyncio
import base64
import hmac
import json
import re
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
    CONTENT_PLAN_SCHEMA,
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
    PlanGenerationRequest,
)


app = FastAPI(title="VIRALY AI API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Viraly-Installation"],
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
        content={"detail": str(error), "code": error.code},
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


def ai_provider_for_model(model: str) -> str:
    return "anthropic" if model.lower().startswith("claude") else "openai"


async def history_thumbnail(upload: UploadFile | None) -> str | None:
    if upload is None:
        return None
    if not (upload.content_type or "").startswith("image/"):
        raise HTTPException(415, "L'aperçu doit être une image.")
    data = await read_upload(upload, 600 * 1024)
    media_type = upload.content_type or "image/jpeg"
    return f"data:{media_type};base64,{base64.b64encode(data).decode()}"


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
    strategy = request.strategy_context or {}
    mix = strategy.get("contentMix") if isinstance(strategy, dict) else None
    if not isinstance(mix, dict):
        mix = content_mix_for_profile(profile)
    videos = int(mix.get("videos", 0))
    carousels = int(mix.get("carousels", 0))
    stories = int(mix.get("stories", 0))
    period_days = int(strategy.get("durationDays", 7)) if isinstance(strategy, dict) else 7
    weekly_volume = (
        f"{videos} {'vidéo' if videos == 1 else 'vidéos'}, "
        f"{carousels} {'carrousel' if carousels == 1 else 'carrousels'} et "
        f"{stories} {'story' if stories == 1 else 'stories'} sur {period_days} jours"
    )
    if "heure" in question or "poster" in question:
        answer = (
            f"Pour ton rythme, garde {weekly_volume}. Teste les publications principales à 12h15 et 19h30, "
            "puis conserve le créneau qui gagne en sauvegardes et commentaires après 24 heures."
        )
        calendar = "Utilise les heures du plan actif et compare uniquement 12h15 contre 19h30."
    elif "story" in question:
        answer = (
            f"Ton plan prévoit {stories} stories: répartis-les entre sondage, coulisse, preuve et rappel "
            "vers la publication principale du jour."
        )
        calendar = f"Garde les {stories} stories aux moments déjà indiqués dans ton plan de 7 jours."
    else:
        answer = (
            f"Priorité pour {niche}: exécute {weekly_volume} autour d'une seule promesse, "
            "puis relie chaque contenu à une action mesurable."
        )
        calendar = "Commence par la première publication de preuve prévue dans le plan actif."
    account_score = (request.account_context or {}).get("score")
    score_context = f", score observé {account_score}/100" if account_score is not None else ""
    return {
        "answer": answer,
        "why": (
            f"Décision construite à partir de ta niche ({niche}), de ton objectif {profile.goal}, "
            f"format {preferred_format(profile)}, monétisation {monetization_label(profile)}{score_context} "
            "et des volumes de ton dernier plan."
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


def content_mix_for_profile(
    profile: CreatorProfile, days: int = 7
) -> dict[str, int]:
    cadence_posts = {"1-2": 3, "3-4": 5, "5-7": 7, "multiple": 7}.get(
        profile.cadence, 5
    )
    time_capacity = {"1-2h": 3, "3-5h": 5, "6-10h": 7, "10h+": 7}.get(
        profile.time, 5
    )
    weekly_posts = min(cadence_posts, time_capacity)
    feed_posts = (weekly_posts * days + 6) // 7
    if profile.format == "carousel":
        carousels = min(feed_posts - 1, max(2, (feed_posts * 2 + 2) // 3))
    elif profile.format == "mixed":
        carousels = (feed_posts + 1) // 2
    else:
        carousels = max(1, (feed_posts + 2) // 3)
    videos = max(1, feed_posts - carousels)
    stories = {7: 1, 14: 2, 30: 4}.get(days, max(1, days // 7))
    return {"videos": videos, "carousels": carousels, "stories": stories}


def visible_follower_bracket(
    profile: CreatorProfile, account_context: dict[str, Any] | None
) -> str:
    metrics = (account_context or {}).get("metrics")
    visible = str(metrics.get("followers") or "") if isinstance(metrics, dict) else ""
    normalized = visible.lower().replace(" ", "").replace(",", ".")
    match = re.search(r"[\d.]+", normalized)
    if not match:
        return profile.followers
    try:
        count = float(match.group(0))
    except ValueError:
        return profile.followers
    if "m" in normalized:
        count *= 1_000_000
    elif "k" in normalized:
        count *= 1_000
    if count >= 10_000:
        return "10000+"
    if count >= 1_000:
        return "1000-10000"
    if count >= 100:
        return "100-1000"
    return "0-100"


def revenue_potential_after(
    profile: CreatorProfile, account_context: dict[str, Any] | None
) -> str:
    scenarios = {
        "affiliate": {
            "0-100": (0, 30), "100-1000": (10, 120),
            "1000-10000": (80, 900), "10000+": (500, 4500),
        },
        "service": {
            "0-100": (0, 150), "100-1000": (80, 600),
            "1000-10000": (300, 3000), "10000+": (1200, 9000),
        },
        "product": {
            "0-100": (0, 80), "100-1000": (40, 400),
            "1000-10000": (200, 2500), "10000+": (1000, 10000),
        },
        "partnerships": {
            "0-100": (0, 0), "100-1000": (0, 150),
            "1000-10000": (150, 1500), "10000+": (800, 7000),
        },
    }
    bracket = visible_follower_bracket(profile, account_context)
    monetization = profile.monetization if profile.monetization in scenarios else "affiliate"
    low, high = scenarios[monetization].get(bracket, scenarios[monetization]["0-100"])
    factor = {"1-2": 0.7, "3-4": 1.0, "5-7": 1.25, "multiple": 1.5}.get(
        profile.cadence, 1.0
    )
    low = max(0, round(low * factor / 10) * 10)
    high = max(low, round(high * factor / 10) * 10)
    if low == 0:
        return f"jusqu'à {high} €/mois"
    return f"{low} à {high} €/mois"


def fallback_content_plan(
    profile: CreatorProfile,
    account_context: dict[str, Any] | None,
    start: date,
    days: int = 7,
) -> dict[str, Any]:
    niche = niche_label(profile)
    mix = content_mix_for_profile(profile, days)
    objective = {
        "reach": "les vues qualifiées",
        "community": "la conversion en abonnés",
        "traffic": "les clics utiles",
        "revenue": "les demandes qualifiées",
    }.get(profile.goal, "la croissance du compte")
    feed_times = ["19:30", "12:15", "18:00", "20:00", "12:30", "19:00", "11:30"]
    video_titles = [
        f"3 erreurs en {niche} qui bloquent {objective}",
        f"Avant/après: la correction {niche} qui change le résultat",
        f"Je tranche ce débat fréquent en {niche}",
        f"Le test {niche} à reproduire cette semaine",
        f"Ce conseil {niche} semble juste, mais ralentit les résultats",
        f"Analyse d'un cas réel en {niche}",
        f"La méthode courte pour progresser en {niche}",
    ]
    carousel_titles = [
        f"Checklist {niche}: 5 points à vérifier avant de commencer",
        f"Plan en 4 étapes pour obtenir un résultat en {niche}",
        f"À garder: les erreurs et corrections clés en {niche}",
        f"Comparatif {niche}: mauvaise méthode contre bonne méthode",
        f"Les 6 questions à poser avant une décision en {niche}",
        f"Guide express {niche} à sauvegarder",
        f"Le système hebdomadaire pour progresser en {niche}",
    ]
    story_titles = [
        f"Sondage: ton blocage numéro 1 en {niche}",
        f"Coulisse: préparation du prochain contenu {niche}",
        f"Question ouverte sur l'erreur la plus fréquente en {niche}",
        f"Preuve rapide avant/après en {niche}",
        f"Rappel de la méthode publiée cette semaine",
        f"Réponse à l'objection qui revient le plus",
        f"Bilan: quel sujet {niche} approfondir ensuite ?",
        f"Quiz express pour tester une idée reçue en {niche}",
        f"Mini-conseil applicable aujourd'hui en {niche}",
        f"Retour sur le meilleur commentaire de la semaine",
        f"Annonce du contenu publié ce soir",
        f"Demande de cas à analyser en {niche}",
    ]
    feed_types = ["video"] * mix["videos"] + ["carousel"] * mix["carousels"]
    if profile.format == "carousel":
        feed_types.sort(key=lambda item: item != "carousel")
    elif profile.format == "mixed":
        feed_types = [
            "video" if index % 2 == 0 and mix["videos"] else "carousel"
            for index in range(sum(mix[key] for key in ("videos", "carousels")))
        ]
        while feed_types.count("video") > mix["videos"]:
            feed_types[feed_types.index("video")] = "carousel"
        while feed_types.count("carousel") > mix["carousels"]:
            feed_types[feed_types.index("carousel")] = "video"
    feed_days = [
        (index * (days - 1)) // max(1, len(feed_types) - 1)
        for index in range(len(feed_types))
    ]
    events: list[dict[str, Any]] = []
    type_indexes = {"video": 0, "carousel": 0}
    for index, event_type in enumerate(feed_types):
        day_offset = feed_days[index]
        type_index = type_indexes[event_type]
        type_indexes[event_type] += 1
        titles = video_titles if event_type == "video" else carousel_titles
        title = titles[type_index % len(titles)]
        series = type_index // len(titles)
        if series:
            title = f"{title} · Partie {series + 1}"
        events.append(
            {
                "dayOffset": day_offset,
                "time": feed_times[index % len(feed_times)],
                "type": event_type,
                "title": title,
                "hook": f"Si tu crées sur {niche}, cette décision peut améliorer {objective} dès ce cycle.",
                "cta": f"Enregistre puis passe à l'étape liée à {monetization_label(profile)}.",
            }
        )
    for index in range(mix["stories"]):
        day_offset = min(days - 1, 6 + index * 7)
        events.append(
            {
                "dayOffset": day_offset,
                "time": "18:15",
                "type": "story",
                "title": story_titles[index % len(story_titles)],
                "hook": f"Une interaction courte pour préciser le prochain contenu {niche}.",
                "cta": "Réponds, vote ou ouvre le contenu principal du jour.",
            }
        )
    events.sort(key=lambda item: (item["dayOffset"], item["time"]))
    return {
        "summary": (
            f"Pendant {days} jours, concentre le compte sur {niche} avec {mix['videos']} vidéo(s), "
            f"{mix['carousels']} carrousel(s) et seulement {mix['stories']} story(s), selon {profile.time} disponibles."
        ),
        "strategyDecision": (
            f"Positionnement retenu: résoudre un problème précis en {niche}, montrer une preuve, "
            f"puis orienter vers {monetization_label(profile)}."
        ),
        "postingSlots": [
            {
                "dayOffset": feed_days[index],
                "time": feed_times[index],
                "reason": "Créneau de test personnalisé à comparer sur les sauvegardes, commentaires et clics à 24 h.",
            }
            for index in range(min(3, len(feed_types)))
        ],
        "weeklyFocus": [
            f"Répéter une promesse unique autour de {niche}.",
            "Comparer les hooks, sans changer le sujet ni le format du test.",
            "Utiliser la story hebdomadaire pour choisir le prochain contenu.",
        ],
        "events": events,
        "contentMix": mix,
        "durationDays": days,
        "startDate": start.isoformat(),
        "endDate": (start + timedelta(days=days - 1)).isoformat(),
        "revenuePotentialAfter": revenue_potential_after(profile, account_context),
        "source": "fallback_rules",
    }


def normalized_content_plan(
    profile: CreatorProfile,
    account_context: dict[str, Any] | None,
    start: date,
    generated: dict[str, Any] | None,
    source: str,
    days: int = 7,
) -> dict[str, Any]:
    fallback = fallback_content_plan(profile, account_context, start, days)
    if not generated:
        generated = fallback
    candidates: dict[str, list[dict[str, Any]]] = {"video": [], "carousel": [], "story": []}
    for item in generated.get("events", []):
        if isinstance(item, dict) and item.get("type") in candidates:
            candidates[str(item["type"])].append(item)
    events: list[dict[str, Any]] = []
    for template in fallback["events"]:
        event_type = str(template["type"])
        candidate = candidates[event_type].pop(0) if candidates[event_type] else {}
        day_offset = int(template["dayOffset"])
        events.append(
            {
                "date": (start + timedelta(days=day_offset)).isoformat(),
                "time": str(template["time"]),
                "type": event_type,
                "title": str(candidate.get("title") or template["title"])[:180],
                "hook": str(candidate.get("hook") or template["hook"])[:500],
                "cta": str(candidate.get("cta") or template["cta"])[:500],
            }
        )
    posting_slots = generated.get("postingSlots")
    if not isinstance(posting_slots, list) or len(posting_slots) < 2:
        posting_slots = fallback["postingSlots"]
    normalized_slots = []
    for slot in posting_slots[:4]:
        if not isinstance(slot, dict):
            continue
        try:
            day_offset = max(0, min(days - 1, int(slot.get("dayOffset", 0))))
        except (TypeError, ValueError):
            day_offset = 0
        normalized_slots.append(
            {
                "dayOffset": day_offset,
                "date": (start + timedelta(days=day_offset)).isoformat(),
                "time": str(slot.get("time") or "19:00")[:5],
                "reason": str(slot.get("reason") or fallback["postingSlots"][0]["reason"])[:300],
            }
        )
    weekly_focus = [
        str(item)[:240]
        for item in generated.get("weeklyFocus", [])
        if isinstance(item, str) and item.strip()
    ][:5]
    return {
        "summary": str(generated.get("summary") or fallback["summary"])[:700],
        "strategyDecision": str(
            generated.get("strategyDecision") or fallback["strategyDecision"]
        )[:700],
        "contentMix": fallback["contentMix"],
        "durationDays": days,
        "startDate": start.isoformat(),
        "endDate": (start + timedelta(days=days - 1)).isoformat(),
        "postingSlots": normalized_slots or fallback["postingSlots"],
        "weeklyFocus": weekly_focus or fallback["weeklyFocus"],
        "events": events,
        "revenuePotentialAfter": fallback["revenuePotentialAfter"],
        "profileSnapshot": profile.model_dump(),
        "accountScore": (account_context or {}).get("score"),
        "source": source,
    }


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
        "aiProviders": ai_engine().providers,
        "googleConfigured": google_configured(),
        "models": {
            "visual": settings.visual_model,
            "strategy": settings.strategy_model,
            "fast": settings.fast_model,
            "visionFallback": settings.anthropic_model,
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
def create_preview_session(
    request: Request,
    installation_id: Annotated[str | None, Header(alias="X-Viraly-Installation")] = None,
    db: Database = Depends(database),
):
    if not settings.preview_access_enabled or not settings.preview_secret:
        raise HTTPException(503, "La version de test n'est pas activée.")

    client_ip = request.client.host if request.client else "unknown"
    identity_source = (installation_id or "").strip()[:160] or client_ip
    identity = hmac.new(
        settings.preview_secret.encode(), identity_source.encode(), sha256
    ).hexdigest()
    token = f"preview_{hmac.new(settings.preview_secret.encode(), identity.encode(), sha256).hexdigest()}"
    user_id = f"usr_preview_{identity[:32]}"
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    db.ensure_preview_session(token, user_id, expires_at)
    return {"token": token, "name": "Créateur test", "expiresAt": expires_at}


@app.post("/api/v1/profile/analyze")
async def analyze_profile(
    screenshot: Annotated[UploadFile, File()],
    thumbnail: Annotated[UploadFile | None, File()] = None,
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
                detail="high",
            )
        ],
    )
    used_model = str(report.pop("_model", settings.visual_model))
    report["source"] = ai_provider_for_model(used_model)
    report["thumbnail"] = await history_thumbnail(thumbnail)
    report["historyTitle"] = str(report.get("metrics", {}).get("handle") or "Profil TikTok")
    report["authenticatedTikTokData"] = False
    db.record_ai_usage(user_id, "profile-analysis", used_model)
    report["analysisId"] = db.save_analysis(user_id, "profile", report)
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


@app.get("/api/v1/analyses")
def list_analyses(
    kind: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=30)] = 20,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    allowed_kinds = {"profile", "content", "idea", "ideas", "onboarding", "coach"}
    if kind and kind not in allowed_kinds:
        raise HTTPException(422, "Type d'analyse invalide.")
    return {"analyses": db.list_analyses(user_id, kind, limit)}


@app.delete("/api/v1/analyses/{analysis_id}", status_code=204)
def delete_analysis(
    analysis_id: str,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    if not db.delete_analysis(user_id, analysis_id):
        raise HTTPException(404, "Analyse introuvable.")
    return None


@app.post("/api/v1/content/analyze")
async def analyze_content(
    type: Annotated[str, Form()],
    goal: Annotated[str, Form()] = "revenue",
    assets: Annotated[list[UploadFile], File(alias="assets[]")] = [],
    thumbnail: Annotated[UploadFile | None, File()] = None,
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
    ensure_ai_budget(db, user_id)
    report = await ai.generate_json(
        model=settings.visual_model,
        feature="content_analysis",
        effort="medium",
        verbosity="medium",
        schema=CONTENT_SCHEMA,
        prompt=prompt,
        media=media,
    )
    used_model = str(report.pop("_model", settings.visual_model))
    report["source"] = ai_provider_for_model(used_model)
    report["thumbnail"] = await history_thumbnail(thumbnail)
    report["historyTitle"] = str(report.get("revisedHook") or "Carrousel TikTok")[:120]
    report["assetCount"] = len(assets)
    report["transcriptAvailable"] = bool(transcript)
    db.record_ai_usage(user_id, "content-analysis", used_model)
    report["analysisId"] = db.save_analysis(user_id, "content", report)
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
            used_model = str(report.pop("_model", settings.strategy_model))
            report["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "idea-analysis", used_model)
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
            used_model = str(report.pop("_model", settings.strategy_model))
            report["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "onboarding", used_model)
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
            used_model = str(report.pop("_model", settings.strategy_model))
            report["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "idea-generation", used_model)
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
    account_context = request.account_context or db.latest_analysis(user_id, "profile")
    strategy_context = (
        request.strategy_context
        or db.latest_content_plan(user_id)
        or db.get_strategy(user_id)
    )
    effective_request = request.model_copy(
        update={
            "account_context": account_context,
            "strategy_context": strategy_context,
        }
    )
    report = None
    if has_ai_budget(db, user_id):
        try:
            coach_model = (
                settings.strategy_model
                if account_context and len(request.question.strip()) >= 80
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
                    f"Compte: {compact_context(account_context)}\n"
                    f"Dernier plan 7 jours: {compact_context(strategy_context)}\n"
                    "Réponds d'abord par une décision nette adaptée à ce profil. Justifie-la par les données disponibles. "
                    "Respecte exactement les volumes, formats, dates et heures du dernier plan lorsqu'il existe. "
                    "Transforme la décision en une à quatre actions réalisables cette semaine. Quand une donnée manque, "
                    "propose un test A/B qui ne change qu'une variable, avec métrique et règle de décision."
                ),
            )
            used_model = str(report.pop("_model", coach_model))
            report["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "coach", used_model)
        except AIUnavailableError:
            report = None
    if report is None:
        report = coach_fallback(effective_request)
    report["question"] = request.question.strip()
    report["analysisId"] = db.save_analysis(user_id, "coach", report)
    return report


@app.get("/api/v1/plans")
def list_content_plans(
    limit: int = Query(default=12, ge=1, le=30),
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    return {"plans": db.list_content_plans(user_id, limit)}


@app.delete("/api/v1/plans/{plan_id}", status_code=204)
def delete_content_plan(
    plan_id: str,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
):
    if not db.delete_content_plan(user_id, plan_id):
        raise HTTPException(404, "Plan introuvable.")
    return None


@app.post("/api/v1/plans/generate")
async def generate_content_plan(
    request: PlanGenerationRequest,
    user_id: str = Depends(require_user),
    db: Database = Depends(database),
    ai: AIEngine = Depends(ai_engine),
):
    try:
        start = date.fromisoformat(request.starting_date)
    except ValueError as error:
        raise HTTPException(422, "Date de départ invalide.") from error

    account_context = request.account_context or db.latest_analysis(user_id, "profile")
    mix = content_mix_for_profile(request.profile, request.days)
    generated = None
    source = "fallback_rules"
    if has_ai_budget(db, user_id):
        try:
            generated = await asyncio.wait_for(
                ai.generate_json(
                    model=settings.strategy_model,
                    feature="weekly_content_plan",
                    effort="medium",
                    verbosity="low",
                    schema=CONTENT_PLAN_SCHEMA,
                    prompt=(
                        f"Construis un plan TikTok du {start.isoformat()} sur exactement {request.days} jours. "
                        f"Profil déclaré: {compact_context(request.profile.model_dump())}. "
                        f"Analyse visuelle du compte: {compact_context(account_context)}. "
                        f"Volume imposé: exactement {mix['videos']} vidéos, {mix['carousels']} carrousels "
                        f"et {mix['stories']} story(s), avec une story maximum par semaine. Fuseau: {request.timezone}. "
                        f"Répartis les contenus sur toute la période. Les dayOffset vont de 0 à {request.days - 1}. "
                        "Les carrousels doivent être concrets, sauvegardables et plus nombreux qu'avant. "
                        "Prends parti pour une seule stratégie cohérente avec la niche, le niveau du compte, l'objectif, "
                        "le format naturel, le temps disponible et la monétisation. Donne des titres spécifiques à cette niche, "
                        "des hooks prononçables et des CTA directement exécutables. Utilise des moments réalistes de la journée. "
                        "Ne parle ni d'éligibilité, ni de LIVE, ni de TikTok Shop, ni de revenus détaillés. "
                        "N'invente aucune tendance ou donnée temps réel."
                    ),
                ),
                timeout=18,
            )
            used_model = str(generated.pop("_model", settings.strategy_model))
            source = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "weekly-plan", used_model)
        except (AIUnavailableError, TimeoutError):
            generated = None

    plan = normalized_content_plan(
        request.profile,
        account_context,
        start,
        generated,
        source,
        request.days,
    )
    plan["events"] = db.replace_ai_events(user_id, plan["events"])
    db.save_strategy(user_id, plan)
    return db.save_content_plan(user_id, plan)


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
            used_model = str(strategy.pop("_model", settings.strategy_model))
            strategy["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "strategy", used_model)
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
            used_model = str(result.pop("_model", settings.fast_model))
            result["source"] = ai_provider_for_model(used_model)
            db.record_ai_usage(user_id, "calendar", used_model)
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
