function parseUtcLikeTimestamp(value: string) {
  if (!value) {
    return new Date(NaN);
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)) {
    return new Date(value.replace(" ", "T") + "Z");
  }

  return new Date(value);
}

export function formatBrazilDateTime(value: string) {
  const date = parseUtcLikeTimestamp(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "America/Fortaleza",
  }).format(date);
}
