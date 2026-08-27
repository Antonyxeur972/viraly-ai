from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class CreatorProfile(BaseModel):
    platform: Literal["tiktok", "instagram"] = "tiktok"
    goal: str = "reach"
    niche: str = "none"
    nicheTopic: str | None = Field(default=None, max_length=120)
    followers: str = "0-100"
    cadence: str = "3-4"
    format: str = "mixed"
    time: str = "3-5h"
    monetization: str = "affiliate"


class GoogleCodeExchange(BaseModel):
    code: str = Field(min_length=20, max_length=500)


class ManagedSessionExchange(BaseModel):
    session_id: str = Field(min_length=10, max_length=500)


class IdeaAnalysisRequest(BaseModel):
    idea: str = Field(min_length=5, max_length=1200)
    profile: CreatorProfile
    account_context: dict[str, Any] | None = None


class IdeaGenerationRequest(BaseModel):
    profile: CreatorProfile
    count: int = Field(default=4, ge=1, le=8)
    account_context: dict[str, Any] | None = None


class CoachRequest(BaseModel):
    question: str = Field(min_length=3, max_length=1200)
    profile: CreatorProfile
    account_context: dict[str, Any] | None = None
    strategy_context: dict[str, Any] | None = None


class StrategyRequest(BaseModel):
    profile: CreatorProfile
    account_context: dict[str, Any] | None = None
    timezone: str = "Europe/Paris"


class PlanGenerationRequest(StrategyRequest):
    starting_date: str
    days: Literal[7, 14, 30] = 7


class CalendarGenerationRequest(BaseModel):
    profile: CreatorProfile
    strategy: dict[str, Any]
    starting_date: str
    days: int = Field(default=7, ge=3, le=30)


class CalendarEventCreate(BaseModel):
    date: str
    time: str
    type: Literal["video", "carousel", "story", "live", "research"]
    title: str = Field(min_length=2, max_length=180)
    hook: str = Field(default="", max_length=500)
    cta: str = Field(default="", max_length=500)
    status: Literal["planned", "ready", "published", "skipped"] = "planned"
    source: Literal["manual", "ai"] = "manual"


class CalendarEventUpdate(BaseModel):
    date: str | None = None
    time: str | None = None
    type: Literal["video", "carousel", "story", "live", "research"] | None = None
    title: str | None = Field(default=None, min_length=2, max_length=180)
    hook: str | None = Field(default=None, max_length=500)
    cta: str | None = Field(default=None, max_length=500)
    status: Literal["planned", "ready", "published", "skipped"] | None = None


PROFILE_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "score", "confidence", "summary", "visibleSignals", "priorities", "metrics",
        "accountPositioning", "revenueReadiness", "nextAction",
    ],
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "confidence": {"type": "string", "enum": ["faible", "moyenne", "élevée"]},
        "summary": {"type": "string"},
        "visibleSignals": {"type": "array", "items": {"type": "string"}, "maxItems": 8},
        "priorities": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 5},
        "metrics": {
            "type": "object",
            "additionalProperties": False,
            "required": ["followers", "likes", "videos", "bio", "handle"],
            "properties": {
                "followers": {"type": ["string", "null"]},
                "likes": {"type": ["string", "null"]},
                "videos": {"type": ["string", "null"]},
                "bio": {"type": ["string", "null"]},
                "handle": {"type": ["string", "null"]},
            },
        },
        "accountPositioning": {"type": "string"},
        "revenueReadiness": {"type": "string"},
        "nextAction": {"type": "string"},
    },
}


CONTENT_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "score", "summary", "revenueCta", "improvements", "dimensions", "revisedHook",
        "storyboard", "revenuePotential",
    ],
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "revenueCta": {"type": "string"},
        "improvements": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 6},
        "dimensions": {
            "type": "array",
            "minItems": 4,
            "maxItems": 6,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["name", "score", "evidence", "action"],
                "properties": {
                    "name": {"type": "string"},
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "evidence": {"type": "string"},
                    "action": {"type": "string"},
                },
            },
        },
        "revisedHook": {"type": "string"},
        "storyboard": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 8},
        "revenuePotential": {
            "type": "object",
            "additionalProperties": False,
            "required": ["level", "path", "basis"],
            "properties": {
                "level": {"type": "string", "enum": ["faible", "moyen", "élevé"]},
                "path": {"type": "string"},
                "basis": {"type": "string"},
            },
        },
    },
}


IDEA_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "score", "summary", "optimizedHook", "scriptSteps", "audiencePromise", "revenuePath", "risks",
    ],
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "optimizedHook": {"type": "string"},
        "scriptSteps": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 7},
        "audiencePromise": {"type": "string"},
        "revenuePath": {"type": "string"},
        "risks": {"type": "array", "items": {"type": "string"}, "maxItems": 4},
    },
}


IDEAS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["ideas"],
    "properties": {
        "ideas": {
            "type": "array",
            "minItems": 1,
            "maxItems": 8,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["title", "format", "promise", "score", "revenuePath", "effort"],
                "properties": {
                    "title": {"type": "string"},
                    "format": {"type": "string"},
                    "promise": {"type": "string"},
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                    "revenuePath": {"type": "string"},
                    "effort": {"type": "string", "enum": ["faible", "moyen", "élevé"]},
                },
            },
        }
    },
}


COACH_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["answer", "why", "actions", "calendarSuggestion", "confidence"],
    "properties": {
        "answer": {"type": "string"},
        "why": {"type": "string"},
        "actions": {"type": "array", "items": {"type": "string"}, "minItems": 1, "maxItems": 5},
        "calendarSuggestion": {"type": ["string", "null"]},
        "confidence": {"type": "string", "enum": ["faible", "moyenne", "élevée"]},
    },
}


STRATEGY_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["summary", "niches", "postingSlots", "weeklyCycle", "storyPlan", "revenuePaths"],
    "properties": {
        "summary": {"type": "string"},
        "niches": {
            "type": "array", "minItems": 2, "maxItems": 3,
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["name", "audience", "edge", "revenueAngle", "score"],
                "properties": {
                    "name": {"type": "string"}, "audience": {"type": "string"},
                    "edge": {"type": "string"}, "revenueAngle": {"type": "string"},
                    "score": {"type": "integer", "minimum": 0, "maximum": 100},
                },
            },
        },
        "postingSlots": {
            "type": "array", "minItems": 3, "maxItems": 5,
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["day", "time", "reason", "testProtocol"],
                "properties": {
                    "day": {"type": "string"}, "time": {"type": "string"},
                    "reason": {"type": "string"}, "testProtocol": {"type": "string"},
                },
            },
        },
        "weeklyCycle": {"type": "array", "items": {"type": "string"}, "minItems": 4, "maxItems": 7},
        "storyPlan": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 6},
        "revenuePaths": {
            "type": "array", "minItems": 2, "maxItems": 4,
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["name", "nextAction", "contentDirection", "range", "basis"],
                "properties": {
                    "name": {"type": "string"}, "nextAction": {"type": "string"},
                    "contentDirection": {"type": "string"}, "range": {"type": "string"},
                    "basis": {"type": "string"},
                },
            },
        },
    },
}


CONTENT_PLAN_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": [
        "summary",
        "strategyDecision",
        "postingSlots",
        "weeklyFocus",
        "events",
    ],
    "properties": {
        "summary": {"type": "string"},
        "strategyDecision": {"type": "string"},
        "postingSlots": {
            "type": "array",
            "minItems": 2,
            "maxItems": 4,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["dayOffset", "time", "reason"],
                "properties": {
                    "dayOffset": {"type": "integer", "minimum": 0, "maximum": 29},
                    "time": {"type": "string"},
                    "reason": {"type": "string"},
                },
            },
        },
        "weeklyFocus": {
            "type": "array",
            "items": {"type": "string"},
            "minItems": 3,
            "maxItems": 5,
        },
        "events": {
            "type": "array",
            "minItems": 3,
            "maxItems": 40,
            "items": {
                "type": "object",
                "additionalProperties": False,
                "required": ["dayOffset", "time", "type", "title", "hook", "cta"],
                "properties": {
                    "dayOffset": {"type": "integer", "minimum": 0, "maximum": 29},
                    "time": {"type": "string"},
                    "type": {"type": "string", "enum": ["video", "carousel", "story"]},
                    "title": {"type": "string"},
                    "hook": {"type": "string"},
                    "cta": {"type": "string"},
                },
            },
        },
    },
}


CALENDAR_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["events"],
    "properties": {
        "events": {
            "type": "array", "minItems": 3, "maxItems": 30,
            "items": {
                "type": "object", "additionalProperties": False,
                "required": ["date", "time", "type", "title", "hook", "cta"],
                "properties": {
                    "date": {"type": "string"}, "time": {"type": "string"},
                    "type": {"type": "string", "enum": ["video", "carousel", "story", "live", "research"]},
                    "title": {"type": "string"}, "hook": {"type": "string"}, "cta": {"type": "string"},
                },
            },
        }
    },
}


ONBOARDING_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["score", "summary", "priorities", "cycle", "firstWeek", "revenueDirection"],
    "properties": {
        "score": {"type": "integer", "minimum": 0, "maximum": 100},
        "summary": {"type": "string"},
        "priorities": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 3},
        "cycle": {"type": "string"},
        "firstWeek": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 7},
        "revenueDirection": {"type": "string"},
    },
}
