import { readLocalState, writeLocalState } from "./localState";

const SUBSCRIPTION_STATE_KEY = "viraly_subscription_state_v1";
const WINBACK_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000;
const WINBACK_DURATION_MS = 30 * 60 * 1000;

export const subscriptionProducts = {
  monthly: "viraly_pro_monthly_1299",
  annual: "viraly_pro_annual_5900",
  annualWinback: "viraly_pro_annual_winback_2900"
} as const;

export type SubscriptionPlan = keyof typeof subscriptionProducts;

export type SubscriptionState = {
  entitled: boolean;
  source?: "google_play" | "tester";
  firstPaywallDismissedAt?: number;
  lastWinbackShownAt?: number;
  winbackExpiresAt?: number;
};

const initialState: SubscriptionState = { entitled: false };

export const internalTestingEnabled =
  process.env.EXPO_PUBLIC_BILLING_MODE?.trim().toLowerCase() !== "play";

export async function loadSubscriptionState() {
  return (await readLocalState<SubscriptionState>(SUBSCRIPTION_STATE_KEY)) || initialState;
}

async function updateSubscriptionState(patch: Partial<SubscriptionState>) {
  const current = await loadSubscriptionState();
  const next = { ...current, ...patch };
  await writeLocalState(SUBSCRIPTION_STATE_KEY, next);
  return next;
}

export function activateTesterAccess(code: string) {
  if (!internalTestingEnabled || code.trim() !== "Viralytest972") return Promise.resolve(false);
  return updateSubscriptionState({ entitled: true, source: "tester" }).then(() => true);
}

export function markPaywallDismissed() {
  return updateSubscriptionState({ firstPaywallDismissedAt: Date.now() });
}

export async function beginEligibleWinbackOffer() {
  const state = await loadSubscriptionState();
  if (state.entitled || !state.firstPaywallDismissedAt) return null;
  if (state.lastWinbackShownAt && Date.now() - state.lastWinbackShownAt < WINBACK_INTERVAL_MS) return null;
  const winbackExpiresAt = Date.now() + WINBACK_DURATION_MS;
  await updateSubscriptionState({ lastWinbackShownAt: Date.now(), winbackExpiresAt });
  return winbackExpiresAt;
}

export async function clearTesterAccess() {
  await writeLocalState(SUBSCRIPTION_STATE_KEY, initialState);
}
