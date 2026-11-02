/** Utilidades de zona horaria por negocio (sin dependencias). */

export const money = (n) => `$${Number(n || 0).toLocaleString("es-CO")}`;

export function formatInTz(value, tz = "America/Bogota", opts = { dateStyle: "medium", timeStyle: "short" }) {
  return new Date(value).toLocaleString("es-CO", { timeZone: tz, ...opts });
}

export function timeInTz(value, tz = "America/Bogota") {
  return new Date(value).toLocaleTimeString("es-CO", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: true });
}

/** Fecha de hoy (YYYY-MM-DD) en la zona del negocio. */
export function todayInTz(tz = "America/Bogota", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

function offsetMs(utcMs, tz) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  }).formatToParts(new Date(utcMs));
  const g = (t) => Number(parts.find((p) => p.type === t).value);
  return Date.UTC(g("year"), g("month") - 1, g("day"), g("hour"), g("minute"), g("second")) - utcMs;
}

/** "2026-11-05T14:30" interpretado en `tz` → ISO UTC. Devuelve null si es inválido. */
export function zonedToUtcIso(local, tz = "America/Bogota") {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(local || "");
  if (!m) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let result = guess - offsetMs(guess, tz);
  result = guess - offsetMs(result, tz);
  const d = new Date(result);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}
