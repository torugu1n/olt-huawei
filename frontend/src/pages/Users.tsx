import { useEffect, useState } from "react";
import { listUsers, createUser, deleteUser, toggleUser, adminChangePassword } from "../api/client";
import { User } from "../types";

export function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ username: "", full_name: "", password: "", is_admin: false, is_readonly: false });
  const [error, setError] = useState("");

  // modal de troca de senha
  const [pwdUserId, setPwdUserId] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [pwdError, setPwdError] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await listUsers();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao carregar usuários");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await createUser(form);
      setForm({ username: "", full_name: "", password: "", is_admin: false, is_readonly: false });
      setShowForm(false);
      load();
    } catch (err: any) {
      setError(err?.response?.data?.detail ?? "Erro ao criar usuário");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Excluir este usuário?")) return;
    await deleteUser(id);
    load();
  };

  const handleToggle = async (id: number) => {
    await toggleUser(id);
    load();
  };

  const openPwdModal = (id: number) => {
    setPwdUserId(id);
    setNewPassword("");
    setPwdError("");
  };

  const handlePasswordSave = async () => {
    if (!pwdUserId) return;
    if (newPassword.length < 6) { setPwdError("Mínimo 6 caracteres."); return; }
    setPwdSaving(true);
    setPwdError("");
    try {
      await adminChangePassword(pwdUserId, newPassword);
      setPwdUserId(null);
      setNewPassword("");
    } catch (err: any) {
      setPwdError(err?.response?.data?.detail ?? "Erro ao alterar senha");
    } finally {
      setPwdSaving(false);
    }
  };

  const roleLabel = (u: User) => {
    if (u.is_admin) return { label: "Admin", cls: "border-brand-200 bg-brand-50 text-brand-700" };
    if (u.is_readonly) return { label: "Somente leitura", cls: "border-ink-200 bg-ink-50 text-ink-500" };
    return { label: "Operador", cls: "border-emerald-200 bg-emerald-50 text-emerald-700" };
  };

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow mb-3">Controle de acesso</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">Usuários</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Gestão de acesso da ferramenta, com operações administrativas centralizadas e estados de conta bem visíveis.
            </p>
          </div>
          <button onClick={() => setShowForm((c) => !c)} className={showForm ? "action-secondary" : "action-primary"}>
            {showForm ? "Fechar formulário" : "Novo usuário"}
          </button>
        </div>
      </header>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {showForm && (
        <form onSubmit={handleCreate} className="panel grid gap-4 px-6 py-5 lg:grid-cols-2">
          <Field label="Usuário">
            <input className="input" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
          </Field>
          <Field label="Nome completo">
            <input className="input" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} required />
          </Field>
          <Field label="Senha">
            <input type="password" className="input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} />
          </Field>
          <div className="flex flex-col gap-3 rounded-[1rem] border border-ink-200 bg-ink-50/60 px-4 py-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_admin}
                onChange={(e) => setForm({ ...form, is_admin: e.target.checked, is_readonly: e.target.checked ? false : form.is_readonly })}
              />
              <span className="text-sm font-medium text-ink-700">Perfil administrador</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_readonly}
                disabled={form.is_admin}
                onChange={(e) => setForm({ ...form, is_readonly: e.target.checked })}
              />
              <span className={`text-sm font-medium ${form.is_admin ? "text-ink-300" : "text-ink-700"}`}>
                Somente leitura <span className="font-normal text-ink-400">(não pode executar ações)</span>
              </span>
            </label>
          </div>
          <div className="lg:col-span-2 flex gap-3">
            <button type="submit" className="action-primary">Criar usuário</button>
            <button type="button" onClick={() => setShowForm(false)} className="action-secondary">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando usuários...</div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[60rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="font-mono text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">Usuário</th>
                  <th className="px-5 py-4">Nome</th>
                  <th className="px-5 py-4">Perfil</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const role = roleLabel(user);
                  return (
                    <tr key={user.id} className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-ink-800">{user.username}</td>
                      <td className="px-5 py-4 text-ink-700">{user.full_name}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${role.cls}`}>
                          {role.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={user.is_active
                          ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700"
                          : "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700"
                        }>
                          {user.is_active ? "Ativo" : "Inativo"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => openPwdModal(user.id)}
                            className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-100"
                          >
                            Alterar senha
                          </button>
                          <button onClick={() => handleToggle(user.id)} className="action-secondary">
                            {user.is_active ? "Desativar" : "Ativar"}
                          </button>
                          <button
                            onClick={() => handleDelete(user.id)}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Modal troca de senha ──────────────────────────────────────────── */}
      {pwdUserId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 backdrop-blur-sm px-4">
          <div className="panel w-full max-w-[420px] px-6 py-6">
            <h3 className="font-display text-lg font-semibold text-ink-900">Alterar senha</h3>
            <p className="mt-1 text-[13px] text-ink-500">
              Nova senha para <span className="font-semibold text-ink-800">{users.find(u => u.id === pwdUserId)?.username}</span>
            </p>
            <div className="mt-5">
              <Field label="Nova senha">
                <input
                  type="password"
                  className="input"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  autoFocus
                  minLength={6}
                  onKeyDown={(e) => e.key === "Enter" && handlePasswordSave()}
                />
              </Field>
            </div>
            {pwdError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-700">{pwdError}</div>
            )}
            <div className="mt-5 flex gap-3">
              <button onClick={handlePasswordSave} disabled={pwdSaving} className="action-primary">
                {pwdSaving ? "Salvando..." : "Salvar senha"}
              </button>
              <button onClick={() => setPwdUserId(null)} className="action-secondary">Cancelar</button>
            </div>
          </div>
        </div>
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
