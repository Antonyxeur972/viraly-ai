import type { ImagePickerAsset } from "expo-image-picker";

import { apiRequest } from "./api";

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
};

export async function requestContentAnalysis(
  type: "video" | "carousel",
  assets: ImagePickerAsset[]
): Promise<ContentAnalysisReport> {
  const body = new FormData();
  body.append("type", type);
  body.append("goal", "revenue");
  assets.forEach((asset, index) => {
    body.append("assets[]", {
      uri: asset.uri,
      name: asset.fileName || `${type}-${index + 1}`,
      type: asset.mimeType || (type === "video" ? "video/mp4" : "image/jpeg")
    } as unknown as Blob);
  });

  return apiRequest<ContentAnalysisReport>("/api/v1/content/analyze", {
    method: "POST",
    body
  });
}
