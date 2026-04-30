import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getOnts, deleteOnt, rebootOnt } from "../api/client";
import { ONT } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const ONTS_CACHE_KEY = "onts_inventory_cache";

function readOntsCache(): ONT[] {
  try {
    const raw = localStorage.getItem(ONTS_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { data?: ONT[] };
    return parsed.data ?? [];
  } catch {
    return [];
  }
}

function writeOntsCache(data: ONT[]) {
  try {
    localStorage.setItem(ONTS_CACHE_KEY, JSON.stringify({ data, saved_at: Date.now() }));
  } catch {
    // Ignora falha de escrita no cache local.
  }
}

export function ONTs() {
  const cachedOnts = readOntsCache();
  const [onts, setOnts] = useState<ONT[]>(cachedOnts);
  const [filtered, setFiltered] = useState<ONT[]>(cachedOnts);
  const [loading, setLoading] = useState(cachedOnts.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);

  const load = async () => {
    setRefreshing(true);
    setError("");
    try {
      const { data } = await getOnts();
      const next = data.onts ?? [];
      setOnts(next);
      writeOntsCache(next);
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao listar ONTs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(
      q
        ? onts.filter((ont) =>
            ont.sn?.toLowerCase().includes(q) ||
            ont.description?.toLowerCase().includes(q) ||
            `${ont.slot}/${ont.port}/${ont.ont_id}`.includes(q)
          )
        : onts
    );
  }, [search, onts]);

  const handleDelete = async (ont: ONT) => {
    if (!confirm(`Remover ONT ${ont.sn} (${ont.slot}/${ont.port}/${ont.ont_id})?`)) return;
    const id = `${ont.slot}-${ont.port}-${ont.ont_id}`;
    setActionId(id);
    try {
      await deleteOnt(ont.slot!, ont.port!, ont.ont_id!);
      setOnts((prev) => {
        const next = prev.filter((item) => !(item.slot === ont.slot && item.port === ont.port && item.ont_id === ont.ont_id));
        writeOntsCache(next);
        return next;
      });
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Erro ao remover ONT");
    } finally {
      setActionId(null);
    }
  };

  const handleReboot = async (ont: ONT) => {
    if (!confirm(`Reiniciar ONT ${ont.sn}?`)) return;
    const id = `r-${ont.slot}-${ont.port}-${ont.ont_id}`;
    setActionId(id);
    try {
      await rebootOnt(ont.slot!, ont.port!, ont.ont_id!);
      alert("Comando de reboot enviado");
    } catch (e: any) {
      alert(e?.response?.data?.detail ?? "Erro ao reiniciar ONT");
    } finally {
      setActionId(null);
    }
  };

  const onlineCount = onts.filter((ont) => ont.run_state?.toLowerCase() === "online").length;

  return (
    <div className="space-y-6">
      <header className="panel px-6 py-6 md:px-8">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-brand-700">
              Inventory
            </div>
            <h2 className="text-3xl font-bold text-ink-900 md:text-4xl">ONTs registradas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Console de inventario da rede GPON, com pesquisa rapida, status operacional e atalhos para manutencao.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <MetricCard label="Total" value={onts.length} />
            <MetricCard label="Online" value={onlineCount} emphasis />
            <MetricCard label="Offline" value={onts.length - onlineCount} />
          </div>
        </div>
      </header>

      <section className="panel px-6 py-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.22em] text-ink-400">Pesquisa operacional</div>
            <div className="mt-1 text-sm text-ink-500">Filtre por serial, descricao ou localizacao da PON.</div>
            {refreshing && <div className="mt-2 text-xs text-ink-400">Atualizando inventario em segundo plano...</div>}
          </div>
          <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar SN, descricao, PON..."
              className="input min-w-[18rem]"
            />
            <button onClick={load} className="action-primary">
              Atualizar leitura
            </button>
          </div>
        </div>
      </section>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Consultando inventario da OLT...</div>
      ) : filtered.length === 0 ? (
        <div className="panel px-8 py-10 text-center text-ink-400">
          {search ? "Nenhuma ONT encontrada para a busca atual." : "Nenhuma ONT registrada na leitura atual."}
        </div>
      ) : (
        <section className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[68rem] text-sm">
              <thead className="border-b border-ink-100 bg-white/65">
                <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                  <th className="px-5 py-4">PON</th>
                  <th className="px-5 py-4">ONT ID</th>
                  <th className="px-5 py-4">Serial</th>
                  <th className="px-5 py-4">Descricao</th>
                  <th className="px-5 py-4">Distancia</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Config</th>
                  <th className="px-5 py-4 text-right">Acoes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((ont, index) => {
                  const id = `${ont.slot}-${ont.port}-${ont.ont_id}`;
                  return (
                    <tr key={`${id}-${index}`} className="border-b border-ink-100/80 transition hover:bg-brand-50/35 last:border-0">
                      <td className="px-5 py-4 font-mono text-xs text-ink-700">{ont.frame ?? 0}/{ont.slot}/{ont.port}</td>
                      <td className="px-5 py-4 font-mono text-sm text-ink-900">{ont.ont_id}</td>
                      <td className="px-5 py-4 font-mono text-sm font-semibold text-brand-700">{ont.sn}</td>
                      <td className="max-w-sm px-5 py-4 text-ink-600">{ont.description || "—"}</td>
                      <td className="px-5 py-4 font-mono text-xs text-ink-500">{ont.distance_m ? `${ont.distance_m} m` : "—"}</td>
                      <td className="px-5 py-4"><StatusBadge value={ont.run_state ?? "—"} /></td>
                      <td className="px-5 py-4"><StatusBadge value={ont.config_state ?? "—"} /></td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to={`/onts/${ont.slot}/${ont.port}/${ont.ont_id}`}
                            className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-100"
                          >
                            Detalhes
                          </Link>
                          <button
                            onClick={() => handleReboot(ont)}
                            disabled={actionId === `r-${id}`}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
                          >
                            Reboot
                          </button>
                          <button
                            onClick={() => handleDelete(ont)}
                            disabled={actionId === id}
                            className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100 disabled:opacity-40"
                          >
                            Remover
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function MetricCard({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`panel-muted min-w-[8rem] px-4 py-4 ${emphasis ? "bg-brand-50/85" : ""}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${emphasis ? "text-brand-700" : "text-ink-900"}`}>{value}</div>
    </div>
  );
}
