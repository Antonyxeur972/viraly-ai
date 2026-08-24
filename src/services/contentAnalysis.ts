import type { ImagePickerAsset } from "expo-image-picker";

import { apiRequest } from "./api";
import { normalizeImageForVision } from "./imageUpload";

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
  source: "openai";
};

export async function requestContentAnalysis(
  type: "carousel",
  assets: ImagePickerAsset[]
): Promise<ContentAnalysisReport> {
  const body = new FormData();
  body.append("type", type);
  body.append("goal", "revenue");
  const normalizedAssets = await Promise.all(
    assets.map((asset, index) => normalizeImageForVision(asset, `carousel-${index + 1}`))
  );
  normalizedAssets.forEach((asset) => {
    body.append("assets[]", {
      uri: asset.uri,
      name: asset.name,
      type: asset.type
    } as unknown as Blob);
  });

  return apiRequest<ContentAnalysisReport>("/api/v1/content/analyze", {
    method: "POST",
    body
  });
}
