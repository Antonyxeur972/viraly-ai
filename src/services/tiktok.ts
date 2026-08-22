const TIKTOK_AUTH_BASE = "https://www.tiktok.com/v2/auth/authorize/";

export const TIKTOK_SCOPES = [
  "user.info.basic",
  "user.info.profile",
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
