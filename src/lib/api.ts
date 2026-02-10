import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setStoredUser,
  setTokens,
} from "./auth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const buildHeaders = (token?: string | null) => {
    const headers = new Headers(options.headers || {});
    headers.set("Content-Type", "application/json");
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  };

  const makeRequest = (token?: string | null) =>
    fetch(`${API_URL}${path}`, {
      ...options,
      headers: buildHeaders(token),
    });

  let response = await makeRequest(getAccessToken());

  if (response.status === 401) {
    const refreshed = await refreshSession();
    if (refreshed?.accessToken) {
      response = await makeRequest(refreshed.accessToken);
    } else {
      clearTokens();
      setStoredUser(null);
    }
  }

  if (!response.ok) {
    let message = "Ошибка запроса";
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json().catch(() => null);
      message = data?.message || data?.error || message;
    } else {
      const text = await response.text();
      if (text) {
        message = text;
      }
    }
    throw new Error(message);
  }

  return response.json();
}

export async function refreshSession() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }
  const response = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ refreshToken }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  setTokens(data.accessToken, data.refreshToken);
  if (data.user) {
    setStoredUser(data.user);
  }
  return data;
}
