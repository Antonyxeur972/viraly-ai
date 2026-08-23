import type { ImagePickerAsset } from "expo-image-picker";

export type ProfileAnalysisReport = {
  score: number;
  confidence: "faible" | "moyenne" | "forte";
  summary: string;
  visibleSignals: string[];
  priorities: string[];
};

export function getProfileAnalysisEndpoint() {
  return process.env.EXPO_PUBLIC_PROFILE_ANALYSIS_URL?.trim() || null;
}

export async function requestProfileAnalysis(
  screenshot: ImagePickerAsset
): Promise<ProfileAnalysisReport | null> {
  const endpoint = getProfileAnalysisEndpoint();

  if (!endpoint) return null;

  const body = new FormData();
  body.append("source", "tiktok_profile_screenshot");
  body.append("screenshot", {
    uri: screenshot.uri,
    name: screenshot.fileName || "tiktok-profile.jpg",
    type: screenshot.mimeType || "image/jpeg"
  } as unknown as Blob);

  const response = await fetch(endpoint, { method: "POST", body });

  if (!response.ok) {
    throw new Error(`Analyse du profil indisponible (${response.status}).`);
  }

  return response.json() as Promise<ProfileAnalysisReport>;
}
