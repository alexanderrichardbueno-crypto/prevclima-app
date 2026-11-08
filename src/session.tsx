import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import { useColorScheme } from "react-native";

import { ApiError, loadStoredSession, request, saveSession, setUnauthorizedHandler, type AuthResponse, type User } from "./api";
import { palettes, type Palette } from "./theme";

type Status = "loading" | "signedOut" | "guest" | "signedIn";

type SessionValue = {
  status: Status;
  user: User | null;
  colors: Palette;
  isDark: boolean;
  unreadAlerts: number;
  setUnreadAlerts: (count: number) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; city: string | null; state: string | null }) => Promise<void>;
  continueAsGuest: () => void;
  logout: () => Promise<void>;
  updateUser: (changes: Partial<User>) => Promise<User>;
  setDarkTheme: (dark: boolean) => Promise<void>;
  refreshUser: () => Promise<void>;
};

const THEME_KEY = "prevclima_theme";

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUser] = useState<User | null>(null);
  const [unreadAlerts, setUnreadAlerts] = useState(0);
  const [themeChoice, setThemeChoice] = useState<"dark" | "light" | null>(null);

  const clear = useCallback(async () => {
    await saveSession(null, null);
    setUser(null);
    setUnreadAlerts(0);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void clear();
    });
    void SecureStore.getItemAsync(THEME_KEY)
      .then((saved) => setThemeChoice(saved === "dark" || saved === "light" ? saved : null))
      .catch(() => undefined);
    (async () => {
      const { hasToken } = await loadStoredSession();
      if (!hasToken) return setStatus("signedOut");
      try {
        const result = await request<AuthResponse>("/auth/me");
        setUser(result.user);
        setStatus("signedIn");
      } catch (error) {
        // Sem conexão: mantém o token e deixa navegar como visitante até reconectar.
        if (error instanceof ApiError && error.status === 0) setStatus("guest");
        else await clear();
      }
    })();
    return () => setUnauthorizedHandler(null);
  }, [clear]);

  const login = useCallback(async (email: string, password: string) => {
    // Meteorologistas também entram e navegam como um usuário comum.
    const result = await request<AuthResponse>("/auth/login-app", {
      method: "POST",
      body: { email: email.trim(), password },
      auth: false,
    });
    if (!result.access_token) throw new ApiError("Atualize o backend do PrevClima para usar o aplicativo.", 500);
    await saveSession(result.access_token, result.csrf_token);
    setUser(result.user);
    setStatus("signedIn");
  }, []);

  const register = useCallback<SessionValue["register"]>(
    async (data) => {
      await request("/auth/register", { method: "POST", body: { ...data, email: data.email.trim() }, auth: false });
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {
      // Mesmo offline, a sessão local é apagada.
    }
    await clear();
  }, [clear]);

  const updateUser = useCallback(async (changes: Partial<User>) => {
    const updated = await request<User>("/users/me", { method: "PATCH", body: changes });
    setUser(updated);
    return updated;
  }, []);

  const setDarkTheme = useCallback(
    async (dark: boolean) => {
      const choice = dark ? "dark" : "light";
      setThemeChoice(choice);
      void SecureStore.setItemAsync(THEME_KEY, choice).catch(() => undefined);
      if (!user) return;
      const previous = user;
      setUser({ ...user, dark_theme: dark });
      try {
        setUser(await request<User>("/users/me", { method: "PATCH", body: { dark_theme: dark } }));
      } catch (error) {
        setUser(previous);
        throw error;
      }
    },
    [user],
  );

  const refreshUser = useCallback(async () => {
    if (status !== "signedIn") return;
    setUser(await request<User>("/users/me"));
  }, [status]);

  const isDark = user ? user.dark_theme : themeChoice ? themeChoice === "dark" : scheme !== "light";

  const value = useMemo<SessionValue>(
    () => ({
      status,
      user,
      colors: isDark ? palettes.dark : palettes.light,
      isDark,
      unreadAlerts,
      setUnreadAlerts,
      login,
      register,
      continueAsGuest: () => setStatus("guest"),
      logout,
      updateUser,
      setDarkTheme,
      refreshUser,
    }),
    [status, user, isDark, unreadAlerts, login, register, logout, updateUser, setDarkTheme, refreshUser],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession fora do SessionProvider");
  return value;
}
