import { CreatorOnboardingProfile } from "../types";
import { apiRequest } from "./api";

export type IdeaAnalysisReport = {
  score: number;
  summary: string;
  optimizedHook: string;
  scriptSteps: string[];
  audiencePromise: string;
  revenuePath: string;
  risks: string[];
  analysisId: string;
};

export type GeneratedIdea = {
  title: string;
  format: string;
  promise: string;
  score: number;
  revenuePath: string;
  effort: "faible" | "moyen" | "élevé";
};

export type CoachReport = {
  answer: string;
  why: string;
  actions: string[];
  calendarSuggestion: string | null;
  confidence: "faible" | "moyenne" | "élevée";
};

export type StrategyReport = {
  summary: string;
  niches: Array<{
    name: string;
    audience: string;
    edge: string;
    revenueAngle: string;
    score: number;
  }>;
  postingSlots: Array<{
    day: string;
    time: string;
    reason: string;
    testProtocol: string;
  }>;
  weeklyCycle: string[];
  storyPlan: string[];
  revenuePaths: Array<{
    name: string;
    nextAction: string;
    contentDirection: string;
    range: string;
    basis: string;
  }>;
};

export type CalendarEvent = {
  id: string;
  date: string;
  time: string;
  type: "video" | "carousel" | "story" | "live" | "research";
  title: string;
  hook: string;
  cta: string;
  status: "planned" | "ready" | "published" | "skipped";
  source: "manual" | "ai";
};

export type ContentPlan = {
  id: string;
  createdAt: string;
  summary: string;
  strategyDecision: string;
  contentMix: {
    videos: number;
    carousels: number;
    stories: number;
  };
  durationDays?: 7 | 14 | 30;
  startDate?: string;
  endDate?: string;
  postingSlots: Array<{
    dayOffset: number;
    date?: string;
    time: string;
    reason: string;
  }>;
  weeklyFocus: string[];
  events: CalendarEvent[];
  revenuePotentialAfter: string;
  profileSnapshot: CreatorOnboardingProfile;
  accountScore: number | null;
  source: "openai" | "anthropic" | "fallback_rules";
};

export type OnboardingAIReport = {
  score: number;
  summary: string;
  priorities: string[];
  cycle: string;
  firstWeek: string[];
  revenueDirection: string;
  analysisId: string;
};

type Context = object | null;

export function analyzeOnboarding(profile: CreatorOnboardingProfile) {
  return apiRequest<OnboardingAIReport>("/api/v1/onboarding/analyze", {
    method: "POST",
    body: JSON.stringify(profile)
  });
}

export function analyzeIdea(
  idea: string,
  profile: CreatorOnboardingProfile,
  accountContext: Context
) {
  return apiRequest<IdeaAnalysisReport>("/api/v1/ideas/analyze", {
    method: "POST",
    body: JSON.stringify({ idea, profile, account_context: accountContext })
  });
}

export async function generateIdeas(
  profile: CreatorOnboardingProfile,
  accountContext: Context,
  count = 4
) {
  const result = await apiRequest<{ ideas: GeneratedIdea[] }>("/api/v1/ideas/generate", {
    method: "POST",
    body: JSON.stringify({ profile, account_context: accountContext, count })
  });
  return result.ideas;
}

export function askCoach(
  question: string,
  profile: CreatorOnboardingProfile,
  accountContext: Context,
  strategyContext: ContentPlan | null = null
) {
  return apiRequest<CoachReport>("/api/v1/coach", {
    method: "POST",
    body: JSON.stringify({
      question,
      profile,
      account_context: accountContext,
      strategy_context: strategyContext
    })
  });
}

export async function listContentPlans(limit = 8) {
  const result = await apiRequest<{ plans: ContentPlan[] }>(`/api/v1/plans?limit=${limit}`);
  return result.plans;
}

export function generateContentPlan(
  profile: CreatorOnboardingProfile,
  accountContext: Context,
  startingDate: string,
  days: 7 | 14 | 30
) {
  return apiRequest<ContentPlan>("/api/v1/plans/generate", {
    method: "POST",
    body: JSON.stringify({
      profile,
      account_context: accountContext,
      starting_date: startingDate,
      days,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
    })
  });
}

export function getStrategy() {
  return apiRequest<StrategyReport>("/api/v1/strategy");
}

export function generateStrategy(
  profile: CreatorOnboardingProfile,
  accountContext: Context
) {
  return apiRequest<StrategyReport>("/api/v1/strategy/generate", {
    method: "POST",
    body: JSON.stringify({
      profile,
      account_context: accountContext,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Paris"
    })
  });
}

export async function getCalendarEvents() {
  const result = await apiRequest<{ events: CalendarEvent[] }>("/api/v1/calendar/events");
  return result.events;
}

export function createCalendarEvent(
  event: Omit<CalendarEvent, "id" | "source" | "status"> & {
    status?: CalendarEvent["status"];
    source?: CalendarEvent["source"];
  }
) {
  return apiRequest<CalendarEvent>("/api/v1/calendar/events", {
    method: "POST",
    body: JSON.stringify({ status: "planned", source: "manual", ...event })
  });
}

export async function generateCalendar(
  profile: CreatorOnboardingProfile,
  strategy: StrategyReport,
  startingDate: string
) {
  const result = await apiRequest<{ events: CalendarEvent[] }>("/api/v1/calendar/generate", {
    method: "POST",
    body: JSON.stringify({
      profile,
      strategy,
      starting_date: startingDate,
      days: 7
    })
  });
  return result.events;
}

export function updateCalendarEvent(
  eventId: string,
  update: Partial<Pick<CalendarEvent, "status" | "date" | "time" | "title" | "hook" | "cta" | "type">>
) {
  return apiRequest<CalendarEvent>(`/api/v1/calendar/events/${eventId}`, {
    method: "PATCH",
    body: JSON.stringify(update)
  });
}

export function deleteCalendarEvent(eventId: string) {
  return apiRequest<void>(`/api/v1/calendar/events/${eventId}`, { method: "DELETE" });
}
