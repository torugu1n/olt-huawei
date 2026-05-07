interface Props {
  value: string;
}

const G = "border border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-700/40 dark:bg-emerald-950/50 dark:text-emerald-400";
const R = "border border-red-200 bg-red-50 text-red-700 dark:border-red-700/40 dark:bg-red-950/50 dark:text-red-400";
const B = "border border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-700/40 dark:bg-sky-950/50 dark:text-sky-400";
const Y = "border border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-600/40 dark:bg-yellow-950/50 dark:text-yellow-400";
const A = "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-600/40 dark:bg-amber-950/50 dark:text-amber-400";

const STATE_COLORS: Record<string, string> = {
  online: G, active_normal: G, "active normal": G, active: G, "run-state online": G, normal: G,
  offline: R, standby_failed: R, "standby failed": R, inactive: R, "run-state offline": R, failed: R, critical: R, error: R,
  standby: B, info: B,
  major: A,
  minor: Y, warning: Y,
};

export function StatusBadge({ value }: Props) {
  const key = value?.toLowerCase() ?? "";
  const color = STATE_COLORS[key] ?? "border border-ink-200 bg-ink-50/60 text-ink-600";
  return (
    <span className={`font-mono inline-flex items-center rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] ${color}`}>
      {value || "—"}
    </span>
  );
}
