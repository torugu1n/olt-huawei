import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getDashboardSummary } from "../api/client";
import { AuthToken, Board, Alarm, AutofindONT, DashboardSummary } from "../types";
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

function looksLikeTransientOltBlock(summary: DashboardSummary) {
  const message = String(summary.status?.message ?? "").toLowerCase();
  const emptyEverything =
    (summary.onts_total ?? 0) === 0 &&
    (summary.boards?.length ?? 0) === 0 &&
    (summary.alarms?.length ?? 0) === 0 &&
    (summary.autofind?.length ?? 0) === 0 &&
    (summary.gpon_ports?.length ?? 0) === 0;

  return emptyEverything && (
    message.includes("reenter times have reached the upper limit") ||
    message.includes("bloqueou") ||
    message.includes("timeout")
  );
}

export function Dashboard() {
  const { user, openSidebar } = useOutletContext<{ user: AuthToken; openSidebar: () => void }>();
  const cached = readDashboardCache();
  const [status, setStatus] = useState<{ connected: boolean; message: string } | null>(cached?.status ?? null);
  const [boards, setBoards] = useState<Board[]>(cached?.boards ?? []);
  const [alarms, setAlarms] = useState<Alarm[]>(cached?.alarms ?? []);
  const [autofind, setAutofind] = useState<AutofindONT[]>(cached?.autofind ?? []);
  const [gponPorts, setGponPorts] = useState(cached?.gpon_ports ?? []);
  const [ontsTotal, setOntsTotal] = useState(cached?.onts_total ?? 0);
  const [ontsOnline, setOntsOnline] = useState(cached?.onts_online ?? 0);
  const [metrics, setMetrics] = useState(cached?.metrics ?? null);
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const load = async () => {
      setRefreshing(true);
      try {
        const { data } = await getDashboardSummary();
        const summary = data as DashboardSummary;
        if (looksLikeTransientOltBlock(summary)) {
          setStatus(summary.status);
          return;
        }
        writeDashboardCache(summary);
        setStatus(summary.status);
        setBoards(summary.boards ?? []);
        setAlarms(summary.alarms ?? []);
        setAutofind(summary.autofind ?? []);
        setGponPorts(summary.gpon_ports ?? []);
        setOntsTotal(summary.onts_total ?? 0);
        setOntsOnline(summary.onts_online ?? 0);
        setMetrics(summary.metrics ?? null);
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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <div className="mb-3 flex items-center gap-3">
            <button
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 transition hover:border-brand-200 hover:text-brand-700 md:hidden"
              onClick={openSidebar}
              aria-label="Abrir menu"
            >
              <span className="material-symbols-outlined text-[20px]">menu</span>
            </button>
            <div className="eyebrow">OLT Summary</div>
          </div>
          <h1 className="font-display text-[1.7rem] font-semibold leading-[1.02] tracking-[-0.03em] text-ink-900 md:text-[2.15rem]">
            Estado operacional da MA5800-X2
          </h1>
          <p className="mt-2 max-w-3xl text-[14px] leading-6 text-ink-500">
            Visao consolidada da fibra, inventário, alarmes e telemetria operacional da OLT.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden rounded-[0.95rem] border border-ink-200 bg-white px-4 py-2.5 sm:block">
            <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">Sessão</div>
            <div className="text-[13px] font-semibold text-ink-900">{user.full_name || user.username}</div>
          </div>
          <div className="hidden h-9 w-9 items-center justify-center rounded-full border border-ink-200 bg-white text-sm font-medium text-ink-700 sm:flex">
            {user.username.charAt(0).toUpperCase()}
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            {status?.connected ? "System online" : "Snapshot degradado"}
          </div>
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
            {refreshing ? "Sync em andamento" : "Sync local"}
          </span>
        </div>
      </div>

      {loading && <div className="panel-muted px-4 py-3 text-[13px] text-ink-500">Carregando telemetria da OLT...</div>}

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
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

      <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        <MetricTile
          label="Portas GPON online"
          value={metrics ? `${metrics.gpon_ports_online}/${metrics.gpon_ports_total}` : "—"}
          note="Estado das portas lidas"
        />
        <MetricTile
          label="Temperatura média"
          value={formatMetric(metrics?.avg_port_temperature_c, "°C")}
          note="Média das portas GPON"
          tone="brand"
        />
        <MetricTile
          label="Pico de temperatura"
          value={formatMetric(metrics?.max_port_temperature_c, "°C")}
          note="Maior leitura no snapshot"
          tone={metrics && (metrics.max_port_temperature_c ?? 0) >= 50 ? "danger" : "normal"}
        />
        <MetricTile
          label="Banda disponível"
          value={formatMetric(metrics?.total_available_bandwidth_gbps, "Gbps")}
          note="Soma das portas GPON"
        />
      </section>

      <div className="grid gap-5 lg:grid-cols-12">
        <Section
          title="Temperatura e TX por porta GPON"
          subtitle="Distribuição instantânea das leituras por porta, útil para visualizar desvio térmico e transmissão."
          className="lg:col-span-8"
        >
          {gponPorts.length === 0 ? (
            <EmptyState text="Sem leitura de portas GPON no snapshot atual." />
          ) : (
            <PortTelemetryChart ports={gponPorts} />
          )}
        </Section>

        <Section
          title="Alertas ativos"
          subtitle="Eventos correntes que exigem atenção ou acompanhamento."
          className="lg:col-span-4"
        >
          {alarms.length === 0 ? (
            <EmptyState text="Nenhum alarme ativo no snapshot atual." tone="ok" />
          ) : (
            <div className="space-y-3">
              {alarms.slice(0, 5).map((alarm) => (
                <div key={alarm.seq} className="panel-muted px-4 py-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[13px] font-medium text-ink-900">{alarm.name}</div>
                      <div className="mt-1 text-[11px] text-ink-500">{alarm.location}</div>
                    </div>
                    <StatusBadge value={alarm.severity} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Section title="Boards e chassis" subtitle="Leitura resumida da control board e estado principal." link="/onts">
          {boards.length === 0 ? (
            <EmptyState text="Nenhuma board retornada pela OLT." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-[13px]">
                <thead>
                  <tr className="border-b border-ink-100 text-left text-[10px] uppercase tracking-[0.16em] text-ink-400">
                    <th className="pb-2.5">Slot</th>
                    <th className="pb-2.5">Board</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5">Presenca</th>
                    <th className="pb-2.5">Tipo</th>
                  </tr>
                </thead>
                <tbody>
                  {boards.map((board) => (
                    <tr key={`${board.slot}-${board.board_name}`} className="border-b border-ink-100/80 last:border-0">
                      <td className="py-2.5 font-mono text-[12px] text-ink-700">{board.slot}</td>
                      <td className="py-2.5 font-medium text-ink-900">{board.board_name}</td>
                      <td className="py-2.5"><StatusBadge value={board.status} /></td>
                      <td className="py-2.5">
                        {board.online_state ? <StatusBadge value={board.online_state} /> : <span className="text-ink-400">—</span>}
                      </td>
                      <td className="py-2.5 text-ink-500">{board.sub_type || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <Section
          title="Capacidade por porta"
          subtitle="Banda disponível e status operacional atual de cada porta GPON."
        >
          {gponPorts.length === 0 ? (
            <EmptyState text="Sem portas GPON disponíveis para exibir." />
          ) : (
            <div className="space-y-3">
              {gponPorts.map((port) => (
                <div key={`${port.frame}-${port.slot}-${port.port}`} className="panel-muted px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-mono text-[11px] text-ink-700">
                        {port.frame}/{port.slot}/{port.port}
                      </div>
                      <div className="mt-1 text-[12px] text-ink-500">
                        {formatMetric(toNumber(port.available_bandwidth_kbps) / 1_000_000, "Gbps")} disponíveis
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge value={port.port_state || "—"} />
                      <StatusBadge value={port.optical_module_status || "—"} />
                    </div>
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
            <table className="w-full min-w-[40rem] text-[13px]">
              <thead>
                <tr className="border-b border-ink-100 text-left text-[10px] uppercase tracking-[0.16em] text-ink-400">
                  <th className="pb-2.5">PON</th>
                  <th className="pb-2.5">Serial</th>
                  <th className="pb-2.5">Vendor</th>
                  <th className="pb-2.5">Descoberto em</th>
                  <th className="pb-2.5"></th>
                </tr>
              </thead>
              <tbody>
                {autofind.slice(0, 5).map((ont, index) => (
                  <tr key={`${ont.sn}-${index}`} className="border-b border-ink-100/80 last:border-0">
                    <td className="py-2.5 font-mono text-[12px] text-ink-700">{ont.frame}/{ont.slot}/{ont.port}</td>
                    <td className="py-2.5 font-mono text-[13px] font-semibold text-brand-700">{ont.sn}</td>
                    <td className="py-2.5 text-ink-500">{ont.vendor_id}</td>
                    <td className="py-2.5 text-[11px] text-ink-400">{ont.found_at}</td>
                    <td className="py-2.5 text-right">
                      <Link
                        to={`/provision?sn=${ont.sn}&port=${ont.port}`}
                        className="inline-flex items-center rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-700 transition hover:bg-brand-100"
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
    <div className={`relative overflow-hidden rounded-[1rem] border px-5 py-4 shadow-panel ${tones[tone].panel}`}>
      <div className={`absolute inset-x-0 top-0 h-1 ${tones[tone].line}`} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
          <div className="mt-5 text-[1.75rem] font-semibold leading-none text-ink-900 md:text-[1.95rem]">
            {value}
            {total !== undefined && <span className="ml-2 text-[0.95rem] text-ink-400">/ {total}</span>}
          </div>
        </div>
        <div className="font-mono rounded-full border border-white/80 bg-white/85 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-ink-500">
          Live
        </div>
      </div>
      {note && <div className="mt-4 text-[13px] text-ink-500">{note}</div>}
    </div>
  );

  return link ? <Link to={link}>{content}</Link> : content;
}

function Section({
  title,
  subtitle,
  children,
  link,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  link?: string;
  className?: string;
}) {
  return (
    <section className={`panel px-5 py-5 md:px-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-[1.05rem] font-semibold tracking-[-0.01em] text-ink-900">{title}</h3>
          {subtitle && <p className="mt-1.5 text-[13px] leading-6 text-ink-500">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link} className="font-mono rounded-full border border-ink-200 bg-white/80 px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] text-ink-600 transition hover:bg-white">
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
    <div className={`panel-muted px-4 py-4 text-[13px] ${tone === "ok" ? "text-brand-700" : "text-ink-500"}`}>
      {text}
    </div>
  );
}

function MetricTile({
  label,
  value,
  note,
  tone = "normal",
}: {
  label: string;
  value: string;
  note: string;
  tone?: "normal" | "brand" | "danger";
}) {
  const toneClass = {
    normal: "border-ink-200 bg-white",
    brand: "border-brand-200 bg-brand-50/45",
    danger: "border-red-200 bg-red-50/55",
  } as const;

  return (
    <div className={`rounded-[1rem] border px-4 py-4 ${toneClass[tone]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">{label}</div>
      <div className="mt-3 text-[1.1rem] font-semibold text-ink-900">{value}</div>
      <div className="mt-1.5 text-[12px] text-ink-500">{note}</div>
    </div>
  );
}

function PortTelemetryChart({
  ports,
}: {
  ports: Array<{
    frame: number;
    slot: number;
    port: number;
    temperature_c: string;
    tx_power_dbm: string;
  }>;
}) {
  const maxTemperature = Math.max(
    ...ports.map((port) => toNumber(port.temperature_c)).filter((value) => Number.isFinite(value)),
    1,
  );
  const txValues = ports.map((port) => toNumber(port.tx_power_dbm)).filter((value) => Number.isFinite(value));
  const minTx = txValues.length ? Math.min(...txValues) : 0;
  const maxTx = txValues.length ? Math.max(...txValues) : 1;
  const txRange = Math.max(1, maxTx - minTx);

  return (
    <div className="space-y-3">
      {ports.map((port) => {
        const temperature = toNumber(port.temperature_c);
        const txPower = toNumber(port.tx_power_dbm);
        const temperatureWidth = Number.isFinite(temperature) ? Math.max(6, (temperature / maxTemperature) * 100) : 0;
        const txWidth = Number.isFinite(txPower) ? Math.max(6, ((txPower - minTx) / txRange) * 100) : 0;

        return (
          <div key={`${port.frame}-${port.slot}-${port.port}`} className="rounded-[1rem] border border-ink-100 bg-white px-4 py-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="font-mono text-[11px] text-ink-700">
                Porta {port.frame}/{port.slot}/{port.port}
              </div>
              <div className="text-[12px] text-ink-500">
                {formatMetric(temperature, "°C")} • {formatMetric(txPower, "dBm")}
              </div>
            </div>
            <div className="space-y-2">
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-ink-400">
                  <span>Temperatura</span>
                  <span>{formatMetric(temperature, "°C")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-amber-400" style={{ width: `${temperatureWidth}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-1 flex items-center justify-between text-[11px] text-ink-400">
                  <span>TX power</span>
                  <span>{formatMetric(txPower, "dBm")}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-ink-100">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${txWidth}%` }} />
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function formatMetric(value: number | null | undefined, unit: string) {
  if (value == null || Number.isNaN(value)) {
    return "—";
  }

  return `${value.toFixed(2)} ${unit}`;
}

function toNumber(value: string | number | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}
