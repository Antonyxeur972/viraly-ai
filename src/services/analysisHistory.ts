import { apiRequest } from "./api";

export type AnalysisHistoryItem<T> = {
  id: string;
  kind: string;
  createdAt: string;
  report: T;
};

export async function listAnalysisHistory<T>(kind: "profile" | "content", limit = 12) {
  const result = await apiRequest<{ analyses: AnalysisHistoryItem<T>[] }>(
    `/api/v1/analyses?kind=${kind}&limit=${limit}`
  );
  return result.analyses;
}

export function deleteAnalysisHistory(analysisId: string) {
  return apiRequest<void>(`/api/v1/analyses/${analysisId}`, { method: "DELETE" });
}
