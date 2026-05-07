import { FormEvent, useEffect, useState } from "react";
import { getSettings, updateSettings } from "../api/client";
import { AppSettings } from "../types";

const DEFAULTS: AppSettings = {
  OLT_HOST: "",
  OLT_PORT: 22,
  OLT_USERNAME: "",
  OLT_PASSWORD: "",
  OLT_ENABLE_PASSWORD: "",
  OLT_NAME: "MA5800-X2",
  OLT_TIMEOUT: 30,
  OLT_SESSION_BOOTSTRAP_COMMANDS: "undo idle-timeout",
};

export function SettingsPage() {
  const [form, setForm] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showOltPassword, setShowOltPassword] = useState(false);
  const [showEnablePassword, setShowEnablePassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getSettings();
      setForm({ ...DEFAULTS, ...data });
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao carregar configurações");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      await updateSettings(form);
      setMessage("Configurações salvas. O backend já passou a usar os novos valores.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="eyebrow mb-3">Infra settings</div>
        <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">Configurações da OLT</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
          Centralize host, credenciais e parâmetros da sessão SSH da OLT. Os dados ficam persistidos no banco e passam a ser usados pelo backend.
        </p>
      </header>

      {error ? <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {message ? <div className="rounded-[1.25rem] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div> : null}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando configurações...</div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="panel px-6 py-5">
            <div className="mb-5">
              <h3 className="font-display text-[1.1rem] font-semibold text-ink-900">Acesso da OLT</h3>
              <p className="mt-1 text-sm text-ink-500">Usado para provisionamento, consultas, terminal e operacao assistida.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="OLT_HOST"><input className="input" value={form.OLT_HOST} onChange={(e) => setForm({ ...form, OLT_HOST: e.target.value })} /></Field>
              <Field label="OLT_PORT"><input type="number" className="input" value={form.OLT_PORT} onChange={(e) => setForm({ ...form, OLT_PORT: Number(e.target.value) })} /></Field>
              <Field label="OLT_USERNAME"><input className="input" value={form.OLT_USERNAME} onChange={(e) => setForm({ ...form, OLT_USERNAME: e.target.value })} /></Field>
              <Field label="OLT_PASSWORD">
                <SecretField
                  value={form.OLT_PASSWORD}
                  visible={showOltPassword}
                  placeholder="Digite para substituir"
                  onToggle={() => setShowOltPassword((current) => !current)}
                  onChange={(value) => setForm({ ...form, OLT_PASSWORD: value })}
                />
              </Field>
              <Field label="OLT_ENABLE_PASSWORD">
                <SecretField
                  value={form.OLT_ENABLE_PASSWORD}
                  visible={showEnablePassword}
                  placeholder="Opcional"
                  onToggle={() => setShowEnablePassword((current) => !current)}
                  onChange={(value) => setForm({ ...form, OLT_ENABLE_PASSWORD: value })}
                />
              </Field>
            </div>
          </section>

          <section className="panel px-6 py-5">
            <div className="mb-5">
              <h3 className="font-display text-[1.1rem] font-semibold text-ink-900">Ajustes avançados</h3>
              <p className="mt-1 text-sm text-ink-500">Parâmetros menos frequentes da sessão e do comportamento da OLT.</p>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <Field label="OLT_NAME"><input className="input" value={form.OLT_NAME} onChange={(e) => setForm({ ...form, OLT_NAME: e.target.value })} /></Field>
              <Field label="OLT_TIMEOUT (s)"><input type="number" className="input" value={form.OLT_TIMEOUT} onChange={(e) => setForm({ ...form, OLT_TIMEOUT: Number(e.target.value) })} /></Field>
              <div className="lg:col-span-2">
                <Field label="Bootstrap SSH"><textarea className="input min-h-[8rem]" value={form.OLT_SESSION_BOOTSTRAP_COMMANDS} onChange={(e) => setForm({ ...form, OLT_SESSION_BOOTSTRAP_COMMANDS: e.target.value })} /></Field>
              </div>
            </div>
          </section>

          <div className="flex gap-3">
            <button type="submit" className="action-primary" disabled={saving}>{saving ? "Salvando..." : "Salvar configurações"}</button>
            <button type="button" className="action-secondary" onClick={load}>Recarregar</button>
          </div>
        </form>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function SecretField({
  value,
  visible,
  placeholder,
  onToggle,
  onChange,
}: {
  value: string;
  visible: boolean;
  placeholder?: string;
  onToggle: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className="input pr-12"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onToggle}
        className="absolute inset-y-0 right-3 inline-flex items-center text-ink-400 transition hover:text-ink-700"
        aria-label={visible ? "Ocultar valor" : "Mostrar valor"}
      >
        <span className="material-symbols-outlined text-[18px]">
          {visible ? "visibility_off" : "visibility"}
        </span>
      </button>
    </div>
  );
}
