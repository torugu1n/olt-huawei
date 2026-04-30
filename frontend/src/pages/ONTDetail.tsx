import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getOnt, deleteOnt, rebootOnt, deleteServicePort, getOntWan, getOntOptical } from "../api/client";
import { ONT, OpticalInfo, ServicePort } from "../types";
import { StatusBadge } from "../components/StatusBadge";

export function ONTDetail() {
  const { slot, port, ont_id } = useParams<{ slot: string; port: string; ont_id: string }>();
  const navigate = useNavigate();
  const [info, setInfo] = useState<ONT | null>(null);
  const [optical, setOptical] = useState<OpticalInfo | null>(null);
  const [servicePorts, setServicePorts] = useState<ServicePort[]>([]);
  const [raw, setRaw] = useState<Record<string, string>>({});
  const [wanInfo, setWanInfo] = useState<string>("");
  const [opticalError, setOpticalError] = useState("");
  const [loadingOptical, setLoadingOptical] = useState(false);
  const [opticalCooldownUntil, setOpticalCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const s = Number(slot), p = Number(port), o = Number(ont_id);

  useEffect(() => {
    setLoading(true);
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
        setOpticalError("A OLT nao retornou o sinal optico para esta ONT.");
      }
    } catch (e: any) {
      const rawDetail = e?.response?.data?.detail ?? "Erro ao consultar sinal optico";
      const normalizedDetail = /reenter times have reached the upper limit/i.test(String(rawDetail))
        ? "A OLT bloqueou temporariamente novas consultas SSH. Aguarde 60s antes de tentar carregar o sinal óptico novamente."
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

  if (loading) return <div className="p-6 text-gray-400">Carregando...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  const rxPower = parseFloat(optical?.rx_power_dbm ?? "0");
  const rxColor = rxPower >= -27 ? "text-green-600" : rxPower >= -30 ? "text-yellow-600" : "text-red-600";
  const opticalCooldownSeconds = Math.max(0, Math.ceil((opticalCooldownUntil - now) / 1000));

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">ONT — {info?.sn}</h2>
          <p className="text-sm text-gray-500">0/{slot}/{port} · ONT ID {ont_id}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleReboot} className="px-3 py-1.5 text-sm border border-yellow-400 text-yellow-700 rounded-lg hover:bg-yellow-50">
            Reboot
          </button>
          <button onClick={handleDelete} className="px-3 py-1.5 text-sm border border-red-300 text-red-600 rounded-lg hover:bg-red-50">
            Remover
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Info */}
        <Card title="Informações">
          <InfoRow label="Serial Number" value={<span className="font-mono font-semibold">{info?.sn}</span>} />
          <InfoRow label="Descrição" value={info?.description} />
          <InfoRow label="Run State" value={<StatusBadge value={info?.run_state ?? "—"} />} />
          <InfoRow label="Config State" value={<StatusBadge value={info?.config_state ?? "—"} />} />
          <InfoRow label="Control Flag" value={info?.control_flag} />
          <InfoRow label="Line Profile" value={info?.lineprofile_id} />
          <InfoRow label="Service Profile" value={info?.srvprofile_id} />
          <InfoRow label="Distância" value={info?.distance_m ? `${info.distance_m}m` : undefined} />
          <InfoRow label="Management Mode" value={info?.management_mode} />
          <InfoRow label="Authentic Type" value={info?.authentic_type} />
          <InfoRow label="DBA Type" value={info?.dba_type} />
        </Card>

        {/* Óptica */}
        <Card title="Nível de Sinal Óptico">
          {optical && Object.keys(optical).length > 0 ? (
            <>
              <InfoRow label="RX Power (ONT)" value={<span className={`font-mono font-semibold ${rxColor}`}>{optical.rx_power_dbm} dBm</span>} />
              <InfoRow label="TX Power (ONT)" value={<span className="font-mono">{optical.tx_power_dbm} dBm</span>} />
              <InfoRow label="RX Power (OLT)" value={<span className="font-mono">{optical.olt_rx_power_dbm} dBm</span>} />
              <InfoRow label="Temperatura" value={optical.temperature_c ? `${optical.temperature_c}°C` : undefined} />
              <InfoRow label="Tensão" value={optical.voltage_v ? `${optical.voltage_v}V` : undefined} />
              <InfoRow label="Corrente Laser" value={optical.laser_bias_ma ? `${optical.laser_bias_ma}mA` : undefined} />
            </>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-400">Dados ópticos não disponíveis</p>
              <button onClick={loadOptical} disabled={loadingOptical || opticalCooldownSeconds > 0} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-60">
                {loadingOptical ? "Consultando sinal..." : opticalCooldownSeconds > 0 ? `Aguardar ${opticalCooldownSeconds}s` : "Carregar sinal óptico"}
              </button>
              {opticalError ? <p className="text-xs text-red-500">{opticalError}</p> : null}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <Card title="Perfis e Operação">
          <InfoRow label="Line Profile Name" value={info?.lineprofile_name} />
          <InfoRow label="Service Profile Name" value={info?.srvprofile_name} />
          <InfoRow label="Software Work Mode" value={info?.software_work_mode} />
          <InfoRow label="Isolation State" value={info?.isolation_state} />
          <InfoRow label="Match State" value={info?.match_state} />
          <InfoRow label="Interoperability" value={info?.interoperability_mode} />
          <InfoRow label="Power Reduction" value={info?.power_reduction_status} />
          <InfoRow label="Type C Support" value={info?.type_c_support} />
        </Card>

        <Card title="Saúde e Histórico">
          <InfoRow label="Temperature" value={info?.temperature} />
          <InfoRow label="Memory Occupation" value={info?.memory_occupation} />
          <InfoRow label="CPU Occupation" value={info?.cpu_occupation} />
          <InfoRow label="Battery State" value={info?.battery_state} />
          <InfoRow label="Power Type" value={info?.power_type} />
          <InfoRow label="Last Up Time" value={info?.last_up_time} />
          <InfoRow label="Last Down Time" value={info?.last_down_time} />
          <InfoRow label="Last Down Cause" value={info?.last_down_cause} />
          <InfoRow label="Last Restart Reason" value={info?.last_restart_reason} />
          <InfoRow label="Online Duration" value={info?.online_duration} />
        </Card>
      </div>

      <Card title="Configuração OMCI">
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-x-6">
          <InfoRow label="FEC Upstream State" value={info?.fec_upstream_state} />
          <InfoRow label="FEC Upstream Switch" value={info?.fec_upstream_switch} />
          <InfoRow label="OMCC Encrypt" value={info?.omcc_encrypt_switch} />
          <InfoRow label="QoS Mode" value={info?.qos_mode} />
          <InfoRow label="Mapping Mode" value={info?.mapping_mode} />
          <InfoRow label="TR069 Management" value={info?.tr069_management} />
          <InfoRow label="TR069 IP Index" value={info?.tr069_ip_index} />
          <InfoRow label="VoIP Configure Method" value={info?.voip_configure_method} />
          <InfoRow label="Alarm Policy ID" value={info?.alarm_policy_profile_id} />
          <InfoRow label="Alarm Policy Name" value={info?.alarm_policy_profile_name} />
        </div>
      </Card>

      {/* Service Ports */}
      <Card title="Service Ports">
        {servicePorts.length === 0 ? (
          <p className="text-sm text-gray-400">Nenhum service-port configurado</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs text-gray-500 border-b">
              <tr>
                <th className="pb-2 text-left">Index</th>
                <th className="pb-2 text-left">VLAN</th>
                <th className="pb-2 text-left">GEM Port</th>
                <th className="pb-2 text-left">Estado</th>
                <th className="pb-2"></th>
              </tr>
            </thead>
            <tbody>
              {servicePorts.map((sp) => (
                <tr key={sp.index} className="border-b last:border-0">
                  <td className="py-2 font-mono">{sp.index}</td>
                  <td className="py-2">{sp.vlan}</td>
                  <td className="py-2">{sp.gemport}</td>
                  <td className="py-2"><StatusBadge value={sp.state} /></td>
                  <td className="py-2">
                    <button onClick={() => handleDeleteSP(sp.index)} className="text-red-500 hover:underline text-xs">
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* WAN Info */}
      <Card title="WAN Info">
        {wanInfo ? (
          <pre className="text-xs font-mono text-gray-700 whitespace-pre-wrap">{wanInfo}</pre>
        ) : (
          <button onClick={loadWan} className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg">
            Carregar informações WAN
          </button>
        )}
      </Card>

      {/* Raw outputs */}
      <details className="bg-white border border-gray-100 rounded-xl shadow-sm">
        <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-gray-700">Output bruto da OLT</summary>
        <div className="px-5 pb-5 space-y-3">
          {Object.entries(raw).map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-gray-400 mb-1 uppercase">{k}</div>
              <pre className="bg-gray-900 text-green-400 p-3 rounded text-xs font-mono whitespace-pre-wrap">{v}</pre>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h3 className="font-semibold text-gray-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === undefined || value === null || value === "") return null;
  return (
    <div className="flex justify-between items-center py-1.5 border-b last:border-0 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
