import * as SecureStore from "expo-secure-store";

import type { CreatorOnboardingProfile } from "../types";

const SESSION_TOKEN_KEY = "viraly_session_token";
const CREATOR_PROFILE_KEY = "viraly_creator_profile";

let sessionToken: string | null =
  process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;

const PRODUCTION_API_URL = "https://viraly-ai.onrender.com";

export function getApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
    PRODUCTION_API_URL
  );
}

export async function loadApiSessionToken() {
  const stored = await SecureStore.getItemAsync(SESSION_TOKEN_KEY);
  sessionToken = stored?.trim() || process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;
  return sessionToken;
}

export function setApiSessionToken(token?: string | null) {
  sessionToken = token?.trim() || null;
  if (sessionToken) {
    SecureStore.setItemAsync(SESSION_TOKEN_KEY, sessionToken).catch(() => {});
  } else {
    SecureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => {});
  }
}

export async function loadCreatorProfile() {
  const stored = await SecureStore.getItemAsync(CREATOR_PROFILE_KEY);
  if (!stored) return null;

  try {
    return JSON.parse(stored) as CreatorOnboardingProfile;
  } catch {
    await SecureStore.deleteItemAsync(CREATOR_PROFILE_KEY);
    return null;
  }
}

export async function saveCreatorProfile(profile: CreatorOnboardingProfile) {
  await SecureStore.setItemAsync(CREATOR_PROFILE_KEY, JSON.stringify(profile));
}

export async function clearCreatorProfile() {
  await SecureStore.deleteItemAsync(CREATOR_PROFILE_KEY);
}

export async function createPreviewSession(): Promise<{ token: string; name: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    let message = `Accès test indisponible (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the status-based error when the backend did not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<{ token: string; name: string }>;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!sessionToken) throw new Error("Reconnecte ton compte Google pour lancer cette analyse.");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${sessionToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Service indisponible (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the status-based error when the backend did not return JSON.
    }
    if (response.status === 401) {
      setApiSessionToken(null);
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
