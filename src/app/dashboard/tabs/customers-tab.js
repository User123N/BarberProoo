"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Icon from "@/components/Icons";
import { SkeletonRows } from "@/components/Skeleton";

const PAGE = 25;

export default function CustomersTab({ business }) {
  const sb = useMemo(() => createClient(), []);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);\n  const [uploadingId, setUploadingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError("");
    let q = sb.from("customers").select("id,full_name,phone,email,photo_url,created_at", { count: "exact" })
      .eq("business_id", business.id).order("created_at", { ascending: false }).range(page * PAGE, page * PAGE + PAGE - 1);
    const term = search.replace(/[,()%*\\]/g, " ").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data, error: err, count } = await q;
    if (err) setError(err.message);
    setRows(data || []); setTotal(count || 0); setLoading(false);
  }, [sb, business.id, page, search]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  const pages = Math.max(1, Math.ceil(total / PAGE));\n\n  async function uploadCustomerPhoto(customer, file) {\n    if (!file) return;\n    if (!file.type.startsWith("image/")) return setError("Selecciona una imagen.");\n    if (file.size > 5 * 1024 * 1024) return setError("La foto no puede superar 5 MB.");\n    setUploadingId(customer.id); setError("");\n    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");\n    const path = `${business.id}/customers/${customer.id}-${Date.now()}.${ext}`;\n    const { error: upErr } = await sb.storage.from("barberpro-media").upload(path, file, { contentType: file.type });\n    if (upErr) setError(upErr.message);\n    else {\n      const { data } = sb.storage.from("barberpro-media").getPublicUrl(path);\n      const { error: saveErr } = await sb.from("customers").update({ photo_url: data.publicUrl }).eq("id", customer.id).eq("business_id", business.id);\n      if (saveErr) setError(saveErr.message); else setRows((old) => old.map((row) => row.id === customer.id ? { ...row, photo_url: data.publicUrl } : row));\n    }\n    setUploadingId("");\n  }

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <label className="search-box"><Icon name="search" size={18} />
          <input placeholder="Buscar por nombre o teléfono" value={search} onChange={(e) => { setPage(0); setSearch(e.target.value); }} />
        </label>
        <span className="muted">{total} cliente(s)</span>
      </div>
      {loading && !rows.length ? <SkeletonRows rows={6} /> : (
        <div className="table-card table-scroll stack-table">
          <table>
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Registro</th></tr></thead>
            <tbody>{rows.map((c) => (
              <tr key={c.id}>
                <td data-label="Nombre"><span className="who">{c.photo_url ? <img className="avatar customer-photo" src={c.photo_url} alt="" /> : <span className="avatar">{c.full_name.slice(0, 1).toUpperCase()}</span>}<b>{c.full_name}</b><label className="customer-photo-upload">{uploadingId === c.id ? "Subiendo…" : c.photo_url ? "Cambiar foto" : "Agregar foto"}<input type="file" accept="image/*" disabled={uploadingId === c.id} onChange={(e) => uploadCustomerPhoto(c, e.target.files?.[0])} /></label></span></td>
                <td data-label="Teléfono">{c.phone}</td>
                <td data-label="Correo">{c.email || "—"}</td>
                <td data-label="Registro">{new Date(c.created_at).toLocaleDateString("es-CO")}</td>
              </tr>
            ))}</tbody>
          </table>
          {!loading && !rows.length && <p className="empty">Sin resultados.</p>}
        </div>
      )}
      <div className="pager">
        <button className="btn" disabled={page === 0} onClick={() => setPage(page - 1)}>← Anterior</button>
        <span className="muted">Página {page + 1} de {pages}</span>
        <button className="btn" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)}>Siguiente →</button>
      </div>
    </>
  );
}
