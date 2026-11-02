import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell auth-wrap">
      <section className="auth-card">
        <div className="eyebrow">Error 404</div>
        <h1 style={{ fontSize: 28, margin: "12px 0" }}>No encontramos esta página.</h1>
        <p className="muted">La dirección no existe o la barbería no está disponible.</p>
        <Link className="btn primary" href="/">Volver al inicio</Link>
      </section>
    </main>
  );
}
