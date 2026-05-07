import { useEffect, useMemo, useState } from "react";
import { getAuditLogs, getOltLogs } from "../api/client";
import { AuditLog, OltLog } from "../types";
import { StatusBadge } from "../components/StatusBadge";
import { formatBrazilDateTime } from "../lib/datetime";

type UnifiedLog = {
  id: string;
  timestamp: string;
  source: "audit" | "olt";
  area: string;
  type: string;
  title: string;
  detail: string | null;
  status: string;
  actor: string;
  rawOutput?: string | null;
};

export function LogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [oltLogs, setOltLogs] = useState<OltLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [scope, setScope] = useState<"all" | "audit" | "olt">("all");
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warning" | "error">("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: auditData }, { data: oltData }] = await Promise.all([
        getAuditLogs({ limit: 200 }),
        getOltLogs({ limit: 200 }),
      ]);

      setAuditLogs(Array.isArray(auditData) ? auditData : []);
      setOltLogs(Array.isArray(oltData?.logs) ? oltData.logs : []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const logs = useMemo(() => {
    const unifiedAudit: UnifiedLog[] = auditLogs.map((log) => ({
      id: `audit-${log.id}`,
      timestamp: log.timestamp,
      source: "audit",
      area: "Auditoria",
      type: "Ação da aplicação",
      title: formatAuditAction(log.action),
      detail: log.detail,
      status: log.success ? "info" : "error",
      actor: log.username,
    }));

    const unifiedOlt: UnifiedLog[] = oltLogs.map((log) => ({
      id: `olt-${log.id}`,
      timestamp: log.created_at,
      source: "olt",
      area: "OLT",
      type: formatOltSource(log.source),
      title: log.message,
      detail: log.detail,
      status: log.level,
      actor: typeof log.metadata?.username === "string" ? log.metadata.username : "sistema",
      rawOutput: log.raw_output,
    }));

    return [...unifiedAudit, ...unifiedOlt]
      .sort((a, b) => parseLogDate(b.timestamp) - parseLogDate(a.timestamp));
  }, [auditLogs, oltLogs]);

  const availableTypes = useMemo(() => {
    const types = Array.from(new Set(logs.map((log) => log.type))).sort((a, b) => a.localeCompare(b));
    return ["all", ...types];
  }, [logs]);

  const visible = logs.filter((log) => {
    if (scope !== "all" && log.source !== scope) {
      return false;
    }

    if (levelFilter !== "all" && log.status !== levelFilter) {
      return false;
    }

    if (typeFilter !== "all" && log.type !== typeFilter) {
      return false;
    }

    if (!filter) {
      return true;
    }

    const haystack = [log.area, log.type, log.title, log.detail, log.actor].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(filter.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Logs centralizados
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">Logs</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
              Consolidação dos logs operacionais da OLT e da auditoria da aplicação, exibidos no fuso horário local do Brasil (UTC-3).
            </p>
          </div>
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[28rem]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Filtrar por área, evento, ator ou detalhe..."
                className="input min-w-[18rem]"
              />
              <button onClick={load} className="action-primary">Atualizar</button>
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Todos" },
                { value: "olt", label: "OLT" },
                { value: "audit", label: "Auditoria" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setScope(item.value as "all" | "audit" | "olt")}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
                    scope === item.value
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "all", label: "Níveis: todos" },
                { value: "info", label: "Info" },
                { value: "warning", label: "Warning" },
                { value: "error", label: "Erro" },
              ].map((item) => (
                <button
                  key={item.value}
                  onClick={() => setLevelFilter(item.value as "all" | "info" | "warning" | "error")}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
                    levelFilter === item.value
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTypes.map((item) => (
                <button
                  key={item}
                  onClick={() => setTypeFilter(item)}
                  className={`rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] transition ${
                    typeFilter === item
                      ? "border-brand-200 bg-brand-50 text-brand-700"
                      : "border-ink-200 bg-white text-ink-500 hover:border-ink-300 hover:text-ink-700"
                  }`}
                >
                  {item === "all" ? "Tipos: todos" : item}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando logs centralizados...</div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">Data/Hora</th>
                  <th className="px-5 py-4">Origem</th>
                  <th className="px-5 py-4">Tipo</th>
                  <th className="px-5 py-4">Evento</th>
                  <th className="px-5 py-4">Ator</th>
                  <th className="px-5 py-4">Detalhe</th>
                  <th className="px-5 py-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-sm text-ink-400">Nenhum log encontrado.</td>
                  </tr>
                ) : (
                  visible.map((log) => (
                    <tr key={log.id} className="border-b border-ink-100/80 align-top transition hover:bg-brand-50/35 last:border-0">
                      <td className="px-5 py-4 text-xs whitespace-nowrap text-ink-400">{formatBrazilDateTime(log.timestamp)}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-ink-200 bg-white px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-ink-600">
                          {log.area}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-full border border-ink-200 bg-ink-50 px-3 py-1 text-[11px] font-medium text-ink-600">
                          {log.type}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-medium text-ink-900">{log.title}</td>
                      <td className="px-5 py-4 text-xs text-ink-500">{log.actor}</td>
                      <td className="px-5 py-4 max-w-xl text-xs leading-6 text-ink-500">
                        <div>{log.detail || "—"}</div>
                        {log.rawOutput && (
                          <details className="mt-2">
                            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-[0.14em] text-brand-700">
                              Ver saída bruta
                            </summary>
                            <pre className="mt-2 overflow-x-auto rounded-xl bg-ink-950 px-4 py-3 text-[11px] whitespace-pre-wrap text-brand-100">
                              {log.rawOutput}
                            </pre>
                          </details>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge value={log.status} />
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

function formatAuditAction(action: string) {
  return action
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char: string) => char.toUpperCase());
}

function formatOltSource(source: string) {
  const map: Record<string, string> = {
    dashboard_snapshot: "Snapshot da OLT",
    provision_ont: "Provisionamento",
    service_port: "Service-port",
    ont_lifecycle: "Ciclo da ONT",
  };

  return map[source] ?? source;
}

function parseLogDate(value: string) {
  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T") + "Z").getTime();
  }

  return new Date(value).getTime();
}
