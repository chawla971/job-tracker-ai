import type { AuthResponse } from "@/types/auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const authService = {
  googleLogin: async (credential: string): Promise<AuthResponse> => {
    const res = await fetch(`${BASE}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Login failed" }));
      throw new Error(err.detail ?? "Login failed");
    }
    return res.json();
  },
};
