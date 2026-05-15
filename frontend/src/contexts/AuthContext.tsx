import { createContext, useContext, useState, useEffect } from "react";
import type { AuthUser } from "@/types/auth";

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (jwt: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("jwt"));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });

  useEffect(() => {
    // Clear stale token on mount so an expired JWT doesn't keep the user stuck
    const stored = localStorage.getItem("jwt");
    if (stored && isTokenExpired(stored)) {
      localStorage.removeItem("jwt");
      localStorage.removeItem("auth_user");
      setToken(null);
      setUser(null);
    }

    function handleLogout() {
      localStorage.removeItem("jwt");
      localStorage.removeItem("auth_user");
      setToken(null);
      setUser(null);
    }
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, []);

  function login(jwt: string, userData: AuthUser) {
    localStorage.setItem("jwt", jwt);
    localStorage.setItem("auth_user", JSON.stringify(userData));
    setToken(jwt);
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("jwt");
    localStorage.removeItem("auth_user");
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!token && !isTokenExpired(token);

  return (
    <AuthContext.Provider value={{ token, user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
