import { useEffect, useState } from "react";
import { getAuditLogs } from "../api/client";
import { AuditLog } from "../types";

export function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getAuditLogs({ limit: 200 });
      setLogs(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = filter
    ? logs.filter((log) => log.username.includes(filter) || log.action.includes(filter) || log.detail?.includes(filter))
    : logs;

  const fmtDate = (ts: string) =>
    new Date(ts).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });

  const actionTone = (action: string) => {
    if (action.includes("delete") || action.includes("remove")) return "border-red-200 bg-red-50 text-red-700";
    if (action.includes("provision")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (action.includes("reboot")) return "border-amber-200 bg-amber-50 text-amber-800";
    return "border-ink-200 bg-white/80 text-ink-500";
  };

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Audit trail
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">Log de auditoria</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Historico operacional da ferramenta, com foco em rastreabilidade de acoes administrativas e mudancas na OLT.
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filtrar por usuario, acao ou detalhe..."
              className="input min-w-[18rem]"
            />
            <button onClick={load} className="action-primary">Atualizar</button>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando trilha de auditoria...</div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">Data/Hora</th>
                  <th className="px-5 py-4">Usuario</th>
                  <th className="px-5 py-4">Acao</th>
                  <th className="px-5 py-4">Detalhe</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-sm text-ink-400">Nenhum registro encontrado.</td>
                  </tr>
                ) : (
                  visible.map((log) => (
                    <tr key={log.id} className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                      <td className="px-5 py-4 text-xs text-ink-400 whitespace-nowrap">{fmtDate(log.timestamp)}</td>
                      <td className="px-5 py-4 font-medium text-ink-900">{log.username}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${actionTone(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 max-w-md text-xs text-ink-500">{log.detail || "—"}</td>
                      <td className="px-5 py-4">
                        <span className={log.success ? "inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-emerald-700" : "inline-flex rounded-full border border-red-200 bg-red-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700"}>
                          {log.success ? "OK" : "Falha"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
