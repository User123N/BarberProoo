"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { money, todayInTz } from "@/lib/tz";
import { SkeletonCards } from "@/components/Skeleton";

const DAYS = 14;
const STATUS = [
  ["confirmed", "Confirmadas", "#62bd8e"],
  ["pending", "Pendientes", "#d9b36a"],
  ["completed", "Completadas", "#6fb4d6"],
  ["cancelled", "Canceladas", "#d67c7c"],
  ["no_show", "No asistió", "#9a8bd6"]
];

function dayKey(value, tz) {
  return todayInTz(tz, new Date(value));
}

function Bars({ data, today }) {
  const w = 600, h = 190, pad = 26, gap = 8;
  const max = Math.max(1, ...data.map((d) => d.n));
  const bw = (w - pad * 2 - gap * (data.length - 1)) / data.length;
  return (
    <svg className="chart-svg" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Citas por día en las últimas dos semanas">
      <defs>
        <linearGradient id="barG" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f0d5a0" /><stop offset="1" stopColor="#8d6a33" /></linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={w - pad} y1={h - 28 - (h - 56) * t} y2={h - 28 - (h - 56) * t} stroke="rgba(255,255,255,.06)" />)}
      {data.map((d, i) => {
        const bh = Math.max(d.n ? 6 : 2, ((h - 56) * d.n) / max);
        const x = pad + i * (bw + gap);
        return (
          <g key={d.key}>
            <rect x={x} y={h - 28 - bh} width={bw} height={bh} rx={Math.min(8, bw / 2)} fill={d.key === today ? "url(#barG)" : "rgba(217,179,106,.28)"}>
              <title>{`${d.label}: ${d.n} cita(s)`}</title>
            </rect>
            <text x={x + bw / 2} y={h - 8} textAnchor="middle" fontSize="10" fill={d.key === today ? "#f0d5a0" : "#7d8088"}>{d.short}</text>
          </g>
        );
      })}
    </svg>
  );
}

function Donut({ parts, total }) {
  const r = 52, c = 2 * Math.PI * r;
  let offset = 0;
  return (
    <svg className="donut" viewBox="0 0 140 140" role="img" aria-label="Distribución de citas por estado">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth="16" />
      {parts.filter((p) => p.n).map((p) => {
        const len = (p.n / Math.max(1, total)) * c;
        const el = <circle key={p.key} cx="70" cy="70" r={r} fill="none" stroke={p.color} strokeWidth="16" strokeLinecap="butt"
          strokeDasharray={`${Math.max(0, len - 2)} ${c}`} strokeDashoffset={-offset} transform="rotate(-90 70 70)" />;
        offset += len;
        return el;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="700" fill="#f4efe6">{total}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="10" fill="#8d9099">citas · 30 días</text>
    </svg>
  );
}

export default function OverviewTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const tz = business.timezone || "America/Bogota";
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    (async () => {
      const since = new Date(Date.now() - 30 * 864e5).toISOString();
      const { data, error: err } = await sb.from("appointments")
        .select("id,status,starts_at,appointment_items(service_name,price)")
        .eq("business_id", business.id).gte("starts_at", since).limit(1000);
      if (off) return;
      if (err) setError(err.message);
      setRows(data || []);
    })();
    return () => { off = true; };
  }, [sb, business.id]);

  if (error) return <div className="error-box">{error}</div>;
  if (!rows) return <SkeletonCards cards={4} />;

  const today = todayInTz(tz);
  const byDay = new Map();
  rows.forEach((a) => { const k = dayKey(a.starts_at, tz); byDay.set(k, (byDay.get(k) || 0) + 1); });
  const days = Array.from({ length: DAYS }, (_, i) => {
    const d = new Date(Date.now() - (DAYS - 1 - i) * 864e5);
    const key = todayInTz(tz, d);
    return { key, n: byDay.get(key) || 0, label: d.toLocaleDateString("es-CO", { timeZone: tz, weekday: "long", day: "numeric", month: "short" }), short: d.toLocaleDateString("es-CO", { timeZone: tz, day: "numeric" }) };
  });
  const parts = STATUS.map(([key, label, color]) => ({ key, label, color, n: rows.filter((a) => a.status === key).length }));
  const earned = rows.filter((a) => ["confirmed", "completed"].includes(a.status))
    .reduce((sum, a) => sum + (a.appointment_items || []).reduce((s, x) => s + Number(x.price || 0), 0), 0);
  const todayN = rows.filter((a) => dayKey(a.starts_at, tz) === today && !["cancelled"].includes(a.status)).length;
  const pending = parts.find((p) => p.key === "pending").n;
  const svc = new Map();
  rows.forEach((a) => (a.appointment_items || []).forEach((x) => svc.set(x.service_name, (svc.get(x.service_name) || 0) + 1)));
  const top = [...svc.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const topMax = Math.max(1, ...top.map((t) => t[1]));

  return (
    <div className="overview">
      <div className="kpi-row">
        <div className="kpi kpi-hero"><span>Ingresos estimados · 30 días</span><strong>{money(earned)}</strong><small>Citas confirmadas y completadas</small></div>
        <div className="kpi"><span>Citas hoy</span><strong>{todayN}</strong></div>
        <div className="kpi kpi-warn"><span>Por confirmar</span><strong>{pending}</strong></div>
      </div>
      <div className="overview-grid">
        <section className="panel-card span-2">
          <header><h3>Citas por día</h3><small>Últimos {DAYS} días</small></header>
          <Bars data={days} today={today} />
        </section>
        <section className="panel-card">
          <header><h3>Estado de las citas</h3></header>
          <div className="donut-wrap">
            <Donut parts={parts} total={rows.length} />
            <ul className="legend">
              {parts.map((p) => <li key={p.key}><i style={{ background: p.color }} />{p.label}<b>{p.n}</b></li>)}
            </ul>
          </div>
        </section>
        <section className="panel-card span-3">
          <header><h3>Servicios más pedidos</h3><small>Últimos 30 días</small></header>
          {top.length ? (
            <ul className="hbars">
              {top.map(([name, n]) => (
                <li key={name}><span>{name}</span><div><i style={{ width: `${(n / topMax) * 100}%` }} /></div><b>{n}</b></li>
              ))}
            </ul>
          ) : <p className="empty">Aún no hay citas en este periodo.</p>}
        </section>
      </div>
    </div>
  );
}
