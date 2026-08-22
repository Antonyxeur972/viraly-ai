import type { ImagePickerAsset } from "expo-image-picker";

export type ContentAnalysisReport = {
  score: number;
  summary: string;
  revenueCta: string;
  improvements: string[];
};

export function getContentAnalysisEndpoint() {
  return process.env.EXPO_PUBLIC_CONTENT_ANALYSIS_URL?.trim() || null;
}

export async function requestContentAnalysis(
  type: "video" | "carousel",
  assets: ImagePickerAsset[]
): Promise<ContentAnalysisReport | null> {
  const endpoint = getContentAnalysisEndpoint();

  if (!endpoint) return null;

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

  const response = await fetch(endpoint, { method: "POST", body });

  if (!response.ok) {
    throw new Error(`Analyse indisponible (${response.status}).`);
  }

  return response.json() as Promise<ContentAnalysisReport>;
}
