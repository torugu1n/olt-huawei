import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "light" | "dark";
type Locale = "pt" | "en";

type MessageValue = string | ((params?: Record<string, string | number>) => string);

interface UISettingsContextValue {
  theme: ThemeMode;
  locale: Locale;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const UISettingsContext = createContext<UISettingsContextValue | null>(null);

const THEME_KEY = "olt_theme";
const LOCALE_KEY = "olt_locale";

const messages: Record<Locale, Record<string, MessageValue>> = {
  pt: {
    "skip.content": "Pular para o conteúdo",
    "app.title": "Huawei MA5800-X2",
    "app.subtitle": "Secretaria da Administração",
    "search.placeholder": "Buscar ONT, serial, PON ou alarmes...",
    "session.label": "Sessão",
    "sidebar.collapse": "Recolher barra lateral",
    "sidebar.expand": "Expandir barra lateral",
    "nav.dashboard": "Dashboard",
    "nav.alarms": "Alarmes",
    "nav.onts": "ONTs registradas",
    "nav.autofind": "Autofind",
    "nav.provision": "Provisionar ONT",
    "nav.terminal": "Terminal",
    "nav.audit": "Logs",
    "nav.users": "Usuários",
    "group.operations": "Operação",
    "group.management": "Gestão",
    "group.admin": "Administração",
    "logout": "Sair",
    "dashboard.title": "Dashboard",
    "dashboard.kicker": "Painel de operação",
    "dashboard.summary": "Visão consolidada da infraestrutura GPON com foco em disponibilidade, fila de ativação, incidentes ativos e saúde do nó central.",
    "autofind.title": "Autofind",
    "provision.title": "Provisionar ONT",
    "alarms.title": "Alarmes ativos",
    "onts.title": "ONTs registradas",
    "terminal.title": "Terminal SSH",
    "audit.title": "Logs",
    "users.title": "Usuários",
    "login.title": "Entrar na operação",
    "login.description": "Acesse a control surface da Huawei MA5800-X2 com o seu usuário operacional.",
    "login.user": "Usuário",
    "login.password": "Senha",
    "login.submit": "Entrar",
    "login.loading": "Entrando...",
  },
  en: {
    "skip.content": "Skip to content",
    "app.title": "OLT Manager",
    "app.subtitle": "Huawei MA5800-X2 operations",
    "search.placeholder": "Search ONT, serial, PON or alarms...",
    "session.label": "Session",
    "sidebar.collapse": "Collapse sidebar",
    "sidebar.expand": "Expand sidebar",
    "nav.dashboard": "Dashboard",
    "nav.alarms": "Alarms",
    "nav.onts": "Registered ONTs",
    "nav.autofind": "Autofind",
    "nav.provision": "Provision ONT",
    "nav.terminal": "Terminal",
    "nav.audit": "Logs",
    "nav.users": "Users",
    "group.operations": "Operations",
    "group.management": "Management",
    "group.admin": "Administration",
    "logout": "Logout",
    "dashboard.title": "Dashboard",
    "dashboard.kicker": "Operations panel",
    "dashboard.summary": "Consolidated view of GPON infrastructure focused on availability, activation queue, active incidents and core node health.",
    "autofind.title": "Autofind",
    "provision.title": "Provision ONT",
    "alarms.title": "Active alarms",
    "onts.title": "Registered ONTs",
    "terminal.title": "SSH Terminal",
    "audit.title": "Logs",
    "users.title": "Users",
    "login.title": "Access operations",
    "login.description": "Access the Huawei MA5800-X2 control surface with your operational account.",
    "login.user": "Username",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.loading": "Signing in...",
  },
};

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem(THEME_KEY) as ThemeMode | null;
    const savedLocale = window.localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (savedTheme === "light" || savedTheme === "dark") setThemeState(savedTheme);
    if (savedLocale === "pt" || savedLocale === "en") setLocaleState(savedLocale);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const value = useMemo<UISettingsContextValue>(() => ({
    theme,
    locale,
    setTheme: setThemeState,
    toggleTheme: () => setThemeState((current) => (current === "light" ? "dark" : "light")),
    setLocale: setLocaleState,
    t: (key, params) => {
      const entry = messages[locale][key] ?? messages.pt[key] ?? key;
      if (typeof entry === "function") return entry(params);
      return entry;
    },
  }), [locale, theme]);

  return <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>;
}

export function useUISettings() {
  const context = useContext(UISettingsContext);
  if (!context) {
    throw new Error("useUISettings must be used inside UISettingsProvider");
  }
  return context;
}
