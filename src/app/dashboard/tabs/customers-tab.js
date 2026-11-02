"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const PAGE = 25;

export default function CustomersTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    let q = sb.from("customers").select("id,full_name,phone,email,created_at", { count: "exact" })
      .eq("business_id", business.id).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    const term = search.replace(/[,()%*\\]/g, " ").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data, error: err, count } = await q;
    if (err) setError(err.message);
    setRows(data || []); setTotal(count || 0); setLoading(false);
  }, [sb, business.id, page, search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <p className="muted">{total} cliente(s)</p>
      <input placeholder="Buscar por nombre o teléfono" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} style={{ margin: "8px 0 14px", width: "100%", maxWidth: 360 }} />
      <div className="table-card table-scroll">
        <table>
          <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Registro</th></tr></thead>
          <tbody>{rows.map((c) => (
            <tr key={c.id}><td>{c.full_name}</td><td>{c.phone}</td><td>{c.email || "—"}</td><td>{new Date(c.created_at).toLocaleDateString("es-CO")}</td></tr>
          ))}</tbody>
        </table>
        {loading && <p className="empty">Cargando…</p>}
        {!loading && !rows.length && <p className="empty">Sin resultados.</p>}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 12 }}>
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button>
        <span className="muted">Página {page + 1} de {pages}</span>
        <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
      </div>
    </>
  );
}
