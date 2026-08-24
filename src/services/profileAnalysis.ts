import type { ImagePickerAsset } from "expo-image-picker";

import { apiRequest } from "./api";
import { normalizeImageForVision } from "./imageUpload";

export type ProfileAnalysisReport = {
  score: number;
  confidence: "faible" | "moyenne" | "élevée";
  summary: string;
  visibleSignals: string[];
  priorities: string[];
  metrics: {
    followers: string | null;
    likes: string | null;
    videos: string | null;
    bio: string | null;
    handle: string | null;
  };
  accountPositioning: string;
  revenueReadiness: string;
  nextAction: string;
  analysisId: string;
  authenticatedTikTokData: boolean;
  source: "openai";
};

export async function requestProfileAnalysis(
  screenshot: ImagePickerAsset
): Promise<ProfileAnalysisReport> {
  const normalized = await normalizeImageForVision(screenshot, "tiktok-profile");
  const body = new FormData();
  body.append("source", "tiktok_profile_screenshot");
  body.append("screenshot", {
    uri: normalized.uri,
    name: normalized.name,
    type: normalized.type
  } as unknown as Blob);

  return apiRequest<ProfileAnalysisReport>("/api/v1/profile/analyze", {
    method: "POST",
    body
  });
}
