import { CreatorOnboardingProfile } from "../types";
import { readLocalState, writeLocalState } from "./localState";

const ONBOARDING_DRAFT_KEY = "viraly_onboarding_draft_v2";

export type OnboardingDraft = {
  step: number;
  answers: Partial<CreatorOnboardingProfile>;
  customNiche: string;
  phase?: "questions" | "profile" | "notifications";
};

export function loadOnboardingDraft() {
  return readLocalState<OnboardingDraft>(ONBOARDING_DRAFT_KEY);
}

export function saveOnboardingDraft(draft: OnboardingDraft) {
  return writeLocalState(ONBOARDING_DRAFT_KEY, draft);
}

export function clearOnboardingDraft() {
  return writeLocalState(ONBOARDING_DRAFT_KEY, null);
}
