import { EligibilityGoal, RevenueForecast } from "../types";

type RevenueInputs = {
  followers: number;
  averageViews: number;
  monthlyPosts?: number;
};

const roundToTen = (value: number) => Math.max(0, Math.round(value / 10) * 10);

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
