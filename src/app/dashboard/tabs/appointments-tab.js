"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatInTz } from "@/lib/tz";
import { isStaff } from "@/lib/roles";
import { SkeletonRows } from "@/components/Skeleton";

const PAGE = 20;
const LABEL = { pending: "Pendiente", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };

export default function AppointmentsTab({ business, role }) {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [counts, setCounts] = useState({ all: 0, pending: 0, confirmed: 0 });
  const [page, setPage] = useState(0);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const countBy = useCallback(async (status) => {
    let q = sb.from("appointments").select("id", { count: "exact", head: true }).eq("business_id", business.id);
    if (status) q = q.eq("status", status);
    const { count } = await q;
    return count || 0;
  }, [sb, business.id]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    let q = sb.from("appointments")
      .select("id,status,starts_at,customer:customers(full_name,phone),barber:barbers(display_name),appointment_items(service_name,price)", { count: "exact" })
      .eq("business_id", business.id).order("starts_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    if (filter !== "all") q = q.eq("status", filter);
    const [{ data, error: err, count }, all, pending, confirmed] = await Promise.all([q, countBy(null), countBy("pending"), countBy("confirmed")]);
    if (err) setError(err.message);
    setRows(data || []); setTotal(count || 0); setCounts({ all, pending, confirmed });
    setLoading(false);
  }, [sb, business.id, page, filter, countBy]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, next) {
    const { error: err } = await sb.from("appointments").update({ status: next }).eq("id", id).eq("business_id", business.id);
    if (err) setError(err.message.includes("no_overlapping") ? "Ese horario ya está ocupado." : err.message); else load();
  }

  const options = isStaff(role) ? Object.keys(LABEL) : ["completed", "no_show"];
  const pages = Math.max(1, Math.ceil(total / PAGE));
  function whatsapp(a) {
    const raw = (a.customer?.phone || "").replace(/\D/g, "");
    const phone = raw.length === 10 ? `57${raw}` : raw;
    if (!phone) return setError("Este cliente no tiene teléfono registrado.");
    const service = a.appointment_items?.map(x => x.service_name).join(", ") || "tu cita";
    const message = `Hola ${a.customer?.full_name || ""}, te contactamos de ${business.name} para confirmar tu cita de ${service} el ${formatInTz(a.starts_at, business.timezone)}.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <div className="stats-row">
        <div className="stat-card"><span>Reservas totales</span><strong>{counts.all}</strong></div>
        <div className="stat-card stat-wait"><span>Pendientes</span><strong>{counts.pending}</strong></div>
        <div className="stat-card stat-ok"><span>Confirmadas</span><strong>{counts.confirmed}</strong></div>
      </div>
      {error && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <div className="chip-row" role="group" aria-label="Filtrar por estado">
          {[["all", "Todas"], ...Object.entries(LABEL)].map(([k, v]) => (
            <button key={k} type="button" className={filter === k ? "chip active" : "chip"} onClick={() => { setPage(0); setFilter(k); }}>{v}</button>
          ))}
        </div>
        <button className="btn btn-outline" onClick={load}>Actualizar</button>
      </div>
      <div className="table-card"><div className="table-scroll stack-table">
        <table>
          <thead><tr><th>Cliente</th><th>Servicio</th><th>Barbero</th><th>Fecha</th><th>Estado</th><th>Acción</th></tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id}>
                <td data-label="Cliente"><span className="who"><span className="avatar">{(a.customer?.full_name || "C").slice(0, 1).toUpperCase()}</span><span><b>{a.customer?.full_name || "Cliente"}</b>{isStaff(role) && <small>{a.customer?.phone}</small>}</span></span></td>
                <td data-label="Servicio">{a.appointment_items?.map((x) => x.service_name).join(", ")}</td>
                <td data-label="Barbero">{a.barber?.display_name}</td>
                <td data-label="Fecha">{formatInTz(a.starts_at, business.timezone)}</td>
                <td data-label="Estado"><span className={`status ${a.status}`}>{LABEL[a.status]}</span></td>
                <td data-label="Acción">
                  <div className="appointment-actions"><select value={a.status} onChange={(e) => setStatus(a.id, e.target.value)}>
                    {!options.includes(a.status) && <option value={a.status} disabled>{LABEL[a.status]}</option>}
                    {options.map((k) => <option key={k} value={k}>{LABEL[k]}</option>)}
                  </select><button className="whatsapp-mini" type="button" onClick={() => whatsapp(a)} title="Contactar por WhatsApp">WhatsApp</button></div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <SkeletonRows rows={4} />}
        {!loading && !rows.length && <p className="empty">No hay reservas para mostrar.</p>}
      </div></div>
      <div className="pager">
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button>
        <span className="muted">Página {page + 1} de {pages}</span>
        <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
      </div>
    </>
  );
}
