import { useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";

interface Props {
  onLogin: (username: string, password: string) => Promise<void>;
}

export function Login({ onLogin }: Props) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError("Preencha usuário e senha");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onLogin(username, password);
      navigate("/");
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Erro ao fazer login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-900 p-4">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(143,200,181,0.22),_transparent_30rem),radial-gradient(circle_at_bottom_right,_rgba(46,132,106,0.25),_transparent_26rem)]" />
      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-white/6 shadow-panel backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
        <section className="hidden border-r border-white/10 px-10 py-12 text-white xl:flex xl:flex-col xl:justify-between">
          <div>
            <div className="mb-5 inline-flex items-center rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-100/75">
              Fiber access control
            </div>
            <h1 className="max-w-md text-5xl font-bold leading-[1.02]">Gerencie a sua OLT com menos ruído e mais contexto.</h1>
            <p className="mt-5 max-w-md text-base leading-7 text-brand-100/70">
              Painel operacional para MA5800-X2 com autofind, provisionamento assistido e leitura das ONTs em um fluxo mais direto.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <FeatureCard label="Autofind" value="PON-aware" />
            <FeatureCard label="Provisioning" value="Template-first" />
            <FeatureCard label="Dashboard" value="Cached view" />
          </div>
        </section>

        <section className="bg-white/88 px-6 py-8 md:px-10 md:py-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
                OLT Manager
              </div>
              <h2 className="text-3xl font-bold text-ink-900">Entrar na operação</h2>
              <p className="mt-2 text-sm leading-6 text-ink-500">Acesse a control surface da Huawei MA5800-X2 com o seu usuário operacional.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Usuário</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="input"
                  placeholder="usuario"
                  autoFocus
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-ink-700">Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="action-primary w-full py-3"
              >
                {loading ? "Entrando..." : "Entrar"}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

function FeatureCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.5rem] border border-white/10 bg-white/6 px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.24em] text-brand-100/45">{label}</div>
      <div className="mt-3 text-sm font-medium text-white">{value}</div>
    </div>
  );
}
