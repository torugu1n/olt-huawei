import { useEffect, useState } from "react";
import { getAlarms } from "../api/client";
import { Alarm } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const SEV_ORDER = ["Critical", "Major", "Minor", "Warning"];

export function Alarms() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await getAlarms();
      const sorted = (data.alarms ?? []).sort(
        (a: Alarm, b: Alarm) => SEV_ORDER.indexOf(a.severity) - SEV_ORDER.indexOf(b.severity)
      );
      setAlarms(sorted);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao buscar alarmes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const visible = filter === "all" ? alarms : alarms.filter((a) => a.severity === filter);

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Active alarms
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">Alarmes ativos</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Painel de eventos correntes da OLT, priorizado por severidade para reduzir tempo de resposta operacional.
            </p>
          </div>
          <button onClick={load} className="action-primary">
            Atualizar alarmes
          </button>
        </div>
      </header>

      <section className="panel px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-400">Filtro por severidade</div>
            <div className="mt-1 text-sm text-ink-500">Refine a leitura sem perder o contexto do total de alarmes ativos.</div>
          </div>
          <div className="flex flex-wrap gap-2">
            {["all", ...SEV_ORDER].map((severity) => (
              <button
                key={severity}
                onClick={() => setFilter(severity)}
                className={filter === severity ? "action-primary" : "action-secondary"}
              >
                {severity === "all" ? "Todos" : severity}
                {severity !== "all" ? ` (${alarms.filter((a) => a.severity === severity).length})` : ` (${alarms.length})`}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Consultando alarmes da OLT...</div>
      ) : visible.length === 0 ? (
        <div className="panel px-8 py-10 text-center">
          <div className="text-sm font-medium text-ink-900">Nenhum alarme para o filtro atual.</div>
          <div className="mt-2 text-sm text-ink-500">{filter === "all" ? "A leitura atual nao trouxe eventos ativos." : `Sem alarmes ${filter}.`}</div>
        </div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[64rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">Seq</th>
                  <th className="px-5 py-4">Severidade</th>
                  <th className="px-5 py-4">Alarme</th>
                  <th className="px-5 py-4">Localizacao</th>
                  <th className="px-5 py-4">Ocorrido em</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((alarm) => (
                  <tr key={alarm.seq} className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                    <td className="px-5 py-4 font-mono text-xs text-ink-500">{alarm.seq}</td>
                    <td className="px-5 py-4"><StatusBadge value={alarm.severity} /></td>
                    <td className="px-5 py-4 font-medium text-ink-900">{alarm.name}</td>
                    <td className="px-5 py-4 font-mono text-xs text-ink-500">{alarm.location}</td>
                    <td className="px-5 py-4 text-xs text-ink-400">{alarm.occurred_at}</td>
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
