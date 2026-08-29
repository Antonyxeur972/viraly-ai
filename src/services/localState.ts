import { Platform } from "react-native";

async function secureStore() {
  if (Platform.OS === "web") return null;
  try {
    return await import("expo-secure-store");
  } catch {
    return null;
  }
}

export async function readLocalState<T>(key: string): Promise<T | null> {
  const store = await secureStore();
  const value = store
    ? await store.getItemAsync(key)
    : typeof window !== "undefined"
      ? window.localStorage.getItem(key)
      : null;
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function writeLocalState<T>(key: string, value: T | null) {
  const store = await secureStore();
  if (store) {
    if (value === null) await store.deleteItemAsync(key);
    else await store.setItemAsync(key, JSON.stringify(value));
  }
  if (Platform.OS === "web" && typeof window !== "undefined") {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, JSON.stringify(value));
  }
}
