/**
 * Devuelve una ruta interna segura para redirecciones posteriores al login.
 * Rechaza URLs absolutas, protocol-relative ("//evil.com") y barras invertidas.
 */
export function safeNext(value, fallback = "/dashboard") {
  if (typeof value !== "string" || value.length === 0 || value.length > 512) return fallback;
  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(value)) return fallback;
  return value;
}
