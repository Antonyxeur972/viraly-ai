import { Ionicons } from "@expo/vector-icons";

export type IconName = keyof typeof Ionicons.glyphMap;

export type CreatorMetric = {
  label: string;
  value: string;
  delta: string;
  accent: string;
};

export type TrendSignal = {
  title: string;
  insight: string;
  action: string;
  confidence: number;
  accent: string;
};

export type VideoMetric = {
  title: string;
  views: number;
  hookRate: number;
  retention: number;
  savesPerView: number;
  sharesPerView: number;
  revenueFit: number;
};

export type ContentIdea = {
  title: string;
  format: string;
  promise: string;
  searchPull: number;
  shareability: number;
  revenueFit: number;
  effort: "faible" | "moyen" | "eleve";
  tags: string[];
};

export type NicheOption = {
  name: string;
  audience: string;
  contentEdge: string;
  revenueAngle: string;
  score: number;
  saturation: "basse" | "moyenne" | "haute";
  firstSeries: string;
};

export type PostingSlot = {
  day: string;
  time: string;
  reason: string;
  priority: "A" | "B" | "C";
};

export type WeeklyCycleStep = {
  day: string;
  focus: string;
  action: string;
  icon: IconName;
  accent: string;
};

export type RevenuePath = {
  name: string;
  stage: string;
  nextAction: string;
  potential: string;
};

export type TikTokConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "error";

export type EligibilityGoal = {
  id: "bio" | "live" | "shop";
  title: string;
  requirement: string;
  current: number;
  target: number;
  status: string;
  nextAction: string;
  icon: IconName;
};

export type RevenueChannel = {
  name: string;
  monthlyLow: number;
  monthlyHigh: number;
  contentDirection: string;
  conversionAction: string;
};

export type RevenueForecast = {
  monthlyViews: number;
  monthlyLow: number;
  monthlyHigh: number;
  disclaimer: string;
  channels: RevenueChannel[];
};

export type CoachQuestion = {
  question: string;
  shortAnswer: string;
  action: string;
  icon: IconName;
};
