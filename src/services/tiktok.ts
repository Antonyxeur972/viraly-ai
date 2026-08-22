import { Linking } from "react-native";

const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";

export const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
  "user.info.stats",
  "video.list"
] as const;

export type TikTokConnectionConfig = {
  clientKey: string;
  redirectUri: string;
  state: string;
};

export function buildTikTokAuthorizeUrl(config: TikTokConnectionConfig) {
  const params = new URLSearchParams({
    client_key: config.clientKey,
    response_type: "code",
    scope: TIKTOK_SCOPES.join(","),
    redirect_uri: config.redirectUri,
    state: config.state
  });

  return `${TIKTOK_AUTH_BASE}?${params.toString()}`;
}

export type TikTokCallback = {
  connected: boolean;
  handle?: string;
  sessionId?: string;
  error?: string;
};

export function getTikTokConnectionEndpoint() {
  return process.env.EXPO_PUBLIC_TIKTOK_CONNECT_URL?.trim() || null;
}

export function getTikTokCallbackUrl() {
  return (
    process.env.EXPO_PUBLIC_TIKTOK_CALLBACK_URL?.trim() ||
    "viralyai://auth/tiktok"
  );
}

export async function beginTikTokConnection() {
  const endpoint = getTikTokConnectionEndpoint();

  if (!endpoint) {
    throw new Error(
      "Ajoute EXPO_PUBLIC_TIKTOK_CONNECT_URL vers le backend OAuth TikTok approuve."
    );
  }

  const params = new URLSearchParams({
    return_to: getTikTokCallbackUrl(),
    scopes: TIKTOK_SCOPES.join(",")
  });
  const separator = endpoint.includes("?") ? "&" : "?";
  await Linking.openURL(`${endpoint}${separator}${params.toString()}`);
}

export function parseTikTokCallback(url: string): TikTokCallback | null {
  if (!url.includes("auth/tiktok")) {
    return null;
  }

  const parsed = new URL(url);
  const error = parsed.searchParams.get("error");

  if (error) {
    return { connected: false, error };
  }

  const sessionId = parsed.searchParams.get("session");
  return {
    connected: Boolean(sessionId),
    handle: parsed.searchParams.get("handle") || undefined,
    sessionId: sessionId || undefined
  };
}

export type TikTokAccountSnapshot = {
  handle: string;
  avatarUrl?: string;
  followers: number;
  likes: number;
  videoCount: number;
};

export type TikTokVideoSnapshot = {
  id: string;
  title: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
};

export async function exchangeTikTokCode() {
  throw new Error(
    "Exchange TikTok OAuth codes on a backend so client secrets and refresh tokens never live in the mobile app."
  );
}
