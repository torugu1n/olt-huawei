import { FormEvent, useState } from "react";

const illustrationSrc = new URL("../assets/login-network-illustration.svg", import.meta.url).href;

type LoginProps = {
  onLogin: (username: string, password: string) => Promise<void>;
};

export function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await onLogin(username, password);
    } catch (err: any) {
      setError(err?.response?.data?.detail || err?.message || "Credenciais inválidas. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Lado esquerdo — ilustração */}
      <div className="relative hidden flex-1 flex-col justify-between overflow-hidden bg-brand-50 md:flex">
        {/* grade de fundo sutil */}
        <div className="absolute inset-0 [background-image:linear-gradient(rgba(99,102,241,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(99,102,241,0.06)_1px,transparent_1px)] [background-size:40px_40px]" />


        {/* ilustração centralizada */}
        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-12 py-8">
          <img
            src={illustrationSrc}
            alt="Ilustração de rede óptica"
            className="h-auto w-full max-w-[520px] object-contain drop-shadow-sm"
          />
          <div className="mt-10 max-w-[440px] text-center">
            <h2 className="font-display text-[1.6rem] font-semibold leading-snug tracking-[-0.03em] text-ink-900">
              Controle operacional da sua rede óptica
            </h2>
            <p className="mt-3 text-[14px] leading-6 text-ink-500">
              Monitoramento, provisionamento e gestão assistida da MA5800-X2 em uma única superfície.
            </p>
          </div>
        </div>

        {/* rodapé */}
        <div className="relative z-10 px-12 pb-10">
          <p className="text-[12px] text-ink-400">
            Vtec Solutions © 2026
          </p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div className="flex w-full flex-col justify-center px-6 py-12 sm:px-10 md:w-[480px] md:flex-none xl:w-[520px]">
        <div className="mx-auto w-full max-w-[400px]">

          {/* logo mobile */}
          <div className="mb-10 flex items-center gap-3 md:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 shadow-md">
              <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8">
                <circle cx="12" cy="12" r="2.5" />
                <circle cx="5" cy="6" r="1.6" />
                <circle cx="19" cy="6" r="1.6" />
                <circle cx="5" cy="18" r="1.6" />
                <circle cx="19" cy="18" r="1.6" />
                <path d="M7 6h4m2 0h4M6.5 7.5l3 3m5 0 3-3M6.5 16.5l3-3m5 0 3 3M12 9.5v-1M12 15.5v-1" strokeLinecap="round" />
              </svg>
            </div>
            <span className="font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-ink-900">
              NETCORE<span className="text-brand-600">_OS</span>
            </span>
          </div>

          <div className="mb-8">
            <h1 className="font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink-900">
              Entrar
            </h1>
            <p className="mt-2 text-[14px] text-ink-500">
              Acesse o painel de controle da OLT
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700">
                Usuário
              </label>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
                required
                placeholder="seu.usuario"
                className="input w-full"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-ink-700">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="input w-full"
              />
            </div>

            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-600">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || !username || !password}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-[14px] font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Autenticando...
                </>
              ) : (
                "Acessar painel"
              )}
            </button>
          </form>

          <div className="mt-10 flex items-center justify-between border-t border-ink-100 pt-6">
            <span className="text-[12px] text-ink-400">MA5800-X2 · OLT Manager</span>
            <div className="flex items-center gap-2 rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-ink-600">Sistema online</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
