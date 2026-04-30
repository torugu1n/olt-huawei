interface Props {
  value: string;
}

const STATE_COLORS: Record<string, string> = {
  online: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  "active_normal": "border border-emerald-200 bg-emerald-50 text-emerald-800",
  "active normal": "border border-emerald-200 bg-emerald-50 text-emerald-800",
  active: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  "run-state online": "border border-emerald-200 bg-emerald-50 text-emerald-800",
  offline: "border border-red-200 bg-red-50 text-red-700",
  "standby_failed": "border border-red-200 bg-red-50 text-red-700",
  "standby failed": "border border-red-200 bg-red-50 text-red-700",
  inactive: "border border-red-200 bg-red-50 text-red-700",
  "run-state offline": "border border-red-200 bg-red-50 text-red-700",
  failed: "border border-red-200 bg-red-50 text-red-700",
  normal: "border border-emerald-200 bg-emerald-50 text-emerald-800",
  standby: "border border-sky-200 bg-sky-50 text-sky-800",
  critical: "border border-red-200 bg-red-50 text-red-700",
  major: "border border-amber-200 bg-amber-50 text-amber-800",
  minor: "border border-yellow-200 bg-yellow-50 text-yellow-800",
  warning: "border border-yellow-200 bg-yellow-50 text-yellow-800",
};

export function StatusBadge({ value }: Props) {
  const key = value?.toLowerCase() ?? "";
  const color = STATE_COLORS[key] ?? "border border-ink-200 bg-white/70 text-ink-600";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.16em] ${color}`}>
      {value || "—"}
    </span>
  );
}
