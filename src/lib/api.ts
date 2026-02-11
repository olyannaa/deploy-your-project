import { mockApiFetch } from "./mockApi";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return mockApiFetch<T>(path, options);
}

export async function refreshSession() {
  return null;
}
