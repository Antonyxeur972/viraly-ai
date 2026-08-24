from __future__ import annotations

import json
import logging
from typing import Any

from anthropic import (
    APIConnectionError as AnthropicConnectionError,
    APIStatusError as AnthropicStatusError,
    AsyncAnthropic,
    AuthenticationError as AnthropicAuthenticationError,
    RateLimitError as AnthropicRateLimitError,
)
from jsonschema import ValidationError, validate
from openai import APIConnectionError, APIStatusError, AsyncOpenAI, AuthenticationError, RateLimitError

from .config import Settings


logger = logging.getLogger("viraly.ai")


SYSTEM_PROMPT = """Tu es le directeur de croissance de VIRALY AI pour créateurs TikTok.
Pars uniquement des données, médias et objectifs fournis. Distingue ce qui est observé, déduit et inconnu.
N'invente jamais de métrique, de tendance temps réel, de règle d'éligibilité ou de revenu garanti.
Prends une décision nette quand les signaux le permettent. Chaque recommandation doit contenir un signal, une action précise, un indicateur à mesurer et un critère pour continuer ou changer.
Préfère un exemple directement publiable à un conseil générique. Commence par la conclusion, conserve les réserves utiles et supprime les introductions sans valeur.
Réponds en français naturel et respecte exactement le schéma JSON demandé."""


class AIUnavailableError(RuntimeError):
    def __init__(self, message: str, *, code: str = "unavailable"):
        super().__init__(message)
        self.code = code


class AIEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = (
            AsyncOpenAI(api_key=settings.openai_api_key)
            if settings.openai_api_key
            else None
        )
        self.anthropic_client = (
            AsyncAnthropic(api_key=settings.anthropic_api_key)
            if settings.anthropic_api_key
            else None
        )

    @property
    def configured(self) -> bool:
        return self.client is not None or self.anthropic_client is not None

    @property
    def providers(self) -> dict[str, bool]:
        return {
            "openai": self.client is not None,
            "anthropic": self.anthropic_client is not None,
        }

    async def generate_json(
        self,
        *,
        model: str,
        feature: str,
        prompt: str,
        schema: dict[str, Any],
        media: list[dict[str, Any]] | None = None,
        effort: str = "low",
        verbosity: str = "medium",
    ) -> dict[str, Any]:
        content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
        content.extend(media or [])
        openai_error: AIUnavailableError | None = None
        if self.client:
            try:
                return await self._generate_openai(
                    model=model,
                    feature=feature,
                    schema=schema,
                    content=content,
                    media=media,
                    effort=effort,
                    verbosity=verbosity,
                )
            except AIUnavailableError as error:
                openai_error = error
                logger.warning("OpenAI unavailable feature=%s code=%s", feature, error.code)

        if self.anthropic_client:
            return await self._generate_anthropic(
                feature=feature,
                prompt=prompt,
                schema=schema,
                media=media,
            )

        if openai_error:
            raise openai_error
        raise AIUnavailableError(
            "Aucun moteur IA visuel n'est configuré sur le backend VIRALY AI.",
            code="not_configured",
        )

    async def _generate_openai(
        self,
        *,
        model: str,
        feature: str,
        schema: dict[str, Any],
        content: list[dict[str, Any]],
        media: list[dict[str, Any]] | None,
        effort: str,
        verbosity: str,
    ) -> dict[str, Any]:
        if not self.client:
            raise AIUnavailableError("OpenAI n'est pas configuré.", code="not_configured")
        candidates = [model]
        fallbacks = ["gpt-4.1-mini", "gpt-4o-mini"] if media else [self.settings.fast_model, "gpt-4.1-mini"]
        for fallback in fallbacks:
            if fallback and fallback not in candidates:
                candidates.append(fallback)

        last_error: Exception | None = None
        for candidate in candidates:
            text_config: dict[str, Any] = {
                "format": {
                    "type": "json_schema",
                    "name": feature.replace("-", "_")[:64],
                    "strict": True,
                    "schema": schema,
                }
            }
            request: dict[str, Any] = {
                "model": candidate,
                "instructions": SYSTEM_PROMPT,
                "input": [{"role": "user", "content": content}],
                "text": text_config,
            }
            if candidate.startswith("gpt-5"):
                request["reasoning"] = {"effort": effort}
                text_config["verbosity"] = verbosity

            try:
                response = await self.client.responses.create(**request)
                if not response.output_text:
                    raise AIUnavailableError(
                        "Le moteur IA n'a retourné aucune analyse exploitable.",
                        code="empty_response",
                    )
                result = json.loads(response.output_text)
                result["_model"] = candidate
                return result
            except AuthenticationError as error:
                raise AIUnavailableError(
                    "La connexion au moteur IA doit être renouvelée.",
                    code="authentication",
                ) from error
            except RateLimitError as error:
                last_error = error
                error_code = self._error_code(error)
                logger.warning("AI rate limit feature=%s model=%s code=%s", feature, candidate, error_code)
                if error_code in {"insufficient_quota", "billing_hard_limit_reached"}:
                    raise AIUnavailableError(
                        "Le crédit OpenAI du backend est épuisé. Recharge la facturation API puis relance l'analyse.",
                        code="quota",
                    ) from error
            except APIConnectionError as error:
                raise AIUnavailableError(
                    "Le moteur IA est momentanément inaccessible. Vérifie ta connexion puis réessaie.",
                    code="connection",
                ) from error
            except APIStatusError as error:
                last_error = error
                logger.warning(
                    "AI status error feature=%s model=%s status=%s code=%s",
                    feature,
                    candidate,
                    error.status_code,
                    self._error_code(error),
                )
                if error.status_code not in {400, 403, 404, 429}:
                    break

        raise AIUnavailableError(
            "L'analyse visuelle n'a pas pu démarrer. Réessaie dans quelques instants.",
            code="models_unavailable",
        ) from last_error

    async def _generate_anthropic(
        self,
        *,
        feature: str,
        prompt: str,
        schema: dict[str, Any],
        media: list[dict[str, Any]] | None,
    ) -> dict[str, Any]:
        if not self.anthropic_client:
            raise AIUnavailableError("Claude Vision n'est pas configuré.", code="not_configured")

        content: list[dict[str, Any]] = []
        for item in media or []:
            image_url = str(item.get("image_url") or "")
            if not image_url.startswith("data:") or "," not in image_url:
                continue
            header, data = image_url.split(",", 1)
            media_type = header[5:].split(";", 1)[0] or "image/jpeg"
            content.append(
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": data,
                    },
                }
            )
        content.append(
            {
                "type": "text",
                "text": f"{prompt}\nRetourne UNIQUEMENT l'objet JSON final, sans balise Markdown.",
            }
        )
        system = (
            f"{SYSTEM_PROMPT}\nSchéma JSON obligatoire pour {feature}:\n"
            f"{json.dumps(schema, ensure_ascii=False, separators=(',', ':'))}"
        )
        try:
            response = await self.anthropic_client.messages.create(
                model=self.settings.anthropic_model,
                max_tokens=4096,
                system=system,
                messages=[{"role": "user", "content": content}],
            )
        except AnthropicAuthenticationError as error:
            raise AIUnavailableError(
                "La connexion Claude Vision doit être renouvelée.",
                code="anthropic_authentication",
            ) from error
        except AnthropicRateLimitError as error:
            raise AIUnavailableError(
                "Claude Vision a atteint sa limite temporaire. Réessaie dans quelques instants.",
                code="anthropic_rate_limit",
            ) from error
        except AnthropicConnectionError as error:
            raise AIUnavailableError(
                "Claude Vision est momentanément inaccessible.",
                code="anthropic_connection",
            ) from error
        except AnthropicStatusError as error:
            logger.warning(
                "Anthropic status error feature=%s status=%s",
                feature,
                error.status_code,
            )
            raise AIUnavailableError(
                "Claude Vision n'a pas pu terminer cette analyse.",
                code="anthropic_status",
            ) from error

        raw = "".join(
            str(getattr(block, "text", ""))
            for block in response.content
            if getattr(block, "type", "") == "text"
        ).strip()
        start, end = raw.find("{"), raw.rfind("}")
        if start < 0 or end <= start:
            raise AIUnavailableError(
                "Claude Vision n'a retourné aucune analyse exploitable.",
                code="anthropic_invalid_json",
            )
        try:
            result = json.loads(raw[start : end + 1])
            validate(instance=result, schema=schema)
        except (json.JSONDecodeError, ValidationError) as error:
            raise AIUnavailableError(
                "Claude Vision a retourné une analyse incomplète. Relance la lecture.",
                code="anthropic_invalid_schema",
            ) from error
        result["_model"] = self.settings.anthropic_model
        return result

    @staticmethod
    def _error_code(error: APIStatusError) -> str:
        body = getattr(error, "body", None)
        if isinstance(body, dict):
            nested = body.get("error")
            if isinstance(nested, dict) and nested.get("code"):
                return str(nested["code"])
            if body.get("code"):
                return str(body["code"])
        return str(getattr(error, "code", "unknown") or "unknown")

    async def transcribe(self, file_path: str) -> str | None:
        if not self.client:
            return None
        try:
            with open(file_path, "rb") as audio_file:
                result = await self.client.audio.transcriptions.create(
                    model=self.settings.transcribe_model,
                    file=audio_file,
                    response_format="text",
                )
            return str(result).strip() or None
        except Exception:
            return None
