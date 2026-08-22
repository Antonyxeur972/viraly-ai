import {
  CoachQuestion,
  ContentIdea,
  CreatorMetric,
  NicheOption,
  PostingSlot,
  RevenuePath,
  TrendSignal,
  VideoMetric,
  WeeklyCycleStep
} from "../types";
import { palette } from "../theme";

export const creatorProfile = {
  name: "Createur demo",
  handle: "@viraly.creator",
  niche: "Business IA pour createurs",
  stage: "traction",
  followers: 18420,
  growthScore: 78,
  summary:
    "Ton compte a deja un signal clair : les videos qui promettent un gain concret en moins de 30 secondes generent plus de sauvegardes."
};

export const accountMetrics: CreatorMetric[] = [
  {
    label: "Croissance 7j",
    value: "+12.4%",
    delta: "2 videos ont tire 68% des nouveaux abonnes",
    accent: palette.mint
  },
  {
    label: "Vues moy.",
    value: "48k",
    delta: "au-dessus de la base compte",
    accent: palette.sky
  },
  {
    label: "Sauvegardes",
    value: "4.8%",
    delta: "fort potentiel lead magnet",
    accent: palette.lemon
  },
  {
    label: "Revenus",
    value: "3 pistes",
    delta: "affiliation, audit, template",
    accent: palette.coral
  }
];

export const trendSignals: TrendSignal[] = [
  {
    title: "Les hooks chiffres battent les hooks vagues",
    insight: "Tes ouvertures avec un resultat mesurable retiennent 23% de plus.",
    action: "Commence par un chiffre, puis montre l'avant/apres.",
    confidence: 88,
    accent: palette.mint
  },
  {
    title: "Le format checklist cree des sauvegardes",
    insight: "Les contenus en 3 a 5 points declenchent plus d'enregistrements.",
    action: "Transforme chaque astuce en mini SOP que l'audience garde.",
    confidence: 82,
    accent: palette.lemon
  },
  {
    title: "Le commentaire mining donne des idees chaudes",
    insight: "Les questions simples dans les commentaires deviennent des scripts courts.",
    action: "Reponds a 3 commentaires par video avec une nouvelle video.",
    confidence: 74,
    accent: palette.coral
  }
];

export const recentVideos: VideoMetric[] = [
  {
    title: "3 prompts IA pour trouver une niche TikTok",
    views: 142800,
    hookRate: 86,
    retention: 72,
    savesPerView: 0.061,
    sharesPerView: 0.024,
    revenueFit: 84
  },
  {
    title: "J'ai teste 5 heures de publication",
    views: 68100,
    hookRate: 73,
    retention: 61,
    savesPerView: 0.038,
    sharesPerView: 0.017,
    revenueFit: 66
  },
  {
    title: "La verite sur les niches saturees",
    views: 39100,
    hookRate: 64,
    retention: 57,
    savesPerView: 0.029,
    sharesPerView: 0.011,
    revenueFit: 72
  }
];

export const postingSlots: PostingSlot[] = [
  {
    day: "Mercredi",
    time: "09:10",
    reason: "Bon moment pour contenu educatif court avant la journee de travail.",
    priority: "A"
  },
  {
    day: "Jeudi",
    time: "19:20",
    reason: "Fenetre forte pour sujets revenus, outils et decisions d'achat.",
    priority: "A"
  },
  {
    day: "Vendredi",
    time: "12:35",
    reason: "Ideal pour relancer une serie ou poster un recap actionnable.",
    priority: "B"
  },
  {
    day: "Dimanche",
    time: "20:00",
    reason: "A tester seulement pour planification, story et contenus personnels.",
    priority: "C"
  }
];

export const contentIdeas: ContentIdea[] = [
  {
    title: "J'analyse un compte TikTok en 60 secondes",
    format: "audit face camera + screen recording",
    promise: "Le spectateur repart avec une grille simple pour corriger son compte.",
    searchPull: 82,
    shareability: 79,
    revenueFit: 88,
    effort: "moyen",
    tags: ["audit", "compte", "croissance"]
  },
  {
    title: "Les 5 erreurs qui tuent tes vues apres 300 vues",
    format: "liste rapide avec exemples visuels",
    promise: "Comprendre pourquoi une video ne sort pas du premier test.",
    searchPull: 76,
    shareability: 86,
    revenueFit: 74,
    effort: "faible",
    tags: ["retention", "hook", "erreurs"]
  },
  {
    title: "Je transforme une passion en niche monetisable",
    format: "avant/apres + tableau de choix",
    promise: "Aider a choisir un angle qui attire une audience acheteuse.",
    searchPull: 88,
    shareability: 73,
    revenueFit: 91,
    effort: "moyen",
    tags: ["niche", "revenus", "strategie"]
  },
  {
    title: "Une semaine de posts pour vendre sans etre lourd",
    format: "calendrier montre a l'ecran",
    promise: "Publier regulierement tout en gardant une vraie valeur.",
    searchPull: 71,
    shareability: 80,
    revenueFit: 86,
    effort: "faible",
    tags: ["calendrier", "vente", "routine"]
  }
];

export const nicheOptions: NicheOption[] = [
  {
    name: "IA pratique pour createurs",
    audience: "createurs solo, freelances, infopreneurs",
    contentEdge: "montrer des workflows reels plutot que des listes d'outils",
    revenueAngle: "templates, formations courtes, affiliation outils",
    score: 89,
    saturation: "moyenne",
    firstSeries: "30 jours pour automatiser une activite de createur"
  },
  {
    name: "TikTok business local",
    audience: "restaurants, coachs, artisans, commerces",
    contentEdge: "audits concrets de comptes locaux et scripts simples",
    revenueAngle: "audit payant, gestion de contenu, packs scripts",
    score: 84,
    saturation: "basse",
    firstSeries: "1 commerce local, 3 videos qui peuvent vendre"
  },
  {
    name: "Productivite createur",
    audience: "etudiants, salaries createurs, solopreneurs",
    contentEdge: "systemes de publication realistes avec peu de temps",
    revenueAngle: "notion kits, coaching, newsletter premium",
    score: 78,
    saturation: "haute",
    firstSeries: "Poster tous les jours sans y passer la journee"
  }
];

export const weeklyCycle: WeeklyCycleStep[] = [
  {
    day: "Lundi",
    focus: "Recherche",
    action: "Lire 30 commentaires, noter 10 douleurs, choisir 3 angles.",
    icon: "search-outline",
    accent: palette.sky
  },
  {
    day: "Mardi",
    focus: "Production",
    action: "Filmer 4 videos courtes avec hooks differents.",
    icon: "camera-outline",
    accent: palette.coral
  },
  {
    day: "Mercredi",
    focus: "Publication A",
    action: "Poster le meilleur contenu educatif et repondre vite aux commentaires.",
    icon: "rocket-outline",
    accent: palette.mint
  },
  {
    day: "Jeudi",
    focus: "Conversion",
    action: "Poster un cas concret avec appel vers profil, lien ou DM.",
    icon: "cash-outline",
    accent: palette.lemon
  },
  {
    day: "Vendredi",
    focus: "Recyclage",
    action: "Transformer le gagnant de la semaine en carrousel, story et script bis.",
    icon: "repeat-outline",
    accent: palette.violet
  }
];

export const revenuePaths: RevenuePath[] = [
  {
    name: "Lead magnet",
    stage: "a activer maintenant",
    nextAction: "Offrir une checklist gratuite liee a la video la plus sauvegardee.",
    potential: "emails + DM entrants"
  },
  {
    name: "Affiliate stack",
    stage: "a tester",
    nextAction: "Recommander seulement les outils deja utilises dans les tutoriels.",
    potential: "revenu recurrent"
  },
  {
    name: "Audit express",
    stage: "fort signal",
    nextAction: "Vendre un audit video de 15 minutes sur les comptes des abonnes.",
    potential: "cash rapide"
  }
];

export const videoChecklist = [
  "Une promesse visible ou dite dans les 2 premieres secondes",
  "Un changement visuel avant la seconde 4",
  "Une raison claire d'enregistrer la video",
  "Un exemple concret, pas seulement une opinion",
  "Un appel a l'action lie au revenu ou au trafic"
];

export const storyPlays = [
  "Avant de poster : tease le sujet avec un sondage simple.",
  "Apres 30 minutes : partage la video en story avec une question.",
  "Le lendemain : montre un commentaire ou un resultat obtenu."
];

export const coachQuestions: CoachQuestion[] = [
  {
    question: "Quelle est la meilleure heure pour poster ?",
    shortAnswer:
      "Commence avec mercredi matin et jeudi soir, puis laisse VIRALY AI ajuster avec tes donnees.",
    action: "Teste 3 creneaux fixes pendant 14 jours avant de conclure.",
    icon: "time-outline"
  },
  {
    question: "Combien de videos poster ?",
    shortAnswer:
      "Pour une phase de croissance, vise 1 a 2 videos par jour si la qualite du hook reste correcte.",
    action: "Produis en batch 6 videos, puis publie selon le cycle hebdo.",
    icon: "albums-outline"
  },
  {
    question: "Est-ce utile de poster des stories ?",
    shortAnswer:
      "Oui si elles nourrissent la relation : coulisses, sondages, preuve sociale, relance de video.",
    action: "Ajoute 2 stories autour de chaque video importante.",
    icon: "phone-portrait-outline"
  },
  {
    question: "Faut-il regarder, liker et enregistrer des posts ?",
    shortAnswer:
      "Fais-le comme recherche marche, pas comme rituel magique. L'objectif est de comprendre les formats qui marchent.",
    action: "Sauvegarde 10 videos par niche et note leur hook, promesse, preuve et CTA.",
    icon: "bookmark-outline"
  },
  {
    question: "Comment choisir une niche ?",
    shortAnswer:
      "Choisis l'intersection entre competence, audience douloureuse, preuve possible et revenu evident.",
    action: "Garde la niche qui peut produire 30 idees sans forcer.",
    icon: "compass-outline"
  }
];
