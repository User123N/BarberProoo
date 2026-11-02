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
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    let q = sb.from("customers")
      .select("id,full_name,phone,email,photo_url,created_at", { count: "exact" })
      .eq("business_id", business.id)
      .order("created_at", { ascending: false })
      .range(page * PAGE, page * PAGE + PAGE - 1);
    const term = search.replace(/[,()%*\\]/g, " ").trim();
    if (term) q = q.or(`full_name.ilike.%${term}%,phone.ilike.%${term}%`);
    const { data, error: err, count } = await q;
    if (err) setError(err.message);
    const safeRows = await Promise.all((data || []).map(async (customer) => {
      if (!customer.photo_url) return customer;
      if (customer.photo_url.startsWith("http")) return customer;
      const { data: signed } = await sb.storage.from("barberpro-private").createSignedUrl(customer.photo_url, 3600);
      return { ...customer, photo_url: signed?.signedUrl || "" };
    }));
    setRows(safeRows);
    setTotal(count || 0);
    setLoading(false);
  }, [sb, business.id, page, search]);

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
  }, [load]);

  async function uploadCustomerPhoto(customer, file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return setError("Selecciona una imagen.");
    if (file.size > 5 * 1024 * 1024) return setError("La foto no puede superar 5 MB.");
    setUploadingId(customer.id);
    setError("");
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${business.id}/customers/${customer.id}-${Date.now()}.${ext}`;
    const { error: uploadError } = await sb.storage.from("barberpro-private").upload(path, file, { contentType: file.type });
    if (uploadError) {
      setError(uploadError.message);
    } else {
      const { error: saveError } = await sb.from("customers")
        .update({ photo_url: path }).eq("id", customer.id).eq("business_id", business.id);
      if (saveError) setError(saveError.message);
      else {
        const { data: signed } = await sb.storage.from("barberpro-private").createSignedUrl(path, 3600);
        setRows((old) => old.map((row) => row.id === customer.id
          ? { ...row, photo_url: signed?.signedUrl || "" }
          : row));
      }
    }
    setUploadingId("");
  }

  const pages = Math.max(1, Math.ceil(total / PAGE));

  return (
    <>
      {error && <div className="error-box">{error}</div>}
      <div className="toolbar">
        <label className="search-box"><Icon name="search" size={18} />
          <input placeholder="Buscar por nombre o teléfono" value={search}
            onChange={(e) => { setPage(0); setSearch(e.target.value); }} />
        </label>
        <span className="muted">{total} cliente(s)</span>
      </div>
      {loading && !rows.length ? <SkeletonRows rows={6} /> : (
        <div className="table-card table-scroll stack-table">
          <table>
            <thead><tr><th>Nombre</th><th>Teléfono</th><th>Correo</th><th>Registro</th></tr></thead>
            <tbody>{rows.map((customer) => (
              <tr key={customer.id}>
                <td data-label="Nombre">
                  <span className="who">
                    {customer.photo_url
                      ? <img className="avatar customer-photo" src={customer.photo_url} alt="" />
                      : <span className="avatar">{customer.full_name.slice(0, 1).toUpperCase()}</span>}
                    <b>{customer.full_name}</b>
                    <label className="customer-photo-upload">
                      {uploadingId === customer.id ? "Subiendo…" : customer.photo_url ? "Cambiar foto" : "Agregar foto"}
                      <input type="file" accept="image/*" disabled={uploadingId === customer.id}
                        onChange={(e) => uploadCustomerPhoto(customer, e.target.files?.[0])} />
                    </label>
                  </span>
                </td>
                <td data-label="Teléfono">{customer.phone}</td>
                <td data-label="Correo">{customer.email || "—"}</td>
                <td data-label="Registro">{new Date(customer.created_at).toLocaleDateString("es-CO")}</td>
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
