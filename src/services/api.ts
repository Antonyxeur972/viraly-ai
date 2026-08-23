let sessionToken: string | null =
  process.env.EXPO_PUBLIC_VIRALY_DEV_TOKEN?.trim() || null;

export function getApiBaseUrl() {
  return process.env.EXPO_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") || null;
}

export function setApiSessionToken(token?: string | null) {
  sessionToken = token?.trim() || null;
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) throw new Error("Le backend VIRALY AI n'est pas configuré.");
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

