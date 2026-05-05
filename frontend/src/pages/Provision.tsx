import { useState, FormEvent, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { getProvisionTemplate, provisionOnt } from "../api/client";
import { ProvisionForm, ProvisionTemplate } from "../types";

const DEFAULT: ProvisionForm = {
  slot: 1, port: 0, sn: "", lineprofile_id: 20, srvprofile_id: 20,
  description: "", vlan_id: 20, user_vlan: 20, gemport: 6,
};

export function Provision() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<ProvisionForm>({
    ...DEFAULT,
    sn: params.get("sn") ?? "",
    slot: 1,
    port: Number(params.get("port") ?? 0),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ ont_id: number; raw: Record<string, string> } | null>(null);
  const [templateHint, setTemplateHint] = useState<string>("");
  const [resolvedTemplate, setResolvedTemplate] = useState<ProvisionTemplate | null>(null);

  const set = (field: keyof ProvisionForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((current) => ({ ...current, [field]: val }));
  };

  useEffect(() => {
    const loadTemplate = async () => {
      try {
        const { data } = await getProvisionTemplate(form.port, 1);
        const template = data as ProvisionTemplate;
        setResolvedTemplate(template);
        setForm((current) => ({
          ...current,
          slot: 1,
          lineprofile_id: template.lineprofile_id ?? current.lineprofile_id,
          srvprofile_id: template.srvprofile_id ?? current.srvprofile_id,
          gemport: template.gemport ?? current.gemport,
          vlan_id: template.vlan_id ?? current.vlan_id,
          user_vlan: template.user_vlan ?? current.user_vlan,
        }));
        setTemplateHint(
          template.auto_matched
            ? `Template aplicado para PON 0/1/${form.port}: VLAN ${template.vlan_id}, line profile ${template.lineprofile_id}, service profile ${template.srvprofile_id}, GEM ${template.gemport}.`
            : `Sem template salvo para a PON 0/1/${form.port}. Ajuste VLAN e perfis antes de enviar.`
        );
      } catch {
        setResolvedTemplate(null);
        setTemplateHint(`Não foi possível carregar o template da PON 0/1/${form.port}.`);
      }
    };

    loadTemplate();
  }, [form.port]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const { data } = await provisionOnt(form);
      setResult(data);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === "string" ? detail : JSON.stringify(detail));
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div className="mx-auto max-w-4xl space-y-5">
        <div className="panel overflow-hidden px-6 py-6 md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
              <div className="eyebrow mb-3">Provision completed</div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900">ONT provisionada com sucesso</h2>
              <p className="mt-2 text-sm text-ink-500">
                ONT ID {result.ont_id} atribuida para SN <span className="font-mono text-ink-800">{form.sn}</span> na PON 0/{form.slot}/{form.port}.
              </p>
            </div>
            <div className="rounded-[1.25rem] border border-brand-200 bg-brand-50 px-4 py-4 text-sm text-brand-800">
              Native VLAN e service-port enviados para a OLT.
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <OutputPanel title="Provisionamento da ONT" value={result.raw.provision} />
          <OutputPanel title="Native VLAN" value={result.raw.native_vlan} />
          <OutputPanel title="Service Port" value={result.raw.service_port} />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setResult(null); setForm({ ...DEFAULT }); }}
            className="action-primary"
          >
            Provisionar outra
          </button>
          <button onClick={() => navigate("/onts")} className="action-secondary">
            Ver inventario
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow mb-3">Provision workflow</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">Provisionar ONT</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Fluxo operacional para registrar a ONT, aplicar native VLAN e criar o service-port com base no template da PON.
            </p>
          </div>

          <div className="panel-muted min-w-[19rem] px-4 py-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-400">Contexto ativo</div>
            <div className="mt-2 text-sm font-medium text-ink-900">PON 0/1/{form.port}</div>
            <div className="mt-1 font-mono text-xs text-ink-500">{form.sn || "SN aguardando entrada"}</div>
          </div>
        </div>
      </header>

      {error && (
        <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm whitespace-pre-wrap text-red-700">
          {error}
        </div>
      )}

      {templateHint && (
        <div className={`rounded-[1.25rem] border px-4 py-4 text-sm ${
          templateHint.startsWith("Template aplicado")
            ? "border-brand-200 bg-brand-50 text-brand-800"
            : "border-amber-200 bg-amber-50 text-amber-800"
        }`}>
          {templateHint}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-6">
          <FormPanel title="Localizacao na OLT" subtitle="Frame fixo, slot operacional 1 e escolha da PON.">
            <div className="grid grid-cols-3 gap-3">
              <Field label="Frame" hint="Sempre 0">
                <input type="number" value={0} disabled className="input bg-white/60 text-ink-400" />
              </Field>
              <Field label="Slot" hint="Sempre 1">
                <input type="number" value={1} disabled className="input bg-white/60 text-ink-400" />
              </Field>
              <Field label="Port (PON)" hint="0–15">
                <input type="number" min={0} max={15} value={form.port} onChange={set("port")} className="input" required />
              </Field>
            </div>
          </FormPanel>

          <FormPanel title="Identidade da ONT" subtitle="Serial e descricao operacional apresentada no inventario.">
            <Field label="Serial Number" hint="4 letras + 8 hex">
              <input
                type="text"
                value={form.sn}
                onChange={set("sn")}
                className="input font-mono uppercase"
                placeholder="HWTC1A2B3C4D"
                pattern="[A-Za-z0-9]{4}[0-9A-Fa-f]{8}"
                maxLength={12}
                required
              />
            </Field>
            <Field label="Descricao" hint="Maximo de 64 caracteres">
              <input
                type="text"
                value={form.description}
                onChange={set("description")}
                className="input"
                placeholder="Cliente Joao Silva"
                maxLength={64}
                required
              />
            </Field>
          </FormPanel>
        </div>

        <div className="space-y-6">
          <FormPanel title="Template aplicado" subtitle="Esses valores sao herdados da PON, mas ainda podem ser ajustados antes do envio.">
            {resolvedTemplate?.template_name && (
              <div className="rounded-[1.25rem] border border-brand-200 bg-brand-50/60 px-4 py-3 text-sm text-brand-800">
                Template ativo: <span className="font-semibold">{resolvedTemplate.template_name}</span>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <MetricField label="Line profile" value={form.lineprofile_id} />
              <MetricField label="Service profile" value={form.srvprofile_id} />
              <MetricField label="VLAN de servico" value={form.vlan_id} />
              <MetricField label="User VLAN" value={form.user_vlan} />
              <MetricField label="GEM port" value={form.gemport} />
            </div>
          </FormPanel>

          <FormPanel title="Ajustes manuais" subtitle="Use apenas quando a PON exigir override do template padrao.">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Line Profile ID">
                <input type="number" min={1} max={1023} value={form.lineprofile_id} onChange={set("lineprofile_id")} className="input" required />
              </Field>
              <Field label="Service Profile ID">
                <input type="number" min={1} max={1023} value={form.srvprofile_id} onChange={set("srvprofile_id")} className="input" required />
              </Field>
              <Field label="VLAN ID">
                <input type="number" min={1} max={4094} value={form.vlan_id} onChange={set("vlan_id")} className="input" required />
              </Field>
              <Field label="User VLAN">
                <input type="number" min={1} max={4094} value={form.user_vlan} onChange={set("user_vlan")} className="input" required />
              </Field>
              <Field label="GEM Port">
                <input type="number" min={0} max={7} value={form.gemport} onChange={set("gemport")} className="input" required />
              </Field>
            </div>
          </FormPanel>

          <button type="submit" disabled={loading} className="action-primary w-full py-3">
            {loading ? "Provisionando..." : "Enviar para a OLT"}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormPanel({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="panel px-6 py-5">
      <div className="mb-5">
        <h3 className="font-display text-lg font-semibold tracking-[-0.02em] text-ink-900">{title}</h3>
        {subtitle && <p className="mt-1 text-sm leading-6 text-ink-500">{subtitle}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">
        {label}
        {hint && <span className="ml-1 text-xs text-ink-400">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

function MetricField({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="panel-muted px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className="mt-2 font-mono text-lg text-ink-900">{value}</div>
    </div>
  );
}

function OutputPanel({ title, value }: { title: string; value?: string }) {
  return (
    <details className="panel overflow-hidden">
      <summary className="cursor-pointer px-5 py-4 text-sm font-medium text-ink-800">{title}</summary>
      <pre className="border-t border-ink-100 bg-ink-900 px-5 py-4 text-xs font-mono whitespace-pre-wrap text-brand-100">
        {value || "Sem output"}
      </pre>
    </details>
  );
}
