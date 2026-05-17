const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

function authHeaders(isFormData = false): Record<string, string> {
  const token = localStorage.getItem("jwt");
  const headers: Record<string, string> = {};
  if (!isFormData) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return headers;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (res.status === 401) {
    localStorage.removeItem("jwt");
    localStorage.removeItem("auth_user");
    window.dispatchEvent(new CustomEvent("auth:logout"));
    throw new Error("Session expired. Please sign in again.");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Unknown error" }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(path: string): Promise<T> =>
    fetch(`${BASE}${path}`, { headers: authHeaders() }).then((r) => handleResponse<T>(r)),

  post: <T>(path: string, data?: unknown): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: authHeaders(),
      body: data !== undefined ? JSON.stringify(data) : undefined,
    }).then((r) => handleResponse<T>(r)),

  put: <T>(path: string, data: unknown): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: "PUT",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<T>(r)),

  patch: <T>(path: string, data: unknown): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: "PATCH",
      headers: authHeaders(),
      body: JSON.stringify(data),
    }).then((r) => handleResponse<T>(r)),

  delete: (path: string): Promise<void> =>
    fetch(`${BASE}${path}`, { method: "DELETE", headers: authHeaders() }).then((r) =>
      handleResponse<void>(r)
    ),

  postForm: <T>(path: string, formData: FormData): Promise<T> =>
    fetch(`${BASE}${path}`, {
      method: "POST",
      headers: authHeaders(true),
      body: formData,
    }).then((r) => handleResponse<T>(r)),
};
