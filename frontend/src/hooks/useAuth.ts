import { useState, useCallback } from "react";
import { login as apiLogin } from "../api/client";
import { AuthToken } from "../types";

export function useAuth() {
  const [user, setUser] = useState<AuthToken | null>(() => {
    try {
      const s = localStorage.getItem("user");
      return s ? JSON.parse(s) : null;
    } catch {
      return null;
    }
  });

  const login = useCallback(async (username: string, password: string) => {
    const { data } = await apiLogin(username, password);
    localStorage.setItem("token", data.access_token);
    localStorage.setItem("user", JSON.stringify(data));
    setUser(data);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
  }, []);

  return { user, login, logout, isAuthenticated: !!user };
}
