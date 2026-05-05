import { createContext, useContext, useEffect, useMemo, useState } from "react";

type Locale = "pt" | "en";

type MessageValue = string | ((params?: Record<string, string | number>) => string);

interface UISettingsContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const UISettingsContext = createContext<UISettingsContextValue | null>(null);

const LOCALE_KEY = "olt_locale";

const messages: Record<Locale, Record<string, MessageValue>> = {
  pt: {
    "skip.content": "Pular para o conteudo",
    "app.title": "OLT Manager",
    "app.subtitle": "Huawei MA5800-X2 · Secretaria da Administração",
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
    "nav.audit": "Auditoria",
    "nav.users": "Usuários",
    "nav.templates": "Templates",
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
    "audit.title": "Log de auditoria",
    "users.title": "Usuários",
    "templates.title": "Templates",
    "login.title": "Entrar na operação",
    "login.description": "Acesse a control surface da Huawei MA5800-X2 com o seu usuário operacional.",
    "login.user": "Usuário",
    "login.password": "Senha",
    "login.submit": "Entrar",
    "login.loading": "Entrando...",
    "login.hero.tag": "Acesso Seguro",
    "login.hero.description": "Painel operacional centralizado para terminais de rede óptica. Autofind, provisionamento assistido e telemetria em tempo real.",
    "login.feature1.label": "Autofind",
    "login.feature1.value": "Reconhecimento PON",
    "login.feature2.label": "Provisionamento",
    "login.feature2.value": "Via Templates",
    "login.feature3.label": "Dashboard",
    "login.feature3.value": "Visão em cache",
  },
  en: {
    "skip.content": "Skip to content",
    "app.title": "OLT Manager",
    "app.subtitle": "Huawei MA5800-X2 · Operations",
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
    "nav.audit": "Audit Log",
    "nav.users": "Users",
    "nav.templates": "Templates",
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
    "audit.title": "Audit log",
    "users.title": "Users",
    "templates.title": "Templates",
    "login.title": "Access operations",
    "login.description": "Access the Huawei MA5800-X2 control surface with your operational account.",
    "login.user": "Username",
    "login.password": "Password",
    "login.submit": "Sign in",
    "login.loading": "Signing in...",
    "login.hero.tag": "Secure Access",
    "login.hero.description": "Centralized operational panel for optical network terminals. Autofind, assisted provisioning, and real-time telemetry.",
    "login.feature1.label": "Autofind",
    "login.feature1.value": "PON-aware",
    "login.feature2.label": "Provisioning",
    "login.feature2.value": "Template-first",
    "login.feature3.label": "Dashboard",
    "login.feature3.value": "Cached view",
  },
};

export function UISettingsProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("pt");

  useEffect(() => {
    const savedLocale = window.localStorage.getItem(LOCALE_KEY) as Locale | null;
    if (savedLocale === "pt" || savedLocale === "en") setLocaleState(savedLocale);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(LOCALE_KEY, locale);
    document.documentElement.lang = locale === "pt" ? "pt-BR" : "en";
  }, [locale]);

  const value = useMemo<UISettingsContextValue>(() => ({
    locale,
    setLocale: setLocaleState,
    t: (key, params) => {
      const entry = messages[locale][key] ?? messages.pt[key] ?? key;
      if (typeof entry === "function") return entry(params);
      return entry;
    },
  }), [locale]);

  return <UISettingsContext.Provider value={value}>{children}</UISettingsContext.Provider>;
}

export function useUISettings() {
  const context = useContext(UISettingsContext);
  if (!context) {
    throw new Error("useUISettings must be used inside UISettingsProvider");
  }
  return context;
}
