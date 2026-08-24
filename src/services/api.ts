import type { CreatorOnboardingProfile } from "../types";
import { Platform } from "react-native";

const SESSION_TOKEN_KEY = "viraly_session_token";
const CREATOR_PROFILE_KEY = "viraly_creator_profile";

let sessionToken: string | null =
  process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;
let memoryCreatorProfile: CreatorOnboardingProfile | null = null;

const PRODUCTION_API_URL = "https://viraly-ai.onrender.com";

export function getApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
    PRODUCTION_API_URL
  );
}

export function getApiSessionToken() {
  return sessionToken;
}

async function getSecureStore() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-secure-store");
  } catch {
    return null;
  }
}

function getWebItem(key: string) {
  if (Platform.OS !== "web" || typeof window === "undefined") return null;
  return window.localStorage.getItem(key);
}

function setWebItem(key: string, value?: string | null) {
  if (Platform.OS !== "web" || typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, value);
  else window.localStorage.removeItem(key);
}

export async function loadApiSessionToken() {
  const secureStore = await getSecureStore();
  const stored = secureStore ? await secureStore.getItemAsync(SESSION_TOKEN_KEY) : getWebItem(SESSION_TOKEN_KEY);
  sessionToken = stored?.trim() || process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;
  return sessionToken;
}

export function setApiSessionToken(token?: string | null) {
  sessionToken = token?.trim() || null;
  setWebItem(SESSION_TOKEN_KEY, sessionToken);
  getSecureStore()
    .then((secureStore) => {
      if (!secureStore) return;
      if (sessionToken) {
        secureStore.setItemAsync(SESSION_TOKEN_KEY, sessionToken).catch(() => {});
      } else {
        secureStore.deleteItemAsync(SESSION_TOKEN_KEY).catch(() => {});
      }
    })
    .catch(() => {});
}

export async function loadCreatorProfile() {
  if (sessionToken) {
    try {
      const response = await apiRequest<{ profile: CreatorOnboardingProfile | null }>("/api/v1/creator/profile");
      if (response.profile) {
        memoryCreatorProfile = response.profile;
        return response.profile;
      }
    } catch {
      // Fall back to local storage when the backend session is not ready.
    }
  }

  const secureStore = await getSecureStore();
  const stored = secureStore ? await secureStore.getItemAsync(CREATOR_PROFILE_KEY) : getWebItem(CREATOR_PROFILE_KEY);
  if (!stored) return memoryCreatorProfile;

  try {
    memoryCreatorProfile = JSON.parse(stored) as CreatorOnboardingProfile;
    return memoryCreatorProfile;
  } catch {
    if (secureStore) await secureStore.deleteItemAsync(CREATOR_PROFILE_KEY);
    setWebItem(CREATOR_PROFILE_KEY, null);
    return null;
  }
}

export async function saveCreatorProfile(profile: CreatorOnboardingProfile) {
  memoryCreatorProfile = profile;
  const secureStore = await getSecureStore();
  if (secureStore) {
    await secureStore.setItemAsync(CREATOR_PROFILE_KEY, JSON.stringify(profile));
  }
  setWebItem(CREATOR_PROFILE_KEY, JSON.stringify(profile));
  if (sessionToken) {
    await apiRequest("/api/v1/creator/profile", {
      method: "PUT",
      body: JSON.stringify(profile)
    });
  }
}

export async function clearCreatorProfile() {
  memoryCreatorProfile = null;
  const secureStore = await getSecureStore();
  if (secureStore) await secureStore.deleteItemAsync(CREATOR_PROFILE_KEY);
  setWebItem(CREATOR_PROFILE_KEY, null);
  if (sessionToken) {
    await apiRequest("/api/v1/creator/profile", { method: "DELETE" });
  }
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
