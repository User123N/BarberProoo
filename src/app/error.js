"use client";

export default function GlobalError({ reset }) {
  return (
    <main className="shell auth-wrap">
      <section className="auth-card">
        <div className="eyebrow">Algo salió mal</div>
        <h1 style={{ fontSize: 28, margin: "12px 0" }}>No pudimos cargar esta página.</h1>
        <p className="muted">Inténtalo de nuevo. Si el problema continúa, vuelve más tarde.</p>
        <button className="btn primary" onClick={() => reset()}>Reintentar</button>
      </section>
    </main>
  );
}
