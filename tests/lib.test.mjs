import test from "node:test";
import assert from "node:assert/strict";
import { zonedToUtcIso, todayInTz, formatInTz } from "../src/lib/tz.js";
import { safeNext } from "../src/lib/safe-redirect.js";

test("Bogotá es UTC-5 sin horario de verano", () => {
  assert.equal(zonedToUtcIso("2026-11-05T14:30", "America/Bogota"), "2026-11-05T19:30:00.000Z");
});
test("Zona con horario de verano (Nueva York, noviembre = UTC-5; julio = UTC-4)", () => {
  assert.equal(zonedToUtcIso("2026-11-05T09:00", "America/New_York"), "2026-11-05T14:00:00.000Z");
  assert.equal(zonedToUtcIso("2026-07-05T09:00", "America/New_York"), "2026-07-05T13:00:00.000Z");
});
test("Entrada inválida devuelve null", () => {
  assert.equal(zonedToUtcIso("mañana", "America/Bogota"), null);
  assert.equal(zonedToUtcIso("", "America/Bogota"), null);
});
test("todayInTz respeta la zona (23:30 en Bogotá ya es el día siguiente en UTC)", () => {
  const instant = new Date("2026-11-06T04:30:00Z"); // 23:30 del 5 en Bogotá
  assert.equal(todayInTz("America/Bogota", instant), "2026-11-05");
  assert.equal(todayInTz("UTC", instant), "2026-11-06");
});
test("formatInTz muestra la hora local del negocio", () => {
  assert.match(formatInTz("2026-11-05T19:30:00Z", "America/Bogota", { hour: "2-digit", minute: "2-digit", hour12: false }), /14:30/);
});
test("safeNext bloquea redirecciones externas", () => {
  for (const bad of ["//evil.com", "https://evil.com", "/\\evil.com", "javascript:alert(1)", null, undefined, 42]) {
    assert.equal(safeNext(bad), "/dashboard");
  }
  assert.equal(safeNext("/dashboard?b=1"), "/dashboard?b=1");
});
