import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

import { getApiBaseUrl } from "./api";

WebBrowser.maybeCompleteAuthSession();

export type GoogleCallback = {
  connected: boolean;
  email?: string;
  name?: string;
  code?: string;
  error?: string;
};

export function getGoogleConnectionEndpoint() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_CONNECT_URL?.trim() ||
    `${getApiBaseUrl()}/api/v1/auth/google/start`
  );
}

export function getGoogleCallbackUrl() {
  return process.env.EXPO_PUBLIC_GOOGLE_CALLBACK_URL?.trim() || makeRedirectUri({
    scheme: "viralyai",
    path: "auth/google"
  });
}

export async function beginGoogleConnection(): Promise<GoogleCallback> {
  const endpoint = getGoogleConnectionEndpoint();
  const callbackUrl = getGoogleCallbackUrl();
  const params = new URLSearchParams({ return_to: callbackUrl });
  const separator = endpoint.includes("?") ? "&" : "?";
  const result = await WebBrowser.openAuthSessionAsync(
    `${endpoint}${separator}${params.toString()}`,
    callbackUrl
  );
  if (result.type !== "success") {
    return { connected: false, error: "Connexion Google annulée." };
  }
  return parseGoogleCallback(result.url) || {
    connected: false,
    error: "Retour Google invalide."
  };
}

export function parseGoogleCallback(url: string): GoogleCallback | null {
  if (!url.includes("auth/google")) return null;

  const parsed = new URL(url);
  const error = parsed.searchParams.get("error");

  if (error) return { connected: false, error };

  const code = parsed.searchParams.get("code");
  return {
    connected: Boolean(code),
    email: parsed.searchParams.get("email") || undefined,
    name: parsed.searchParams.get("name") || undefined,
    code: code || undefined
  };
}

export async function exchangeGoogleCode(code: string) {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/google/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });
  if (!response.ok) {
    let message = "Impossible de créer la session Google.";
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the generic error when the backend did not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<{ token: string; email: string; name: string }>;
}
