import { Linking } from "react-native";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights"
] as const;

export type InstagramCallback = {
  connected: boolean;
  handle?: string;
  sessionId?: string;
  error?: string;
};

export function getInstagramConnectionEndpoint() {
  return process.env.EXPO_PUBLIC_INSTAGRAM_CONNECT_URL?.trim() || null;
}

export function getInstagramCallbackUrl() {
  return process.env.EXPO_PUBLIC_INSTAGRAM_CALLBACK_URL?.trim() || "viralyai://auth/instagram";
}

export async function beginInstagramConnection() {
  const endpoint = getInstagramConnectionEndpoint();
  if (!endpoint) {
    throw new Error("Ajoute EXPO_PUBLIC_INSTAGRAM_CONNECT_URL vers le backend OAuth Instagram approuvé.");
  }

  const params = new URLSearchParams({
    return_to: getInstagramCallbackUrl(),
    scopes: INSTAGRAM_SCOPES.join(",")
  });
  const separator = endpoint.includes("?") ? "&" : "?";
  await Linking.openURL(`${endpoint}${separator}${params.toString()}`);
}

export function parseInstagramCallback(url: string): InstagramCallback | null {
  if (!url.includes("auth/instagram")) return null;

  const parsed = new URL(url);
  const error = parsed.searchParams.get("error");
  if (error) return { connected: false, error };

  const sessionId = parsed.searchParams.get("session");
  return {
    connected: Boolean(sessionId),
    handle: parsed.searchParams.get("handle") || undefined,
    sessionId: sessionId || undefined
  };
}
