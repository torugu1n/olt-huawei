import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { setupAdmin } from "../api/client";

export function Setup({ onComplete }: { onComplete: () => void }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: "", full_name: "", password: "", confirm: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError("As senhas não coincidem.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await setupAdmin({ username: form.username, full_name: form.full_name, password: form.password });
      onComplete();
      navigate("/login", { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Erro ao criar conta admin.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-muted px-4">
      <div className="panel w-full max-w-[440px] px-8 py-10">
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 shadow-md">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="12" cy="12" r="2.5" />
              <circle cx="5" cy="6" r="1.6" />
              <circle cx="19" cy="6" r="1.6" />
              <circle cx="5" cy="18" r="1.6" />
              <circle cx="19" cy="18" r="1.6" />
              <path d="M7 6h4m2 0h4M6.5 7.5l3 3m5 0 3-3M6.5 16.5l3-3m5 0 3 3M12 9.5v-1M12 15.5v-1" strokeLinecap="round" />
            </svg>
          </div>
          <span className="font-display text-[1.1rem] font-semibold tracking-[-0.02em] text-ink-900">
            NETCORE<span className="text-brand-600">_OS</span>
          </span>
        </div>

        <div className="eyebrow mb-4">Primeira execução</div>
        <h1 className="font-display text-2xl font-semibold tracking-[-0.03em] text-ink-900">
          Criar conta administrador
        </h1>
        <p className="mt-2 text-[13px] leading-6 text-ink-500">
          Nenhum usuário encontrado. Crie a conta admin para começar a usar o sistema.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink-700">Usuário</label>
            <input
              className="input"
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              placeholder="admin"
              required
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink-700">Nome completo</label>
            <input
              className="input"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Administrador"
              required
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink-700">Senha</label>
            <input
              type="password"
              className="input"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Mínimo 6 caracteres"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-ink-700">Confirmar senha</label>
            <input
              type="password"
              className="input"
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              placeholder="Repita a senha"
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full action-primary py-3 text-[14px]"
          >
            {submitting ? "Criando conta..." : "Criar conta admin"}
          </button>
        </form>
      </div>
    </div>
  );
}
