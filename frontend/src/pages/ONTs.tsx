import { useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { getOnts, deleteOnt, rebootOnt } from "../api/client";
import { AuthToken, ONT } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const ONTS_CACHE_KEY = "onts_inventory_cache";
const AUTO_REFRESH_MS = 30_000;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 0]; // 0 = todos

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
  } catch {}
}

export function ONTs() {
  const { user } = useOutletContext<{ user: AuthToken }>();
  const readonly = user?.is_readonly;
  const cachedOnts = readOntsCache();
  const [onts, setOnts] = useState<ONT[]>(cachedOnts);
  const [filtered, setFiltered] = useState<ONT[]>(cachedOnts);
  const [loading, setLoading] = useState(cachedOnts.length === 0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const load = async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError("");
    try {
      const { data } = await getOnts();
      const next = data.onts ?? [];
      setOnts(next);
      writeOntsCache(next);
      setLastUpdated(new Date());
    } catch (e: any) {
      setError(e?.response?.data?.detail ?? "Erro ao listar ONTs");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // carga inicial + auto-refresh a cada 30s
  useEffect(() => {
    load();
    timerRef.current = setInterval(() => load(true), AUTO_REFRESH_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

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
    setPage(1);
  }, [search, onts]);

  const effectiveSize = pageSize === 0 ? filtered.length : pageSize;
  const totalPages = Math.max(1, Math.ceil(filtered.length / (effectiveSize || 1)));
  const paginated = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize);

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
              Inventário
            </div>
            <h2 className="font-display text-3xl font-semibold tracking-[-0.03em] text-ink-900 md:text-4xl">ONTs registradas</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-500">
              Console de inventário da rede GPON, com pesquisa rápida, status operacional e atalhos para manutenção.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <MetricCard label="Total" value={onts.length} />
            <MetricCard label="Online" value={onlineCount} emphasis />
            <MetricCard label="Offline" value={onts.length - onlineCount} />
          </div>
        </div>
      </header>

      {/* ── Barra de busca ─────────────────────────────────────────────────── */}
      <section className="panel px-6 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-ink-400">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por serial, descrição ou PON (ex: 0/1/3)..."
              className="input pl-11 text-[15px]"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="input w-auto pr-10 text-sm"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>{n === 0 ? "Todos" : `${n} por página`}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5 text-[12px] text-ink-400 whitespace-nowrap">
              <span className={`h-2 w-2 rounded-full ${refreshing ? "bg-amber-400 animate-pulse" : "bg-emerald-500"}`} />
              {refreshing ? "Atualizando..." : lastUpdated ? `${lastUpdated.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}` : "—"}
            </div>
          </div>
        </div>

        {search && (
          <div className="mt-2 text-[12px] text-ink-400">
            {filtered.length} resultado{filtered.length !== 1 ? "s" : ""} para <span className="font-mono text-ink-600">"{search}"</span>
          </div>
        )}
      </section>

      {error && <div className="rounded-[1.25rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      {loading ? (
        <div className="panel-muted px-5 py-4 text-sm text-ink-500">Consultando inventário da OLT...</div>
      ) : filtered.length === 0 ? (
        <div className="panel px-8 py-10 text-center text-ink-400">
          {search ? "Nenhuma ONT encontrada para a busca atual." : "Nenhuma ONT registrada na leitura atual."}
        </div>
      ) : (
        <>
          {/* ── Tabela (md+) ─────────────────────────────────────────────── */}
          <section className="panel hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[68rem] text-sm">
                <thead className="border-b border-ink-100 bg-white/65">
                  <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-ink-400">
                    <th className="px-5 py-4">PON</th>
                    <th className="px-5 py-4">ONT ID</th>
                    <th className="px-5 py-4">Serial</th>
                    <th className="px-5 py-4">Descrição</th>
                    <th className="px-5 py-4">Distância</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Config</th>
                    <th className="px-5 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((ont, index) => {
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
                            {!readonly && (
                              <button
                                onClick={() => handleReboot(ont)}
                                disabled={actionId === `r-${id}`}
                                className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
                              >
                                Reboot
                              </button>
                            )}
                            {!readonly && (
                              <button
                                onClick={() => handleDelete(ont)}
                                disabled={actionId === id}
                                className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100 disabled:opacity-40"
                              >
                                Remover
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          {/* ── Cards (mobile) ────────────────────────────────────────────── */}
          <div className="space-y-3 md:hidden">
            {paginated.map((ont, index) => {
              const id = `${ont.slot}-${ont.port}-${ont.ont_id}`;
              return (
                <div key={`${id}-${index}`} className="panel px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-[11px] text-ink-400">{ont.frame ?? 0}/{ont.slot}/{ont.port} · ID {ont.ont_id}</div>
                      <div className="mt-1 font-mono text-[15px] font-semibold text-brand-700">{ont.sn}</div>
                      {ont.description && <div className="mt-0.5 text-[13px] text-ink-600 truncate">{ont.description}</div>}
                    </div>
                    <StatusBadge value={ont.run_state ?? "—"} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link
                      to={`/onts/${ont.slot}/${ont.port}/${ont.ont_id}`}
                      className="rounded-full border border-brand-200 bg-brand-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-brand-700 transition hover:bg-brand-100"
                    >
                      Detalhes
                    </Link>
                    {!readonly && (
                      <button
                        onClick={() => handleReboot(ont)}
                        disabled={actionId === `r-${id}`}
                        className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-amber-800 transition hover:bg-amber-100 disabled:opacity-40"
                      >
                        Reboot
                      </button>
                    )}
                    {!readonly && (
                      <button
                        onClick={() => handleDelete(ont)}
                        disabled={actionId === id}
                        className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-red-700 transition hover:bg-red-100 disabled:opacity-40"
                      >
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Paginação ─────────────────────────────────────────────────── */}
          {pageSize !== 0 && totalPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-1">
              <span className="text-[13px] text-ink-500">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} de {filtered.length} ONTs
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  className="action-secondary px-3 py-2 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">first_page</span>
                </button>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="action-secondary px-3 py-2 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_left</span>
                </button>
                <span className="font-mono text-[13px] text-ink-700 min-w-[4rem] text-center">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="action-secondary px-3 py-2 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  className="action-secondary px-3 py-2 disabled:opacity-40"
                >
                  <span className="material-symbols-outlined text-[18px]">last_page</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MetricCard({ label, value, emphasis = false }: { label: string; value: number; emphasis?: boolean }) {
  return (
    <div className={`panel-muted min-w-0 px-4 py-4 ${emphasis ? "bg-brand-50/85" : ""}`}>
      <div className="text-[11px] uppercase tracking-[0.18em] text-ink-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${emphasis ? "text-brand-700" : "text-ink-900"}`}>{value}</div>
    </div>
  );
}
