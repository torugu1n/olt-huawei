import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteOnt, deleteServicePort, getOnt, getOntOptical, getOntWan, rebootOnt } from "../api/client";
import { ONT, OpticalInfo, ServicePort } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export function ONTDetail() {
  const { slot, port, ont_id } = useParams<{ slot: string; port: string; ont_id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ONT | null>(null);
  const [optical, setOptical] = useState<OpticalInfo | null>(null);
  const [servicePorts, setServicePorts] = useState<ServicePort[]>([]);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [wanInfo, setWanInfo] = useState("");
  const [opticalError, setOpticalError] = useState("");
  const [loadingOptical, setLoadingOptical] = useState(false);
  const [opticalCooldownUntil, setOpticalCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const s = Number(slot);
  const p = Number(port);
  const o = Number(ont_id);

  useEffect(() => {
    setLoading(true);
    setError("");
    getOnt(s, p, o)
      .then(({ data }) => {
        setInfo(data.info);
        setOptical(data.optical);
        setServicePorts(data.service_ports ?? []);
        setRaw(data.raw ?? {});
        setOpticalError("");
      })
      .catch((e) => setError(e?.response?.data?.detail ?? "Erro ao carregar ONT"))
      .finally(() => setLoading(false));
  }, [s, p, o]);

  useEffect(() => {
    if (!opticalCooldownUntil) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [opticalCooldownUntil]);

  const loadOptical = async () => {
    setLoadingOptical(true);
    setOpticalError("");
    try {
      const { data } = await getOntOptical(s, p, o);
      setOptical(data.optical ?? {});
      setRaw((prev) => ({ ...prev, optical: data.raw ?? "" }));
      if (!data.optical || Object.keys(data.optical).length === 0) {
        setOpticalError("A OLT nao retornou o sinal óptico para esta ONT.");
      }
    } catch (e: any) {
      const rawDetail = e?.response?.data?.detail ?? "Erro ao consultar sinal óptico";
      const normalizedDetail = /reenter times have reached the upper limit/i.test(String(rawDetail))
        ? "A OLT bloqueou temporariamente novas consultas SSH. Aguarde 60s antes de tentar novamente."
        : rawDetail;

      setOpticalError(normalizedDetail);

      if (/reenter times have reached the upper limit/i.test(String(rawDetail))) {
        setOpticalCooldownUntil(Date.now() + 60_000);
        return;
      }

      const waitMatch = String(normalizedDetail).match(/aguarde\s+(\d+)s/i);
      if (waitMatch) {
        setOpticalCooldownUntil(Date.now() + Number(waitMatch[1]) * 1000);
      }
    } finally {
      setLoadingOptical(false);
    }
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
    alert("Reboot enviado");
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
  const rxMeter = Number.isFinite(rxPower) ? clamp(((rxPower - -27) / (-8 - -27)) * 100, 0, 100) : 0;
  const onlineDuration = info?.online_duration?.replace(/second\(s\).*/i, "s") ?? "—";

  if (loading) {
    return <div className="panel px-6 py-5 text-sm text-ink-500">Carregando telemetria da ONT...</div>;
  }

  if (error) {
    return <div className="panel px-6 py-5 text-sm text-red-600">{error}</div>;
  }

  return (
    <div className="space-y-6 rounded-[2rem] bg-[#0f131b] p-6 text-slate-100 shadow-[0_32px_80px_-50px_rgba(7,10,18,0.92)] ring-1 ring-white/6 md:p-8">
      <header className="flex flex-col gap-6 border-b border-white/8 pb-6 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
            <span>Dispositivos</span>
            <span>/</span>
            <span>Monitoramento</span>
            <span>/</span>
            <span className="text-blue-400">{info?.description || info?.sn}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white md:text-4xl">
              ONT {info?.description ? `— ${info.description}` : `— ${info?.sn}`}
            </h1>
            <StatusBadge value={info?.run_state ?? "—"} />
            <StatusBadge value={info?.config_state ?? "—"} />
          </div>
          <p className="mt-3 text-sm text-slate-400">
            ID {ont_id} • PON 0/{slot}/{port} • Serial {info?.sn}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleReboot}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-400/15"
          >
            Reboot
          </button>
          <button
            onClick={handleDelete}
            className="inline-flex items-center gap-2 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-500/15"
          >
            Remover
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.25fr_0.9fr]">
        <div className="space-y-6">
          <MetricCard
            title="Sinal Óptico RX"
            tone={signalHealth.tone}
            status={signalHealth.label}
            value={Number.isFinite(rxPower) ? rxPower.toFixed(2) : "—"}
            unit="dBm"
            meter={rxMeter}
            footer="-27 dBm crítico • -8 dBm máximo"
          />

          <MetricCard
            title="Potência TX"
            tone={Number.isFinite(txPower) ? "emerald" : "slate"}
            status={Number.isFinite(txPower) ? "Estável" : "Sem leitura"}
            value={Number.isFinite(txPower) ? txPower.toFixed(2) : "—"}
            unit="dBm"
          />

          <MetricCard
            title="Tempo de atividade"
            tone="blue"
            status={info?.last_restart_reason ? "Último reboot registrado" : "Operação contínua"}
            value={compactDuration(onlineDuration)}
            unit=""
            footer={info?.last_up_time ? `Último up: ${info.last_up_time}` : "Sem timestamp de subida"}
          />
        </div>

        <GlassCard title="Resumo Operacional" subtitle="Telemetria atual da ONT e parâmetros de sessão lidos diretamente da OLT.">
          <div className="grid gap-6 lg:grid-cols-2">
            <InfoList
              title="Identidade e sessão"
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
              title="Perfis aplicados"
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

          <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.03] p-4">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Sinal óptico detalhado</h3>
                <p className="mt-1 text-xs text-slate-500">Consulta automática a partir do resumo da porta GPON.</p>
              </div>
              {optical && Object.keys(optical).length > 0 ? <StatusBadge value={signalHealth.label} /> : null}
            </div>

            {optical && Object.keys(optical).length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <TelemetryChip label="RX Power" value={formatUnit(optical.rx_power_dbm, "dBm")} accent={signalHealth.accent} />
                <TelemetryChip label="TX Power" value={formatUnit(optical.tx_power_dbm, "dBm")} accent="text-sky-300" />
                <TelemetryChip label="OLT RX" value={formatUnit(optical.olt_rx_power_dbm, "dBm")} />
                <TelemetryChip label="Temperatura" value={formatUnit(optical.temperature_c, "°C")} />
                <TelemetryChip label="Tensão" value={formatUnit(optical.voltage_v, "V")} />
                <TelemetryChip label="Corrente laser" value={formatUnit(optical.laser_bias_ma, "mA")} />
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-400">Sem leitura óptica válida neste snapshot.</p>
                <button
                  onClick={loadOptical}
                  disabled={loadingOptical || opticalCooldownSeconds > 0}
                  className="inline-flex items-center gap-2 rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2.5 text-sm font-medium text-blue-200 transition hover:bg-blue-500/15 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingOptical ? "Consultando sinal..." : opticalCooldownSeconds > 0 ? `Aguardar ${opticalCooldownSeconds}s` : "Carregar sinal óptico"}
                </button>
                {opticalError ? <p className="text-xs text-red-300">{opticalError}</p> : null}
              </div>
            )}
          </div>
        </GlassCard>

        <GlassCard title="Hardware e histórico" subtitle="Campos estáveis da ONT úteis para diagnóstico e auditoria.">
          <InfoList
            rows={[
              ["Distância", info?.distance_m ? `${info.distance_m} m` : undefined],
              ["Software work mode", info?.software_work_mode],
              ["Isolation state", info?.isolation_state],
              ["Interoperability", info?.interoperability_mode],
              ["Power reduction", info?.power_reduction_status],
              ["Battery state", info?.battery_state],
              ["Power type", info?.power_type],
              ["CPU occupation", info?.cpu_occupation],
              ["Memory occupation", info?.memory_occupation],
              ["Last up time", info?.last_up_time],
              ["Last down time", info?.last_down_time],
              ["Last down cause", info?.last_down_cause],
              ["Last restart reason", info?.last_restart_reason],
            ]}
          />
        </GlassCard>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <GlassCard title="Service Ports" subtitle="Mapeamento de VLAN e GEM Port configurado para esta ONT.">
          {servicePorts.length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum service-port configurado.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[34rem] text-sm">
                <thead>
                  <tr className="border-b border-white/8 text-left text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    <th className="pb-3">Index</th>
                    <th className="pb-3">VLAN</th>
                    <th className="pb-3">GEM Port</th>
                    <th className="pb-3">Estado</th>
                    <th className="pb-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {servicePorts.map((sp) => (
                    <tr key={sp.index} className="border-b border-white/8 last:border-0">
                      <td className="py-3 font-mono text-slate-200">{sp.index}</td>
                      <td className="py-3 text-slate-300">{sp.vlan}</td>
                      <td className="py-3 text-slate-300">{sp.gemport}</td>
                      <td className="py-3"><StatusBadge value={sp.state} /></td>
                      <td className="py-3 text-right">
                        <button onClick={() => handleDeleteSP(sp.index)} className="text-xs font-medium text-red-300 transition hover:text-red-200">
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        <GlassCard title="Ações rápidas" subtitle="Consultas adicionais e blocos operacionais sob demanda.">
          <div className="space-y-4">
            <ActionPanel
              title="WAN Info"
              description="Carrega o retorno bruto da OLT para a sessão WAN desta ONT."
              actionLabel={wanInfo ? "Atualizar WAN" : "Carregar WAN"}
              onAction={loadWan}
            />

            {wanInfo ? (
              <pre className="overflow-x-auto rounded-2xl border border-white/8 bg-[#0a0d14] p-4 text-xs text-slate-300 whitespace-pre-wrap">
                {wanInfo}
              </pre>
            ) : null}
          </div>
        </GlassCard>
      </div>

      <GlassCard title="Saída técnica da OLT" subtitle="Retorno bruto usado pelo parser atual para leitura e depuração.">
        <div className="space-y-4">
          {Object.entries(raw).map(([key, value]) => (
            <div key={key} className="overflow-hidden rounded-2xl border border-white/8 bg-[#0a0d14]">
              <div className="border-b border-white/8 px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                {key}
              </div>
              <pre className="overflow-x-auto px-4 py-4 text-xs text-emerald-300 whitespace-pre-wrap">
                {value}
              </pre>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

function GlassCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[1.5rem] border border-white/8 bg-[#171c26]/88 p-5 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.9)] backdrop-blur-sm">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  title,
  status,
  value,
  unit,
  meter,
  footer,
  tone,
}: {
  title: string;
  status: string;
  value: string;
  unit?: string;
  meter?: number;
  footer?: string;
  tone: "emerald" | "amber" | "red" | "blue" | "slate";
}) {
  const tones = {
    emerald: {
      badge: "bg-emerald-500/12 text-emerald-300 border-emerald-400/20",
      meter: "from-emerald-400 to-teal-300",
      value: "text-white",
    },
    amber: {
      badge: "bg-amber-500/12 text-amber-300 border-amber-400/20",
      meter: "from-amber-300 to-orange-300",
      value: "text-white",
    },
    red: {
      badge: "bg-red-500/12 text-red-300 border-red-400/20",
      meter: "from-red-400 to-rose-300",
      value: "text-white",
    },
    blue: {
      badge: "bg-blue-500/12 text-blue-300 border-blue-400/20",
      meter: "from-blue-400 to-cyan-300",
      value: "text-white",
    },
    slate: {
      badge: "bg-white/6 text-slate-300 border-white/10",
      meter: "from-slate-500 to-slate-400",
      value: "text-white",
    },
  } as const;

  return (
    <div className="rounded-[1.5rem] border border-white/8 bg-[#171c26]/88 p-5 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.9)]">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-slate-500">{title}</span>
        <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${tones[tone].badge}`}>
          {status}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span className={`font-display text-4xl font-bold tracking-tight ${tones[tone].value}`}>{value}</span>
        {unit ? <span className="mb-1 font-mono text-sm text-slate-500">{unit}</span> : null}
      </div>
      {meter !== undefined ? (
        <>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/6">
            <div className={`h-full rounded-full bg-gradient-to-r ${tones[tone].meter}`} style={{ width: `${meter}%` }} />
          </div>
          {footer ? <p className="mt-2 text-[11px] text-slate-500">{footer}</p> : null}
        </>
      ) : footer ? (
        <p className="mt-3 text-[11px] text-slate-500">{footer}</p>
      ) : null}
    </div>
  );
}

function InfoList({
  title,
  rows,
}: {
  title?: string;
  rows: Array<[string, React.ReactNode]>;
}) {
  const visibleRows = rows.filter(([, value]) => value !== undefined && value !== null && value !== "");
  if (visibleRows.length === 0) return null;

  return (
    <div>
      {title ? <h3 className="mb-3 text-sm font-semibold text-slate-200">{title}</h3> : null}
      <div className="space-y-2">
        {visibleRows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-white/6 bg-white/[0.02] px-3 py-2.5">
            <span className="text-sm text-slate-500">{label}</span>
            <span className="text-right text-sm text-slate-200">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TelemetryChip({ label, value, accent = "text-slate-200" }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-3">
      <div className="text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      <div className={`mt-2 text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function ActionPanel({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{title}</h3>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <button
          onClick={onAction}
          className="rounded-xl border border-blue-400/25 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-200 transition hover:bg-blue-500/15"
        >
          {actionLabel}
        </button>
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
  if (!Number.isFinite(rxPower)) {
    return { label: "Sem leitura", tone: "slate" as const, accent: "text-slate-200" };
  }
  if (rxPower <= -27) {
    return { label: "Crítico", tone: "red" as const, accent: "text-red-300" };
  }
  if (rxPower <= -24) {
    return { label: "Atenção", tone: "amber" as const, accent: "text-amber-300" };
  }
  return { label: "Saudável", tone: "emerald" as const, accent: "text-emerald-300" };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
