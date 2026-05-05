import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboardSummary } from "../api/client";
import { Board, Alarm, AutofindONT, DashboardSummary } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const DASHBOARD_CACHE_KEY = "dashboard_summary_cache";

function readDashboardCache(): DashboardSummary | null {
  try {
    const raw = localStorage.getItem(DASHBOARD_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: DashboardSummary };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}

function writeDashboardCache(data: DashboardSummary) {
  try {
    localStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify({ data, saved_at: Date.now() }));
  } catch {
    // Ignora falha de cache local.
  }
}

export function Dashboard() {
  const cached = readDashboardCache();
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(cached?.status ?? null);
  const [boards, setBoards] = useState<Board[]>(cached?.boards ?? []);
  const [alarms, setAlarms] = useState<Alarm[]>(cached?.alarms ?? []);
  const [autofind, setAutofind] = useState<AutofindONT[]>(cached?.autofind ?? []);
  const [ontsTotal, setOntsTotal] = useState(cached?.onts_total ?? 0);
  const [ontsOnline, setOntsOnline] = useState(cached?.onts_online ?? 0);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setRefreshing(true);
      try {
        const { data } = await getDashboardSummary();
        const summary = data as DashboardSummary;
        writeDashboardCache(summary);
        setStatus(summary.status);
        setBoards(summary.boards ?? []);
        setAlarms(summary.alarms ?? []);
        setAutofind(summary.autofind ?? []);
        setOntsTotal(summary.onts_total ?? 0);
        setOntsOnline(summary.onts_online ?? 0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    };
    load();
  }, []);

  const alarmCount = { Critical: 0, Major: 0, Minor: 0, Warning: 0 };
  alarms.forEach((a) => { alarmCount[a.severity] = (alarmCount[a.severity] ?? 0) + 1; });
  const activeBoards = boards.filter((board) => {
    const status = board.status.toLowerCase();
    return status.includes("normal") || status.includes("active");
  }).length;
  const faultyBoards = boards.filter((board) => {
    const status = board.status.toLowerCase();
    const onlineState = board.online_state.toLowerCase();
    return status.includes("failed") || onlineState.includes("offline");
  }).length;

  return (
    <div className="space-y-6">
      <header className="panel overflow-hidden px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="eyebrow mb-3">OLT Summary</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-[3.25rem]">Estado operacional da MA5800-X2</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Visao consolidada da OLT, com inventario de ONTs, alarmes ativos e fila de provisionamento descoberta automaticamente.
            </p>
          </div>

          <div className="panel-muted min-w-[18rem] px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] uppercase tracking-[0.2em] text-ink-400">Link operacional</div>
                <div className="mt-2 text-sm font-medium text-ink-800">
                  {status?.connected ? "Conectado e respondendo" : "Conexao degradada"}
                </div>
              </div>
              {status && <StatusBadge value={status.connected ? "online" : "offline"} />}
            </div>
            {refreshing && <div className="mt-3 text-xs text-ink-400">Atualizando snapshot...</div>}
          </div>
        </div>
      </header>

      {loading && <div className="panel-muted px-5 py-4 text-sm text-ink-500">Carregando telemetria da OLT...</div>}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="ONTs online"
          value={ontsOnline}
          total={ontsTotal}
          tone="emerald"
          link="/onts"
          note={`${ontsTotal - ontsOnline} offline`}
        />
        <StatCard
          label="Fila de autofind"
          value={autofind.length}
          tone="mint"
          link="/autofind"
          note={autofind.length > 0 ? "Aguardando provisao" : "Sem pendencias"}
        />
        <StatCard
          label="Alarmes criticos"
          value={alarmCount.Critical + alarmCount.Major}
          tone="amber"
          link="/alarms"
          note={`${alarms.length} itens lidos`}
        />
        <StatCard
          label="Boards ativas"
          value={activeBoards}
          total={boards.length}
          tone="slate"
          note={faultyBoards > 0 ? `${faultyBoards} com falha ou offline` : "Estado do chassis"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Section title="Boards e chassis" subtitle="Leitura resumida da control board e estado principal." link="/onts">
          {boards.length === 0 ? (
            <EmptyState text="Nenhuma board retornada pela OLT." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-sm">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="pb-3">Slot</th>
                    <th className="pb-3">Board</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3">Presenca</th>
                    <th className="pb-3">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board) => (
                    <tr key={`${board.slot}-${board.board_name}`} className="border-b border-ink-100/80 last:border-0">
                      <td className="py-3 font-mono text-xs text-ink-700">{board.slot}</td>
                      <td className="py-3 font-medium text-ink-900">{board.board_name}</td>
                      <td className="py-3"><StatusBadge value={board.status} /></td>
                      <td className="py-3">
                        {board.online_state ? <StatusBadge value={board.online_state} /> : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="py-3 text-ink-500">{board.sub_type || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section title="Alarmes ativos" subtitle="Eventos correntes que exigem atencao ou acompanhamento." link="/alarms">
          {alarms.length === 0 ? (
            <EmptyState text="Nenhum alarme ativo no snapshot atual." tone="ok" />
          ) : (
            <div className="space-y-3">
              {alarms.slice(0, 5).map((alarm) => (
                <div key={alarm.seq} className="panel-muted px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-medium text-ink-900">{alarm.name}</div>
                      <div className="mt-1 text-xs text-ink-500">{alarm.location}</div>
                    </div>
                    <StatusBadge value={alarm.severity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <Section
        title="Autofind operacional"
        subtitle="As ONTs abaixo foram encontradas e podem seguir direto para a provisao assistida."
        link="/autofind"
      >
        {autofind.length === 0 ? (
          <EmptyState text="Sem ONTs aguardando provisionamento." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-ink-100 text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="pb-3">PON</th>
                  <th className="pb-3">Serial</th>
                  <th className="pb-3">Vendor</th>
                  <th className="pb-3">Descoberto em</th>
                  <th className="pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {autofind.slice(0, 5).map((ont, index) => (
                  <tr key={`${ont.sn}-${index}`} className="border-b border-ink-100/80 last:border-0">
                    <td className="py-3 font-mono text-xs text-ink-700">{ont.frame}/{ont.slot}/{ont.port}</td>
                    <td className="py-3 font-mono text-sm font-semibold text-brand-700">{ont.sn}</td>
                    <td className="py-3 text-ink-500">{ont.vendor_id}</td>
                    <td className="py-3 text-xs text-ink-400">{ont.found_at}</td>
                    <td className="py-3 text-right">
                      <Link
                        to={`/provision?sn=${ont.sn}&port=${ont.port}`}
                        className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-100"
                      >
                        Provisionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function StatCard({ label, value, total, tone, link, note }: {
  label: string;
  value: number;
  total?: number;
  tone: "emerald" | "mint" | "amber" | "slate";
  link?: string;
  note?: string;
}) {
  const tones = {
    emerald: {
      panel: "border-emerald-200 bg-[rgba(241,250,246,0.96)]",
      line: "bg-emerald-400/70",
    },
    mint: {
      panel: "border-brand-200 bg-[rgba(245,248,252,0.96)]",
      line: "bg-brand-400/60",
    },
    amber: {
      panel: "border-amber-200 bg-[rgba(253,249,240,0.96)]",
      line: "bg-amber-400/70",
    },
    slate: {
      panel: "border-ink-200 bg-[rgba(252,253,255,0.96)]",
      line: "bg-ink-300/85",
    },
  } as const;

  const content = (
    <div className={`relative overflow-hidden rounded-[1.25rem] border px-5 py-5 shadow-panel ${tones[tone].panel}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${tones[tone].line}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">{label}</div>
          <div className="mt-4 text-4xl font-semibold leading-none text-ink-900">
            {value}
            {total !== undefined && <span className="ml-2 text-lg text-ink-400">/ {total}</span>}
          </div>
        </div>
        <div className="font-mono rounded-full border border-white/80 bg-white/85 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-ink-500">
          Live
        </div>
      </div>
      {note && <div className="mt-5 text-sm text-ink-500">{note}</div>}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function Section({ title, subtitle, children, link }: { title: string; subtitle?: string; children: React.ReactNode; link?: string }) {
  return (
    <section className="panel px-6 py-5 md:px-7">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-1 text-sm leading-6 text-ink-500">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="font-mono rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-ink-600 transition hover:bg-white">
            Ver tudo
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function EmptyState({ text, tone = "muted" }: { text: string; tone?: "muted" | "ok" }) {
  return (
    <div className={`panel-muted px-5 py-6 text-sm ${tone === "ok" ? "text-brand-700" : "text-ink-500"}`}>
      {text}
    </div>
  );
}
