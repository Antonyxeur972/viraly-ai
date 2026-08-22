import { ContentIdea, VideoMetric } from "../types";

type ScoreInput = {
  hookRate: number;
  retention: number;
  savesPerView: number;
  sharesPerView: number;
  revenueFit: number;
};

const clamp = (value: number, min = 0, max = 100) =>
  Math.max(min, Math.min(max, value));

export function calculateViralityScore(input: ScoreInput) {
  const hook = input.hookRate * 0.24;
  const retention = input.retention * 0.28;
  const saves = Math.min(input.savesPerView * 850, 100) * 0.18;
  const shares = Math.min(input.sharesPerView * 1200, 100) * 0.18;
  const revenue = input.revenueFit * 0.12;

  return Math.round(clamp(hook + retention + saves + shares + revenue));
}

export function gradeVideo(video: VideoMetric) {
  const score = calculateViralityScore(video);

  if (score >= 82) {
    return {
      score,
      label: "Pret a pousser",
      advice: "Reposte ce concept avec un hook plus direct et une preuve dans les 3 premieres secondes."
    };
  }

  if (score >= 68) {
    return {
      score,
      label: "Bon potentiel",
      advice: "Garde l'idee, mais raccourcis l'intro et ajoute une raison d'enregistrer la video."
    };
  }

  return {
    score,
    label: "A retravailler",
    advice: "Clarifie la promesse, coupe le debut et choisis une tension plus forte pour la premiere phrase."
  };
}

export function scoreIdea(idea: ContentIdea) {
  const effortPenalty = idea.effort === "eleve" ? 8 : idea.effort === "moyen" ? 3 : 0;
  return Math.round(
    clamp(
      idea.searchPull * 0.32 +
        idea.shareability * 0.3 +
        idea.revenueFit * 0.3 +
        10 -
        effortPenalty
    )
  );
}

export function rankIdeas(ideas: ContentIdea[]) {
  return [...ideas].sort((a, b) => scoreIdea(b) - scoreIdea(a));
}

export function formatCompactNumber(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }

  return `${value}`;
}
