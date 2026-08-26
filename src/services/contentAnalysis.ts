import type { ImagePickerAsset } from "expo-image-picker";

import { apiRequest } from "./api";
import { createHistoryThumbnail, normalizeImageForVision } from "./imageUpload";
import { SocialPlatform } from "../types";

export type ContentAnalysisReport = {
  score: number;
  summary: string;
  revenueCta: string;
  improvements: string[];
  dimensions: Array<{
    name: string;
    score: number;
    evidence: string;
    action: string;
  }>;
  revisedHook: string;
  storyboard: string[];
  revenuePotential: {
    level: "faible" | "moyen" | "élevé";
    path: string;
    basis: string;
  };
  analysisId: string;
  transcriptAvailable: boolean;
  source: "openai" | "anthropic";
  assetCount?: number;
  historyTitle?: string;
  thumbnail?: string | null;
};

export async function requestContentAnalysis(
  type: "carousel",
  assets: ImagePickerAsset[],
  platform: SocialPlatform = "tiktok"
): Promise<ContentAnalysisReport> {
  const body = new FormData();
  body.append("type", type);
  body.append("goal", "revenue");
  body.append("platform", platform);
  const [normalizedAssets, thumbnail] = await Promise.all([
    Promise.all(assets.map((asset, index) => normalizeImageForVision(asset, `carousel-${index + 1}`))),
    createHistoryThumbnail(assets[0], "carousel-cover")
  ]);
  normalizedAssets.forEach((asset) => {
    body.append("assets[]", {
      uri: asset.uri,
      name: asset.name,
      type: asset.type
    } as unknown as Blob);
  });
  body.append("thumbnail", {
    uri: thumbnail.uri,
    name: thumbnail.name,
    type: thumbnail.type
  } as unknown as Blob);

  return apiRequest<ContentAnalysisReport>("/api/v1/content/analyze", {
    method: "POST",
    body
  });
}
