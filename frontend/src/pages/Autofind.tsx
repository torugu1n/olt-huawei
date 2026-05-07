import React, { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getAutofind, getProvisionTemplate, provisionOnt } from "../api/client";
import { AuthToken, AutofindONT, ProvisionTemplate } from "../types";

export function Autofind() {
  const { user } = useOutletContext<{ user: AuthToken }>();
  const readonly = user?.is_readonly;
  const [onts, setOnts] = useState<AutofindONT[]>([]);
  const [loading, setLoading] = useState(true);
  const [raw, setRaw] = useState("");
  const [showRaw, setShowRaw] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [actionSn, setActionSn] = useState<string | null>(null);
  const [editingSn, setEditingSn] = useState<string | null>(null);
  const [description, setDescription] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    setSuccess("");
    try {
      const { data } = await getAutofind();
      const enriched = await Promise.all((data.onts ?? []).map(async (ont: AutofindONT) => {
        const response = await getProvisionTemplate(ont.port, ont.slot);
        const template = response.data as ProvisionTemplate;
        return {
          ...ont,
          template_id: template.template_id,
          template_name: template.template_name,
          template_vlan_id: template.vlan_id,
          template_auto_matched: template.auto_matched,
          template_lineprofile_id: template.lineprofile_id,
          template_srvprofile_id: template.srvprofile_id,
          template_user_vlan: template.user_vlan,
          template_gemport: template.gemport,
        };
      }));
      setOnts(enriched);
      setRaw(data.raw ?? "");
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao buscar autofind");
    } finally {
      setLoading(false);
    }
  };

  const sanitizeDescription = (text: string, port: number, sn: string) => {
    const normalized = text
      .replace(/[^A-Za-z0-9\-_. ]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return normalized || `ONT_PON${port}_${sn.slice(-4)}`;
  };

  const startDirectProvision = (ont: AutofindONT) => {
    setError("");
    setSuccess("");
    setEditingSn(ont.sn);
    setDescription(sanitizeDescription(ont.equipment_id || ont.vendor_id || ont.sn, ont.port, ont.sn));
  };

  const handleDirectProvision = async (ont: AutofindONT) => {
    if (
      !ont.template_auto_matched ||
      ont.template_vlan_id == null ||
      ont.template_user_vlan == null ||
      ont.template_lineprofile_id == null ||
      ont.template_srvprofile_id == null ||
      ont.template_gemport == null
    ) {
      setError(`Não existe template automático salvo para a PON 0/1/${ont.port}.`);
      return;
    }

    const finalDescription = sanitizeDescription(description, ont.port, ont.sn);
    if (!finalDescription) {
      setError("Informe uma descrição válida para a ONT.");
      return;
    }

    setActionSn(ont.sn);
    setError("");
    setSuccess("");

    try {
      await provisionOnt({
        slot: 1,
        port: ont.port,
        sn: ont.sn,
        lineprofile_id: ont.template_lineprofile_id,
        srvprofile_id: ont.template_srvprofile_id,
        description: finalDescription,
        vlan_id: ont.template_vlan_id,
        user_vlan: ont.template_user_vlan,
        gemport: ont.template_gemport,
      });
      setSuccess(`ONT ${ont.sn} provisionada na PON 0/1/${ont.port} com VLAN ${ont.template_vlan_id}.`);
      setEditingSn(null);
      setDescription("");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao provisionar ONT diretamente.");
    } finally {
      setActionSn(null);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow mb-3">Discovery queue</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">Autofind</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              ONTs detectadas pela OLT e prontas para seguir o fluxo de provisão com template automático por PON.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRaw(!showRaw)} className="action-secondary">
              {showRaw ? "Ver tabela" : "Ver raw"}
            </button>
            <button onClick={load} className="action-primary">
              Atualizar fila
            </button>
          </div>
        </div>
      </header>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-[1.25rem] border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-800">{success}</div>}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Consultando autofind da OLT...</div>
      ) : showRaw ? (
        <pre className="panel overflow-x-auto bg-ink-950 px-5 py-5 text-xs font-mono whitespace-pre-wrap text-brand-100">{raw || "Sem output"}</pre>
      ) : onts.length === 0 ? (
        <div className="panel px-8 py-10 text-center text-ink-400">
          Nenhuma ONT aguardando provisionamento na leitura atual.
        </div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[76rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="font-mono text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">PON</th>
                  <th className="px-5 py-4">Serial</th>
                  <th className="px-5 py-4">Vendor</th>
                  <th className="px-5 py-4">Template</th>
                  <th className="px-5 py-4">Equipment ID</th>
                  <th className="px-5 py-4">Descoberto em</th>
                  <th className="px-5 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {onts.map((ont, index) => (
                  <React.Fragment key={`${ont.sn}-${index}`}>
                    <tr className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                      <td className="px-5 py-4 font-mono text-xs text-ink-700">{ont.frame}/{ont.slot}/{ont.port}</td>
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-brand-700">{ont.sn}</td>
                      <td className="px-5 py-4 text-ink-600">{ont.vendor_id}</td>
                      <td className="px-5 py-4">
                        {ont.template_auto_matched ? (
                          <span className="font-mono inline-flex rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-brand-700">
                            {ont.template_name ? ont.template_name : `VLAN ${ont.template_vlan_id}`}
                          </span>
                        ) : (
                          <span className="font-mono inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] uppercase tracking-[0.16em] text-amber-800">
                            Sem template
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-ink-500">{ont.equipment_id}</td>
                      <td className="px-5 py-4 text-xs text-ink-400">{ont.found_at}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {!readonly && (
                            <button
                              onClick={() => startDirectProvision(ont)}
                              disabled={!ont.template_auto_matched || actionSn === ont.sn}
                              className="font-mono rounded-full border border-brand-200 bg-brand-600 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white transition hover:bg-brand-700 disabled:border-brand-100 disabled:bg-brand-300"
                            >
                              Provisionar direto
                            </button>
                          )}
                          {!readonly && (
                            <Link
                              to={`/provision?sn=${ont.sn}&port=${ont.port}`}
                              className="font-mono rounded-full border border-ink-200 bg-ink-50 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-ink-600 transition hover:bg-ink-100"
                            >
                              Editar
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>

                    {!readonly && editingSn === ont.sn && (
                      <tr className="border-b border-ink-100 bg-brand-50/45">
                        <td colSpan={7} className="px-5 py-5">
                          <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
                            <div>
                              <div className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Descrição obrigatória</div>
                              <label className="mb-1 block text-sm font-medium text-ink-700">Nome operacional da ONT</label>
                              <input
                                type="text"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={64}
                                className="input"
                                placeholder="Ex: Cliente Joao Silva"
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleDirectProvision(ont)}
                                disabled={actionSn === ont.sn}
                                className="action-primary"
                              >
                                {actionSn === ont.sn ? "Provisionando..." : "Confirmar provisao"}
                              </button>
                              <button
                                onClick={() => {
                                  setEditingSn(null);
                                  setDescription("");
                                }}
                                className="action-secondary"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
