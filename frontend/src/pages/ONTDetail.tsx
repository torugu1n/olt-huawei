import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteOnt, deleteServicePort, getOnt, getOntOptical, getOntWan, rebootOnt } from "../api/client";
import { ONT, OpticalInfo, ServicePort } from "../types";
import { StatusBadge } from "../components/StatusBadge";

type OpticalSample = {
  ts: number;
  rx: number | null;
  tx: number | null;
};

export function ONTDetail() {
  const { slot, port, ont_id } = useParams<{ slot: string; port: string; ont_id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ONT | null>(null);
  const [optical, setOptical] = useState<OpticalInfo | null>(null);
  const [opticalHistory, setOpticalHistory] = useState<OpticalSample[]>([]);
  const [servicePorts, setServicePorts] = useState<ServicePort[]>([]);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [wanInfo, setWanInfo] = useState("");
  const [opticalError, setOpticalError] = useState("");
  const [loadingOptical, setLoadingOptical] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [opticalCooldownUntil, setOpticalCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const s = Number(slot);
  const p = Number(port);
  const o = Number(ont_id);
  const historyStorageKey = useMemo(() => `ont-optical-history:${s}:${p}:${o}`, [s, p, o]);

  const persistOpticalHistory = (samples: OpticalSample[]) => {
    setOpticalHistory(samples);
    localStorage.setItem(historyStorageKey, JSON.stringify(samples));
  };

  const appendOpticalSample = (source?: OpticalInfo | null) => {
    const rx = parseNumeric(source?.rx_power_dbm);
    const tx = parseNumeric(source?.tx_power_dbm);

    if (!Number.isFinite(rx) && !Number.isFinite(tx)) {
      return;
    }

    setOpticalHistory((prev) => {
      const last = prev[prev.length - 1];
      const nextSample: OpticalSample = {
        ts: Date.now(),
        rx: Number.isFinite(rx) ? rx : null,
        tx: Number.isFinite(tx) ? tx : null,
      };

      if (
        last &&
        last.rx === nextSample.rx &&
        last.tx === nextSample.tx &&
        nextSample.ts - last.ts < 20_000
      ) {
        return prev;
      }

      const next = [...prev, nextSample].slice(-24);
      localStorage.setItem(historyStorageKey, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    try {
      const rawHistory = localStorage.getItem(historyStorageKey);
      if (!rawHistory) {
        setOpticalHistory([]);
        return;
      }

      const parsed = JSON.parse(rawHistory) as OpticalSample[];
      if (!Array.isArray(parsed)) {
        setOpticalHistory([]);
        return;
      }

      setOpticalHistory(
        parsed
          .filter((sample) => typeof sample?.ts === "number")
          .slice(-24)
          .map((sample) => ({
            ts: sample.ts,
            rx: typeof sample.rx === "number" ? sample.rx : null,
            tx: typeof sample.tx === "number" ? sample.tx : null,
          }))
      );
    } catch {
      setOpticalHistory([]);
    }
  }, [historyStorageKey]);

  const refreshDetail = async ({ silent = false }: { silent?: boolean } = {}) => {
    if (silent) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const { data } = await getOnt(s, p, o);
      setInfo(data.info);
      setOptical(data.optical);
      setServicePorts(data.service_ports ?? []);
      setRaw(data.raw ?? {});
      setOpticalError("");
      appendOpticalSample(data.optical);

      if (!data.optical || Object.keys(data.optical).length === 0) {
        await fetchOptical({ background: true });
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao carregar ONT");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshDetail();
  }, [s, p, o]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshDetail({ silent: true });
      }
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [s, p, o]);

  useEffect(() => {
    if (!opticalCooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [opticalCooldownUntil]);

  const fetchOptical = async ({ background = false }: { background?: boolean } = {}) => {
    if (!background) {
      setLoadingOptical(true);
      setOpticalError("");
    }

    try {
      const { data } = await getOntOptical(s, p, o);
      setOptical(data.optical ?? {});
      setRaw((prev) => ({ ...prev, optical: data.raw ?? prev.optical ?? "" }));
      appendOpticalSample(data.optical);
      if ((!data.optical || Object.keys(data.optical).length === 0) && !background) {
        setOpticalError("A OLT nao retornou o sinal óptico para esta ONT.");
      }
    } catch (e: any) {
      const rawDetail = e?.response?.data?.detail ?? "Erro ao consultar sinal óptico";
      const normalizedDetail = /reenter times have reached the upper limit/i.test(String(rawDetail))
        ? "A OLT bloqueou temporariamente novas consultas SSH. Aguarde 60s antes de tentar novamente."
        : rawDetail;

      if (!background) {
        setOpticalError(normalizedDetail);
      }

      if (/reenter times have reached the upper limit/i.test(String(rawDetail))) {
        setOpticalCooldownUntil(Date.now() + 60_000);
        return;
      }

      const waitMatch = String(normalizedDetail).match(/aguarde\s+(\d+)s/i);
      if (waitMatch) {
        setOpticalCooldownUntil(Date.now() + Number(waitMatch[1]) * 1000);
      }
    } finally {
      if (!background) {
        setLoadingOptical(false);
      }
    }
  };

  const loadOptical = async () => {
    await fetchOptical();
  };

  const loadWan = async () => {
    const { data } = await getOntWan(s, p, o);
    setWanInfo(data.output);
  };

  const handleDelete = async () => {
    if (!confirm(`Remover ONT ${info?.sn}?`)) return;
    await deleteOnt(s, p, o);
    navigate("/onts");
  };

  const handleReboot = async () => {
    if (!confirm("Reiniciar esta ONT?")) return;
    await rebootOnt(s, p, o);
    alert("Comando de reboot enviado");
  };

  const handleDeleteSP = async (idx: number) => {
    if (!confirm(`Remover service-port ${idx}?`)) return;
    await deleteServicePort(idx);
    setServicePorts((prev) => prev.filter((sp) => sp.index !== idx));
  };

  const opticalCooldownSeconds = Math.max(0, Math.ceil((opticalCooldownUntil - now) / 1000));
  const rxPower = parseFloat(optical?.rx_power_dbm ?? "NaN");
  const txPower = parseFloat(optical?.tx_power_dbm ?? "NaN");
  const signalHealth = useMemo(() => getOpticalHealth(rxPower), [rxPower]);
  const onlineDuration = compactDuration(info?.online_duration ?? "—");
  const signalMeterValue = Number.isFinite(rxPower) ? clamp(((rxPower - -27) / 19) * 100, 0, 100) : 0;
  const latestOpticalTimestamp = opticalHistory.length > 0 ? opticalHistory[opticalHistory.length - 1]?.ts : null;

  if (loading) {
    return <div className="panel px-6 py-5 text-sm text-ink-500">Carregando telemetria da ONT...</div>;
  }

  if (error) {
    return <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-5">
      <header className="panel px-5 py-5 md:px-6">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-ink-400">
              <span>Dispositivos</span>
              <span>/</span>
              <span>Monitoramento</span>
              <span>/</span>
              <span className="text-brand-700">{info?.description || info?.sn}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-[1.6rem] font-semibold tracking-[-0.03em] text-ink-900 md:text-[2.1rem]">
                ONT {info?.description ? `— ${info.description}` : `— ${info?.sn}`}
              </h1>
              <StatusBadge value={info?.run_state ?? "—"} />
              <StatusBadge value={info?.config_state ?? "—"} />
            </div>
            <p className="mt-2 text-[13px] leading-6 text-ink-500">
              ID {ont_id} • PON 0/{slot}/{port} • Serial {info?.sn}
            </p>
            {refreshing ? <p className="mt-2 text-xs text-ink-400">Atualizando leitura automaticamente...</p> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => refreshDetail()} className="rounded-full border border-brand-200 bg-brand-50 px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-brand-700 transition hover:bg-brand-100">
              Atualizar
            </button>
            <button onClick={handleReboot} className="rounded-full border border-amber-200 bg-amber-50 px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-800 transition hover:bg-amber-100">
              Reboot
            </button>
            <button onClick={handleDelete} className="rounded-full border border-red-200 bg-red-50 px-3.5 py-2 text-[10px] font-medium uppercase tracking-[0.14em] text-red-700 transition hover:bg-red-100">
              Remover
            </button>
          </div>
        </div>
      </header>

      <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Sinal óptico RX"
          value={Number.isFinite(rxPower) ? `${rxPower.toFixed(2)} dBm` : "Sem leitura"}
          note="-27 dBm crítico • -8 dBm máximo"
          accent={signalHealth.accent}
          meter={signalMeterValue}
        />
        <MetricCard
          title="Potência TX"
          value={Number.isFinite(txPower) ? `${txPower.toFixed(2)} dBm` : "Sem leitura"}
          note="Leitura da transmissão da ONT"
          meter={Number.isFinite(txPower) ? clamp(((txPower + 5) / 10) * 100, 0, 100) : undefined}
        />
        <MetricCard
          title="Tempo de atividade"
          value={onlineDuration}
          note={info?.last_up_time ? `Último up: ${info.last_up_time}` : "Sem timestamp de subida"}
        />
        <MetricCard
          title="Perfis"
          value={joinParts(info?.lineprofile_id, info?.srvprofile_id) ?? "—"}
          note={joinParts(info?.lineprofile_name, info?.srvprofile_name) ?? "Sem nome de perfil"}
        />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Resumo operacional" subtitle="Identidade da ONT e parâmetros aplicados na sessão atual.">
          <div className="grid gap-6 lg:grid-cols-2">
            <InfoList
              rows={[
                ["Descrição", info?.description],
                ["Control flag", info?.control_flag],
                ["Match state", info?.match_state],
                ["Management mode", info?.management_mode],
                ["Authentic type", info?.authentic_type],
                ["DBA type", info?.dba_type],
              ]}
            />
            <InfoList
              rows={[
                ["Line profile", joinParts(info?.lineprofile_id, info?.lineprofile_name)],
                ["Service profile", joinParts(info?.srvprofile_id, info?.srvprofile_name)],
                ["Mapping mode", info?.mapping_mode],
                ["QoS mode", info?.qos_mode],
                ["OMCC encrypt", info?.omcc_encrypt_switch],
                ["FEC upstream", info?.fec_upstream_state],
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Sinal óptico" subtitle="Consulta da potência da ONT e métricas ópticas disponíveis para esta porta.">
          {opticalHistory.length > 0 ? (
            <div className="mb-5 rounded-[1.1rem] border border-ink-100 bg-ink-50/80 px-4 py-3.5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">Tendência recente</div>
                  <div className="mt-1 text-sm text-ink-500">
                    {latestOpticalTimestamp ? `Última amostra ${formatRelativeTime(latestOpticalTimestamp)}` : "Histórico local desta sessão"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.14em] text-ink-400">
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-brand-500" />
                    RX
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1">
                    <span className="h-2 w-2 rounded-full bg-amber-400" />
                    TX
                  </span>
                </div>
              </div>
              <OpticalTrendChart history={opticalHistory} />
            </div>
          ) : null}

          {optical && Object.keys(optical).length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <InfoTile label="RX Power" value={formatUnit(optical.rx_power_dbm, "dBm")} emphasis={signalHealth.accent === "brand" ? "brand" : signalHealth.accent === "danger" ? "danger" : "normal"} />
              <InfoTile label="TX Power" value={formatUnit(optical.tx_power_dbm, "dBm")} />
              <InfoTile label="OLT RX" value={formatUnit(optical.olt_rx_power_dbm, "dBm")} />
              <InfoTile label="Temperatura" value={formatUnit(optical.temperature_c, "°C")} />
              <InfoTile label="Tensão" value={formatUnit(optical.voltage_v, "V")} />
              <InfoTile label="Corrente laser" value={formatUnit(optical.laser_bias_ma, "mA")} />
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-ink-500">Sem leitura óptica válida neste snapshot.</p>
              <button
                onClick={loadOptical}
                disabled={loadingOptical || opticalCooldownSeconds > 0}
                className="action-primary"
              >
                {loadingOptical ? "Consultando sinal..." : opticalCooldownSeconds > 0 ? `Aguardar ${opticalCooldownSeconds}s` : "Carregar sinal óptico"}
              </button>
              {opticalError ? <p className="text-xs text-red-700">{opticalError}</p> : null}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <SectionCard title="Hardware e histórico" subtitle="Campos estáveis da ONT úteis para diagnóstico e auditoria.">
          <div className="grid gap-6 lg:grid-cols-2">
            <InfoList
              rows={[
                ["Distância", info?.distance_m ? `${info.distance_m} m` : undefined],
                ["Software work mode", info?.software_work_mode],
                ["Isolation state", info?.isolation_state],
                ["Interoperability", info?.interoperability_mode],
                ["Power reduction", info?.power_reduction_status],
                ["Battery state", info?.battery_state],
                ["Power type", info?.power_type],
              ]}
            />
            <InfoList
              rows={[
                ["CPU occupation", info?.cpu_occupation],
                ["Memory occupation", info?.memory_occupation],
                ["Last up time", info?.last_up_time],
                ["Last down time", info?.last_down_time],
                ["Last down cause", info?.last_down_cause],
                ["Last restart reason", info?.last_restart_reason],
              ]}
            />
          </div>
        </SectionCard>

        <SectionCard title="Ações e WAN" subtitle="Ações rápidas e saídas auxiliares da OLT sob demanda.">
          <div className="space-y-4">
            <div className="panel-muted px-4 py-4">
              <div className="text-sm font-medium text-ink-900">WAN Info</div>
              <div className="mt-1 text-sm text-ink-500">Carrega o retorno bruto da OLT para a sessão WAN desta ONT.</div>
              <button onClick={loadWan} className="action-secondary mt-4">
                {wanInfo ? "Atualizar WAN" : "Carregar WAN"}
              </button>
            </div>

            {wanInfo ? (
              <pre className="overflow-x-auto rounded-[1.25rem] border border-ink-200 bg-ink-900 p-4 text-xs text-emerald-300 whitespace-pre-wrap">
                {wanInfo}
              </pre>
            ) : null}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Service Ports" subtitle="Mapeamento de VLAN e GEM Port configurado para esta ONT.">
        {servicePorts.length === 0 ? (
          <p className="text-sm text-ink-500">Nenhum service-port configurado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-[13px]">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-ink-400">
                  <th className="px-4 py-3.5">Index</th>
                  <th className="px-4 py-3.5">VLAN</th>
                  <th className="px-4 py-3.5">GEM Port</th>
                  <th className="px-4 py-3.5">Estado</th>
                  <th className="px-4 py-3.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {servicePorts.map((sp) => (
                  <tr key={sp.index} className="border-b border-ink-100/80 last:border-0">
                    <td className="px-4 py-3.5 font-mono text-[12px] text-ink-700">{sp.index}</td>
                    <td className="px-4 py-3.5 text-ink-700">{sp.vlan}</td>
                    <td className="px-4 py-3.5 text-ink-700">{sp.gemport}</td>
                    <td className="px-4 py-3.5"><StatusBadge value={sp.state} /></td>
                    <td className="px-4 py-3.5 text-right">
                      <button onClick={() => handleDeleteSP(sp.index)} className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.14em] text-red-700 transition hover:bg-red-100">
                        Remover
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Saída técnica da OLT" subtitle="Retorno bruto usado pelo parser atual para leitura e depuração.">
        <details>
          <summary className="cursor-pointer list-none rounded-[1rem] border border-ink-200 bg-white px-4 py-3 text-[13px] font-medium text-ink-800 transition hover:bg-ink-50">
            Ver saída técnica da OLT
          </summary>
          <div className="mt-4 space-y-4">
            {Object.entries(raw).map(([key, value]) => (
              <div key={key} className="overflow-hidden rounded-[1.25rem] border border-ink-200 bg-white">
                <div className="border-b border-ink-100 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  {key}
                </div>
                <pre className="overflow-x-auto bg-ink-900 px-4 py-4 text-xs text-emerald-300 whitespace-pre-wrap">
                  {value}
                </pre>
              </div>
            ))}
          </div>
        </details>
      </SectionCard>
    </div>
  );
}

function MetricCard({
  title,
  value,
  note,
  accent = "normal",
  meter,
}: {
  title: string;
  value: string;
  note: string;
  accent?: "normal" | "brand" | "danger";
  meter?: number;
}) {
  const accentClass = {
    normal: "border-ink-200 bg-white",
    brand: "border-brand-200 bg-brand-50/60",
    danger: "border-red-200 bg-red-50/65",
  } as const;

  return (
    <div className={`panel px-5 py-5 ${accentClass[accent]}`}>
      <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-400">{title}</div>
      <div className="mt-4 text-[1.55rem] font-semibold leading-none text-ink-900 md:text-[1.75rem]">{value}</div>
      {meter !== undefined ? (
        <div className="mt-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-ink-100">
            <div
              className={`h-full rounded-full ${
                accent === "danger" ? "bg-red-400" : accent === "brand" ? "bg-brand-500" : "bg-ink-400"
              }`}
              style={{ width: `${meter}%` }}
            />
          </div>
        </div>
      ) : null}
      <div className="mt-4 text-[13px] leading-6 text-ink-500">{note}</div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel px-5 py-5 md:px-6">
      <div className="mb-5">
        <h2 className="font-display text-[1.15rem] font-semibold tracking-[-0.02em] text-ink-900">{title}</h2>
        {subtitle ? <p className="mt-1.5 text-[14px] leading-6 text-ink-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function InfoList({ rows }: { rows: Array<[string, React.ReactNode]> }) {
  const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== "");
  return (
    <div className="space-y-3">
      {visibleRows.map(([label, value]) => (
        <div key={label} className="panel-muted flex items-center justify-between gap-4 px-4 py-2.5">
          <span className="text-[13px] text-ink-500">{label}</span>
          <span className="text-right text-[13px] font-medium text-ink-900">{value}</span>
        </div>
      ))}
    </div>
  );
}

function InfoTile({
  label,
  value,
  emphasis = "normal",
}: {
  label: string;
  value: string;
  emphasis?: "normal" | "brand" | "danger";
}) {
  const emphasisClass = {
    normal: "text-ink-900",
    brand: "text-brand-700",
    danger: "text-red-700",
  } as const;

  return (
    <div className="panel-muted px-4 py-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-ink-400">{label}</div>
      <div className={`mt-1.5 text-[13px] font-semibold ${emphasisClass[emphasis]}`}>{value}</div>
    </div>
  );
}

function OpticalTrendChart({ history }: { history: OpticalSample[] }) {
  const points = history.slice(-12);
  const rxValues = points.map((sample) => sample.rx).filter((value): value is number => typeof value === "number");
  const txValues = points.map((sample) => sample.tx).filter((value): value is number => typeof value === "number");
  const allValues = [...rxValues, ...txValues];

  if (allValues.length === 0) {
    return <p className="text-sm text-ink-500">Ainda não há pontos válidos para desenhar o gráfico.</p>;
  }

  const width = 640;
  const height = 180;
  const padding = 16;
  const minValue = Math.floor(Math.min(...allValues, -27) - 1);
  const maxValue = Math.ceil(Math.max(...allValues, 3) + 1);
  const range = Math.max(1, maxValue - minValue);
  const stepX = points.length > 1 ? (width - padding * 2) / (points.length - 1) : 0;

  const toY = (value: number) => padding + ((maxValue - value) / range) * (height - padding * 2);
  const buildPath = (key: "rx" | "tx") =>
    points
      .map((sample, index) => {
        const value = sample[key];
        if (typeof value !== "number") return null;
        const x = padding + index * stepX;
        const y = toY(value);
        return `${index === 0 || points.slice(0, index).every((prev) => typeof prev[key] !== "number") ? "M" : "L"} ${x} ${y}`;
      })
      .filter(Boolean)
      .join(" ");

  const rxPath = buildPath("rx");
  const txPath = buildPath("tx");
  const guideValues = [maxValue, (maxValue + minValue) / 2, minValue];

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-[1rem] border border-ink-100 bg-white px-3 py-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full">
          {guideValues.map((value) => {
            const y = toY(value);
            return (
              <g key={value}>
                <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(148, 163, 184, 0.24)" strokeDasharray="4 6" />
                <text x={padding} y={y - 6} fill="rgba(100, 116, 139, 0.9)" fontSize="10">
                  {value.toFixed(1)} dBm
                </text>
              </g>
            );
          })}

          {rxPath ? <path d={rxPath} fill="none" stroke="rgb(79, 70, 229)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /> : null}
          {txPath ? <path d={txPath} fill="none" stroke="rgb(245, 158, 11)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.9" /> : null}

          {points.map((sample, index) => {
            const x = padding + index * stepX;
            return (
              <g key={sample.ts}>
                {typeof sample.rx === "number" ? <circle cx={x} cy={toY(sample.rx)} r="3.5" fill="rgb(79, 70, 229)" /> : null}
                {typeof sample.tx === "number" ? <circle cx={x} cy={toY(sample.tx)} r="3" fill="rgb(245, 158, 11)" /> : null}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center justify-between text-xs text-ink-400">
        <span>{points.length > 1 ? formatShortTime(points[0].ts) : "agora"}</span>
        <span>{points.length} amostras locais</span>
        <span>{formatShortTime(points[points.length - 1].ts)}</span>
      </div>
    </div>
  );
}

function formatUnit(value?: string, unit?: string) {
  if (!value) return "—";
  return unit ? `${value} ${unit}` : value;
}

function joinParts(...parts: Array<string | number | undefined>) {
  const filtered = parts.filter((part) => part !== undefined && part !== null && part !== "");
  return filtered.length > 0 ? filtered.join(" • ") : undefined;
}

function compactDuration(value: string) {
  return value
    .replace(/day\(s\)/gi, "d")
    .replace(/hour\(s\)/gi, "h")
    .replace(/minute\(s\)/gi, "m")
    .replace(/second\(s\)/gi, "s")
    .replace(/\s*,\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getOpticalHealth(rxPower: number) {
  if (!Number.isFinite(rxPower)) return { accent: "normal" as const };
  if (rxPower <= -27) return { accent: "danger" as const };
  if (rxPower <= -24) return { accent: "brand" as const };
  return { accent: "brand" as const };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseNumeric(value?: string) {
  if (!value) return Number.NaN;
  const normalized = String(value).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return normalized ? Number(normalized[0]) : Number.NaN;
}

function formatRelativeTime(timestamp: number) {
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s atrás`;
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}min atrás`;
  const diffHours = Math.round(diffMinutes / 60);
  return `${diffHours}h atrás`;
}

function formatShortTime(timestamp: number) {
  return new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}
