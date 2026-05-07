import { useEffect, useMemo, useState } from "react";
import {
  createTemplateBinding,
  createTemplateCatalogItem,
  deleteTemplateBinding,
  deleteTemplateCatalogItem,
  getTemplateBindings,
  getTemplateCatalog,
} from "../api/client";
import { TemplateBinding, TemplateCatalogItem } from "../types";

type TemplateFormState = {
  name: string;
  description: string;
  vlan_id: string;
  gemport: string;
  lineprofile_mode: "fixed" | "same_as_vlan";
  lineprofile_id: string;
  srvprofile_mode: "fixed" | "same_as_vlan";
  srvprofile_id: string;
  user_vlan_mode: "fixed" | "same_as_vlan";
  user_vlan: string;
};

type BindingFormState = {
  slot: string;
  pon_start: string;
  pon_end: string;
  template_id: string;
};

const DEFAULT_TEMPLATE_FORM: TemplateFormState = {
  name: "",
  description: "",
  vlan_id: "",
  gemport: "6",
  lineprofile_mode: "same_as_vlan",
  lineprofile_id: "",
  srvprofile_mode: "same_as_vlan",
  srvprofile_id: "",
  user_vlan_mode: "same_as_vlan",
  user_vlan: "",
};

const DEFAULT_BINDING_FORM: BindingFormState = {
  slot: "1",
  pon_start: "0",
  pon_end: "0",
  template_id: "",
};

export function TemplatesPage() {
  const [templates, setTemplates] = useState<TemplateCatalogItem[]>([]);
  const [bindings, setBindings] = useState<TemplateBinding[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateForm, setTemplateForm] = useState<TemplateFormState>(DEFAULT_TEMPLATE_FORM);
  const [bindingForm, setBindingForm] = useState<BindingFormState>(DEFAULT_BINDING_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [savingBinding, setSavingBinding] = useState(false);
  const [deletingTemplateId, setDeletingTemplateId] = useState<number | null>(null);
  const [deletingBindingId, setDeletingBindingId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data: templateData }, { data: bindingData }] = await Promise.all([
        getTemplateCatalog(),
        getTemplateBindings(),
      ]);
      setTemplates(templateData.templates ?? []);
      setBindings(bindingData.bindings ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao carregar templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!bindingForm.template_id && templates[0]) {
      setBindingForm((current) => ({ ...current, template_id: String(templates[0].id) }));
    }
  }, [templates, bindingForm.template_id]);

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTemplate(true);
    setError("");
    setSuccess("");
    try {
      await createTemplateCatalogItem({
        name: templateForm.name,
        description: templateForm.description,
        vlan_id: templateForm.vlan_id === "" ? null : Number(templateForm.vlan_id),
        gemport: Number(templateForm.gemport),
        lineprofile_mode: templateForm.lineprofile_mode,
        lineprofile_id: templateForm.lineprofile_mode === "same_as_vlan" ? null : Number(templateForm.lineprofile_id),
        srvprofile_mode: templateForm.srvprofile_mode,
        srvprofile_id: templateForm.srvprofile_mode === "same_as_vlan" ? null : Number(templateForm.srvprofile_id),
        user_vlan_mode: templateForm.user_vlan_mode,
        user_vlan: templateForm.user_vlan_mode === "same_as_vlan" ? null : Number(templateForm.user_vlan),
      });
      setTemplateForm(DEFAULT_TEMPLATE_FORM);
      setSuccess("Template criado e pronto para ser vinculado.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao criar template");
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleCreateBinding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBinding(true);
    setError("");
    setSuccess("");
    try {
      await createTemplateBinding({
        slot: Number(bindingForm.slot),
        pon_start: Number(bindingForm.pon_start),
        pon_end: Number(bindingForm.pon_end),
        template_id: Number(bindingForm.template_id),
      });
      setBindingForm((current) => ({ ...DEFAULT_BINDING_FORM, slot: current.slot, template_id: current.template_id }));
      setSuccess("Vínculo salvo. Provisionar e Autofind já passam a usar essa regra.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao criar vínculo");
    } finally {
      setSavingBinding(false);
    }
  };

  const handleDeleteTemplate = async (id: number) => {
    if (!confirm("Excluir este template?")) return;
    setDeletingTemplateId(id);
    setError("");
    setSuccess("");
    try {
      await deleteTemplateCatalogItem(id);
      setSuccess("Template removido.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao excluir template");
    } finally {
      setDeletingTemplateId(null);
    }
  };

  const handleDeleteBinding = async (id: number) => {
    if (!confirm("Remover esse vínculo de PON?")) return;
    setDeletingBindingId(id);
    setError("");
    setSuccess("");
    try {
      await deleteTemplateBinding(id);
      setSuccess("Vínculo removido.");
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao remover vínculo");
    } finally {
      setDeletingBindingId(null);
    }
  };

  const selectedTemplatePreview = useMemo(
    () => templates.find((template) => String(template.id) === bindingForm.template_id) ?? null,
    [templates, bindingForm.template_id]
  );

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow mb-3">Templates de provisão</div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">Templates</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-ink-500">
              Crie templates reutilizáveis e aplique por faixa de PON. O `Provisionar` herda automático pela PON, e o `Autofind` permite seleção assistida antes da provisão direta.
            </p>
          </div>
        </div>
      </header>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
      {success && <div className="rounded-[1.25rem] border border-brand-200 bg-brand-50 px-4 py-3 text-sm text-brand-700">{success}</div>}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form onSubmit={handleCreateTemplate} className="panel px-5 py-5">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Etapa 1</div>
            <h3 className="font-display mt-2 text-lg font-semibold tracking-[-0.02em] text-ink-900">Criar template base</h3>
            <p className="mt-1 text-sm text-ink-500">Defina uma vez e reutilize em várias PONs. Quando fizer sentido, deixe perfis e user VLAN herdarem da VLAN.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Nome do template">
              <input className="input" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} placeholder="Ex: Residencial VLAN 20" required />
            </Field>
            <Field label="GEM port">
              <input className="input tabular-nums" type="number" min={0} max={7} value={templateForm.gemport} onChange={(e) => setTemplateForm({ ...templateForm, gemport: e.target.value })} required />
            </Field>
            <div className="md:col-span-2">
              <Field label="Descrição operacional">
                <input className="input" value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} placeholder="Uso padrão para essa praça" />
              </Field>
            </div>
            <Field label="VLAN principal">
              <input className="input tabular-nums" type="number" min={1} max={4094} value={templateForm.vlan_id} onChange={(e) => setTemplateForm({ ...templateForm, vlan_id: e.target.value })} placeholder="20" />
            </Field>
            <Field label="User VLAN">
              <div className="space-y-2">
                <select className="input" value={templateForm.user_vlan_mode} onChange={(e) => setTemplateForm({ ...templateForm, user_vlan_mode: e.target.value as "fixed" | "same_as_vlan" })}>
                  <option value="same_as_vlan">Herdar da VLAN</option>
                  <option value="fixed">Valor fixo</option>
                </select>
                {templateForm.user_vlan_mode === "fixed" && (
                  <input className="input tabular-nums" type="number" min={1} max={4094} value={templateForm.user_vlan} onChange={(e) => setTemplateForm({ ...templateForm, user_vlan: e.target.value })} placeholder="20" required />
                )}
              </div>
            </Field>
            <Field label="Line profile">
              <div className="space-y-2">
                <select className="input" value={templateForm.lineprofile_mode} onChange={(e) => setTemplateForm({ ...templateForm, lineprofile_mode: e.target.value as "fixed" | "same_as_vlan" })}>
                  <option value="same_as_vlan">Herdar da VLAN</option>
                  <option value="fixed">Valor fixo</option>
                </select>
                {templateForm.lineprofile_mode === "fixed" && (
                  <input className="input tabular-nums" type="number" min={1} max={1023} value={templateForm.lineprofile_id} onChange={(e) => setTemplateForm({ ...templateForm, lineprofile_id: e.target.value })} placeholder="20" required />
                )}
              </div>
            </Field>
            <Field label="Service profile">
              <div className="space-y-2">
                <select className="input" value={templateForm.srvprofile_mode} onChange={(e) => setTemplateForm({ ...templateForm, srvprofile_mode: e.target.value as "fixed" | "same_as_vlan" })}>
                  <option value="same_as_vlan">Herdar da VLAN</option>
                  <option value="fixed">Valor fixo</option>
                </select>
                {templateForm.srvprofile_mode === "fixed" && (
                  <input className="input tabular-nums" type="number" min={1} max={1023} value={templateForm.srvprofile_id} onChange={(e) => setTemplateForm({ ...templateForm, srvprofile_id: e.target.value })} placeholder="20" required />
                )}
              </div>
            </Field>
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" className="action-primary min-w-[12rem]" disabled={savingTemplate}>
              {savingTemplate ? "Salvando..." : "Criar template"}
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateBinding} className="panel px-5 py-5">
          <div className="mb-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Etapa 2</div>
            <h3 className="font-display mt-2 text-lg font-semibold tracking-[-0.02em] text-ink-900">Aplicar por faixa de PON</h3>
            <p className="mt-1 text-sm text-ink-500">Vincule o template à faixa que deve herdar automaticamente essa configuração.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Slot">
              <input className="input tabular-nums" type="number" min={0} max={19} value={bindingForm.slot} onChange={(e) => setBindingForm({ ...bindingForm, slot: e.target.value })} required />
            </Field>
            <Field label="Template">
              <select className="input" value={bindingForm.template_id} onChange={(e) => setBindingForm({ ...bindingForm, template_id: e.target.value })} required>
                <option value="">Selecione...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>{template.name}</option>
                ))}
              </select>
            </Field>
            <Field label="PON inicial">
              <input className="input tabular-nums" type="number" min={0} max={15} value={bindingForm.pon_start} onChange={(e) => setBindingForm({ ...bindingForm, pon_start: e.target.value })} required />
            </Field>
            <Field label="PON final">
              <input className="input tabular-nums" type="number" min={0} max={15} value={bindingForm.pon_end} onChange={(e) => setBindingForm({ ...bindingForm, pon_end: e.target.value })} required />
            </Field>
          </div>

          <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-50/60 px-4 py-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Prévia do vínculo</div>
            {selectedTemplatePreview ? (
              <div className="mt-2 space-y-1 text-sm text-ink-600">
                <div className="font-semibold text-ink-900">{selectedTemplatePreview.name}</div>
                <div>Slot {bindingForm.slot || "1"} · PON {bindingForm.pon_start || "0"} até {bindingForm.pon_end || "0"}</div>
                <div>VLAN {selectedTemplatePreview.vlan_id ?? "—"} · GEM {selectedTemplatePreview.gemport}</div>
              </div>
            ) : (
              <div className="mt-2 text-sm text-ink-500">Selecione um template para ver a prévia do vínculo.</div>
            )}
          </div>

          <div className="mt-5 flex justify-end">
            <button type="submit" className="action-primary min-w-[12rem]" disabled={savingBinding || templates.length === 0}>
              {savingBinding ? "Aplicando..." : "Salvar vínculo"}
            </button>
          </div>
        </form>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <section className="panel overflow-hidden">
          <div className="border-b border-ink-200 bg-ink-50/80 px-5 py-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Templates cadastrados</div>
            <div className="mt-1 text-sm text-ink-600">{loading ? "Carregando..." : `${templates.length} template(s) disponíveis.`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50/60">
                <tr className="font-mono text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3">Line</th>
                  <th className="px-4 py-3">Service</th>
                  <th className="px-4 py-3">VLAN</th>
                  <th className="px-4 py-3">User VLAN</th>
                  <th className="px-4 py-3">GEM</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {templates.map((template) => (
                  <tr key={template.id} className="border-b border-ink-100 last:border-0 transition hover:bg-ink-50/40">
                    <td className="px-4 py-4">
                      <div className="font-medium text-ink-800">{template.name}</div>
                      <div className="mt-1 text-xs text-ink-500">{template.description || "Sem descrição operacional"}</div>
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      <MetricSourceCell
                        value={template.lineprofile_mode === "same_as_vlan" ? template.vlan_id : template.lineprofile_id}
                        inherited={template.lineprofile_mode === "same_as_vlan"}
                      />
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      <MetricSourceCell
                        value={template.srvprofile_mode === "same_as_vlan" ? template.vlan_id : template.srvprofile_id}
                        inherited={template.srvprofile_mode === "same_as_vlan"}
                      />
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      <NumberCell value={template.vlan_id} />
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      <MetricSourceCell
                        value={template.user_vlan_mode === "same_as_vlan" ? template.vlan_id : template.user_vlan}
                        inherited={template.user_vlan_mode === "same_as_vlan"}
                      />
                    </td>
                    <td className="px-4 py-4 text-ink-600">
                      <NumberCell value={template.gemport} />
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        disabled={deletingTemplateId === template.id}
                      >
                        {deletingTemplateId === template.id ? "Excluindo..." : "Excluir"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && templates.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-sm text-ink-500">Nenhum template cadastrado ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel overflow-hidden">
          <div className="border-b border-ink-200 bg-ink-50/80 px-5 py-4">
            <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-400">Vínculos por faixa de PON</div>
            <div className="mt-1 text-sm text-ink-600">{loading ? "Carregando..." : `${bindings.length} vínculo(s) ativos.`}</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] text-sm">
              <thead className="border-b border-ink-200 bg-ink-50/60">
                <tr className="font-mono text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Faixa de PON</th>
                  <th className="px-4 py-3">Template</th>
                  <th className="px-4 py-3 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {bindings.map((binding) => (
                  <tr key={binding.id} className="border-b border-ink-100 last:border-0 transition hover:bg-ink-50/40">
                    <td className="px-4 py-4 font-mono text-ink-700">{binding.slot}</td>
                    <td className="px-4 py-4 font-mono text-ink-700">0/{binding.slot}/{binding.pon_start} até 0/{binding.slot}/{binding.pon_end}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-ink-800">{binding.template_name}</div>
                      <div className="mt-1 text-xs text-ink-500">{binding.template_description || "Sem descrição operacional"}</div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        onClick={() => handleDeleteBinding(binding.id)}
                        className="rounded-2xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100"
                        disabled={deletingBindingId === binding.id}
                      >
                        {deletingBindingId === binding.id ? "Removendo..." : "Remover"}
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && bindings.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-ink-500">Nenhum vínculo ativo ainda.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}

function MetricSourceCell({ value, inherited }: { value: number | null; inherited: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="font-mono text-[1.05rem] font-medium leading-none tabular-nums text-ink-700">{value ?? "—"}</div>
      <div>
        <span
          className={`inline-flex rounded-full px-1.5 py-[2px] text-[9px] font-medium uppercase tracking-[0.12em] ${
            inherited
              ? "border border-brand-200 bg-brand-50 text-brand-700"
              : "border border-ink-200 bg-ink-50 text-ink-500"
          }`}
        >
          {inherited ? "auto" : "fixo"}
        </span>
      </div>
    </div>
  );
}

function NumberCell({ value }: { value: number | null }) {
  return <div className="font-mono text-[1.05rem] font-medium leading-none tabular-nums text-ink-700">{value ?? "—"}</div>;
}
