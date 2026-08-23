let sessionToken: string | null =
  process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;

const PRODUCTION_API_URL = "https://viraly-ai.onrender.com";

export function getApiBaseUrl() {
  return (
    process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ||
    PRODUCTION_API_URL
  );
}

export function setApiSessionToken(token?: string | null) {
  sessionToken = token?.trim() || null;
}

export async function createPreviewSession(): Promise<{ token: string; name: string }> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/auth/preview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" }
  });
  if (!response.ok) {
    let message = `Accès test indisponible (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the status-based error when the backend did not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<{ token: string; name: string }>;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!sessionToken) throw new Error("Reconnecte ton compte Google pour lancer cette analyse.");

  const headers = new Headers(options.headers);
  headers.set("Authorization", `Bearer ${sessionToken}`);
  if (options.body && !(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${baseUrl}${path}`, { ...options, headers });
  if (!response.ok) {
    let message = `Service indisponible (${response.status}).`;
    try {
      const payload = await response.json();
      message = payload.detail || message;
    } catch {
      // Keep the status-based error when the backend did not return JSON.
    }
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}
