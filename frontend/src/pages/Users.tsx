import { useEffect, useState } from "react";
import { listUsers, createUser, deleteUser, toggleUser } from "../api/client";
import { User } from "../types";

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", password: "", is_admin: false });
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao carregar usuarios");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createUser(form);
      setForm({ username: "", full_name: "", password: "", is_admin: false });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Erro ao criar usuario");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este usuario?")) return;
    await deleteUser(id);
    load();
  };

  const handleToggle = async (id: number) => {
    await toggleUser(id);
    load();
  };

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Access control
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">Usuarios</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Gestao de acesso da ferramenta, com operacoes administrativas centralizadas e estados de conta bem visiveis.
            </p>
          </div>
          <button onClick={() => setShowForm((current) => !current)} className={showForm ? "action-secondary" : "action-primary"}>
            {showForm ? "Fechar formulario" : "Novo usuario"}
          </button>
        </div>
      </header>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="panel grid gap-4 px-6 py-5 lg:grid-cols-2">
          <Field label="Usuario">
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </Field>
          <Field label="Nome completo">
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </Field>
          <Field label="Senha">
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </Field>
          <div className="flex items-center gap-3 rounded-[1.25rem] border border-ink-100 bg-white/55 px-4 py-4">
            <input
              type="checkbox"
              id="is_admin"
              checked={form.is_admin}
              onChange={(e) => setForm({ ...form, is_admin: e.target.checked })}
              className="h-4 w-4"
            />
            <label htmlFor="is_admin" className="text-sm font-medium text-ink-700">Conceder perfil administrativo</label>
          </div>
          <div className="lg:col-span-2 flex gap-3">
            <button type="submit" className="action-primary">Criar usuario</button>
            <button type="button" onClick={() => setShowForm(false)} className="action-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando usuarios...</div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Perfil</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                    <td className="px-5 py-4 font-mono text-sm font-semibold text-ink-800">{user.username}</td>
                    <td className="px-5 py-4 text-ink-700">{user.full_name}</td>
                    <td className="px-5 py-4">
                      <span className={user.is_admin ? "inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700" : "inline-flex rounded-full border border-ink-200 bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-500"}>
                        {user.is_admin ? "Admin" : "Operador"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={user.is_active ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700" : "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700"}>
                        {user.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleToggle(user.id)} className="action-secondary">
                          {user.is_active ? "Desativar" : "Ativar"}
                        </button>
                        <button onClick={() => handleDelete(user.id)} className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 transition hover:bg-red-100">
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
