import { Linking } from "react-native";

export type GoogleCallback = {
  connected: boolean;
  email?: string;
  name?: string;
  sessionId?: string;
  error?: string;
};

export function getGoogleConnectionEndpoint() {
  return process.env.EXPO_PUBLIC_GOOGLE_CONNECT_URL?.trim() || null;
}

export function getGoogleCallbackUrl() {
  return (
    process.env.EXPO_PUBLIC_GOOGLE_CALLBACK_URL?.trim() ||
    "viralyai://auth/google"
  );
}

export async function beginGoogleConnection() {
  const endpoint = getGoogleConnectionEndpoint();

  if (!endpoint) {
    throw new Error(
      "La connexion Google sera active des que le backend OAuth VIRALY AI sera configure."
    );
  }

  const params = new URLSearchParams({ return_to: getGoogleCallbackUrl() });
  const separator = endpoint.includes("?") ? "&" : "?";
  await Linking.openURL(`${endpoint}${separator}${params.toString()}`);
}

export function parseGoogleCallback(url: string): GoogleCallback | null {
  if (!url.includes("auth/google")) return null;

  const parsed = new URL(url);
  const error = parsed.searchParams.get("error");

  if (error) return { connected: false, error };

  const sessionId = parsed.searchParams.get("session");
  return {
    connected: Boolean(sessionId),
    email: parsed.searchParams.get("email") || undefined,
    name: parsed.searchParams.get("name") || undefined,
    sessionId: sessionId || undefined
  };
}
