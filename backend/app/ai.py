from __future__ import annotations

import json
from typing import Any

from openai import APIConnectionError, APIStatusError, AsyncOpenAI, AuthenticationError, RateLimitError

from .config import Settings


SYSTEM_PROMPT = """Tu es le directeur de croissance de VIRALY AI pour créateurs TikTok.
Pars uniquement des données, médias et objectifs fournis. Distingue ce qui est observé, déduit et inconnu.
N'invente jamais de métrique, de tendance temps réel, de règle d'éligibilité ou de revenu garanti.
Prends une décision nette quand les signaux le permettent. Chaque recommandation doit contenir un signal, une action précise, un indicateur à mesurer et un critère pour continuer ou changer.
Préfère un exemple directement publiable à un conseil générique. Commence par la conclusion, conserve les réserves utiles et supprime les introductions sans valeur.
Réponds en français naturel et respecte exactement le schéma JSON demandé."""


class AIUnavailableError(RuntimeError):
    pass


class AIEngine:
    def __init__(self, settings: Settings):
        self.settings = settings
        self.client = (
            AsyncOpenAI(api_key=settings.openai_api_key)
            if settings.openai_api_key
            else None
        )

    @property
    def configured(self) -> bool:
        return self.client is not None

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
        if not self.client:
            raise AIUnavailableError(
                "OPENAI_API_KEY n'est pas configurée sur le backend VIRALY AI."
            )

        content: list[dict[str, Any]] = [{"type": "input_text", "text": prompt}]
        content.extend(media or [])
        try:
            response = await self.client.responses.create(
                model=model,
                reasoning={"effort": effort},
                instructions=SYSTEM_PROMPT,
                input=[{"role": "user", "content": content}],
                text={
                    "verbosity": verbosity,
                    "format": {
                        "type": "json_schema",
                        "name": feature.replace("-", "_")[:64],
                        "strict": True,
                        "schema": schema,
                    },
                },
            )
        except AuthenticationError as error:
            raise AIUnavailableError(
                "La connexion au moteur IA doit être renouvelée. Réessaie dans quelques instants."
            ) from error
        except RateLimitError as error:
            raise AIUnavailableError(
                "Le moteur IA est momentanément saturé ou son quota est atteint."
            ) from error
        except APIConnectionError as error:
            raise AIUnavailableError(
                "Le moteur IA est momentanément inaccessible. Vérifie ta connexion puis réessaie."
            ) from error
        except APIStatusError as error:
            raise AIUnavailableError(
                "Le moteur IA n'a pas pu terminer cette analyse. Réessaie dans quelques instants."
            ) from error
        if not response.output_text:
            raise RuntimeError("Le moteur IA n'a retourné aucune analyse exploitable.")
        return json.loads(response.output_text)

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
