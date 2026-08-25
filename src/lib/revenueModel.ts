import { CreatorOnboardingProfile, EligibilityGoal, RevenueForecast } from "../types";

type RevenueInputs = {
  followers: number;
  averageViews: number;
  monthlyPosts?: number;
};

const roundToTen = (value: number) => Math.max(0, Math.round(value / 10) * 10);

const revenueScenarios: Record<string, Record<string, [number, number]>> = {
  affiliate: {
    "0-100": [0, 30], "100-1000": [10, 120], "1000-10000": [80, 900], "10000+": [500, 4500]
  },
  service: {
    "0-100": [0, 150], "100-1000": [80, 600], "1000-10000": [300, 3000], "10000+": [1200, 9000]
  },
  product: {
    "0-100": [0, 80], "100-1000": [40, 400], "1000-10000": [200, 2500], "10000+": [1000, 10000]
  },
  partnerships: {
    "0-100": [0, 0], "100-1000": [0, 150], "1000-10000": [150, 1500], "10000+": [800, 7000]
  }
};

const channelLabels: Record<string, string> = {
  affiliate: "Affiliation ciblée",
  service: "Service ou coaching",
  product: "Produit digital",
  partnerships: "Partenariats de marque"
};

const channelActions: Record<string, string> = {
  affiliate: "Créer une série de démonstrations autour d'un seul outil avec preuve et lien traqué.",
  service: "Publier des diagnostics et cas concrets, puis convertir vers un appel ou un audit.",
  product: "Valider un problème récurrent avant de proposer un guide, template ou mini-formation.",
  partnerships: "Construire une série reconnaissable et documenter rétention, sauvegardes et clics."
};

const cadenceFactor: Record<string, number> = {
  "1-2": 0.7,
  "3-4": 1,
  "5-7": 1.25,
  multiple: 1.5
};

const followerLabels: Record<string, string> = {
  "0-100": "0 à 100",
  "100-1000": "100 à 1 000",
  "1000-10000": "1 000 à 10 000",
  "10000+": "plus de 10 000"
};

function nicheFactor(value = "") {
  const niche = value.toLowerCase();
  if (niche.includes("business") || niche.includes("argent")) return 1.18;
  if (niche.includes("ia") || niche.includes("tech")) return 1.16;
  if (niche.includes("beauté") || niche.includes("skincare")) return 1.1;
  if (niche.includes("fitness") || niche.includes("bien-être")) return 1.05;
  if (niche.includes("food") || niche.includes("recette")) return 0.92;
  if (niche.includes("développement")) return 0.96;
  return 1;
}

function followerBracketFromVisibleMetric(value?: string | null) {
  if (!value) return null;
  const normalized = value.toLowerCase().replace(/\s/g, "").replace(",", ".");
  const match = normalized.match(/[\d.]+/);
  if (!match) return null;
  let count = Number(match[0]);
  if (!Number.isFinite(count)) return null;
  if (normalized.includes("m")) count *= 1_000_000;
  else if (normalized.includes("k")) count *= 1_000;
  if (count >= 10_000) return "10000+";
  if (count >= 1_000) return "1000-10000";
  if (count >= 100) return "100-1000";
  return "0-100";
}

export type PersonalizedRevenueForecast = {
  monthlyLow: number;
  monthlyHigh: number;
  channel: string;
  niche: string;
  action: string;
  basis: string;
};

export function estimateProfileRevenue(
  profile: CreatorOnboardingProfile,
  visibleFollowers?: string | null
): PersonalizedRevenueForecast {
  const bracket = followerBracketFromVisibleMetric(visibleFollowers) || profile.followers || "0-100";
  const monetization = revenueScenarios[profile.monetization] ? profile.monetization : "affiliate";
  const base = revenueScenarios[monetization][bracket] || revenueScenarios[monetization]["0-100"];
  const factor = (cadenceFactor[profile.cadence] || 1) * nicheFactor(profile.nicheTopic);
  const monthlyLow = roundToTen(base[0] * factor);
  const monthlyHigh = Math.max(monthlyLow, roundToTen(base[1] * factor));

  return {
    monthlyLow,
    monthlyHigh,
    channel: channelLabels[monetization],
    niche: profile.nicheTopic || "Niche à préciser",
    action: channelActions[monetization],
    basis: `${followerLabels[bracket] || bracket} abonnés · cadence ${profile.cadence} par semaine`
  };
}

export function estimateRevenuePotential({
  followers,
  averageViews,
  monthlyPosts = 24
}: RevenueInputs): RevenueForecast {
  const monthlyViews = averageViews * monthlyPosts;
  const perThousandViews = monthlyViews / 1000;
  const followerUnits = followers / 10000;

  const channels = [
    {
      name: "Affiliation",
      monthlyLow: roundToTen(perThousandViews * 0.3),
      monthlyHigh: roundToTen(perThousandViews * 1.5),
      contentDirection: "Tutoriels, comparatifs et cas d'usage avec preuve a l'ecran.",
      conversionAction: "Un outil principal par serie, lien trace en bio."
    },
    {
      name: "Offre ou service",
      monthlyLow: roundToTen((monthlyViews / 100000) * 60),
      monthlyHigh: roundToTen((monthlyViews / 100000) * 250),
      contentDirection: "Audits, avant/apres et resolutions de problemes couteux.",
      conversionAction: "CTA vers audit, liste d'attente ou prise de rendez-vous."
    },
    {
      name: "Partenariats",
      monthlyLow: roundToTen(followerUnits * 80),
      monthlyHigh: roundToTen(followerUnits * 350),
      contentDirection: "Series identifiables avec audience et resultats repetables.",
      conversionAction: "Media kit base sur retention, sauvegardes et conversions."
    },
    {
      name: "TikTok Shop",
      monthlyLow: roundToTen(perThousandViews * 0.15),
      monthlyHigh: roundToTen(perThousandViews * 0.9),
      contentDirection: "Demonstrations produit, objections et LIVE shopping.",
      conversionAction: "Un produit coherent avec la niche, preuve avant promotion."
    }
  ];

  return {
    monthlyViews,
    monthlyLow: channels.reduce((total, channel) => total + channel.monthlyLow, 0),
    monthlyHigh: channels.reduce((total, channel) => total + channel.monthlyHigh, 0),
    disclaimer:
      "Scenario indicatif, pas une promesse. Les revenus dependent du pays, de l'offre, des commissions et de la conversion reelle.",
    channels
  };
}

export function buildEligibilityGoals(followers: number): EligibilityGoal[] {
  return [
    {
      id: "bio",
      title: "Lien site en bio",
      requirement: "1 000 abonnes ou compte Business enregistre",
      current: followers,
      target: 1000,
      status: followers >= 1000 ? "Seuil abonnés atteint" : "Seuil à atteindre",
      nextAction: "Preparer une page unique avec une offre et un suivi des clics.",
      icon: "link-outline"
    },
    {
      id: "live",
      title: "Acces TikTok LIVE",
      requirement: "18 ans et environ 1 000 abonnes selon la region",
      current: followers,
      target: 1000,
      status: followers >= 1000 ? "Followers OK, age et compte a verifier" : "Followers insuffisants",
      nextAction: "Verifier l'age, l'etat du compte puis programmer un LIVE test.",
      icon: "radio-outline"
    },
    {
      id: "shop",
      title: "TikTok Shop Creator",
      requirement: "Souvent 18 ans, identite, zone eligible et 1 000 abonnes en affiliation",
      current: followers,
      target: 1000,
      status: followers >= 1000 ? "Seuil indicatif atteint" : "Construire l'audience acheteuse",
      nextAction: "Verifier TikTok Studio > Monetisation > TikTok Shop for Creator.",
      icon: "bag-handle-outline"
    }
  ];
}
