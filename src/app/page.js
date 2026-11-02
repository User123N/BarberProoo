import Link from "next/link";
import Brand from "@/components/Brand";

const available = [
  ["◷", "Reservas con horarios reales", "El cliente sólo ve horas libres: respeta el horario de cada barbero, turnos con almuerzo, festivos, bloqueos y la duración del servicio."],
  ["✂", "Equipo y servicios", "Barberos con horario propio, servicios asignados por barbero, precios y duraciones editables."],
  ["◎", "Clientes", "Directorio con búsqueda e historial de reservas, visible según el rol de cada persona."],
  ["▤", "Panel por roles", "Propietario, administrador, gerente, recepción y barbero ven y hacen sólo lo que les corresponde."],
  ["⌁", "Código de reserva", "Tus clientes consultan, cancelan o reprograman con su código y teléfono, según las reglas de tu negocio."],
  ["◆", "Multiempresa segura", "Cada barbería está aislada de las demás con políticas a nivel de base de datos."]
];

export default function Home() {
  return (
    <>
      <header className="shell topbar">
        <Brand />
        <nav style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 13 }}>
          <a className="muted" href="#funciones">Funciones</a>
          <Link className="muted" href="/reserva">Mi reserva</Link>
          <Link className="btn" href="/login">Acceder</Link>
        </nav>
      </header>
      <main className="shell">
        <section className="hero">
          <div>
            <div className="eyebrow">La nueva forma de gestionar tu barbería</div>
            <h1>Tu barbería.<br /><span>Tu agenda.</span><br />Todo en orden.</h1>
            <p className="lead">Reservas online sin cruces de horario, control de tu equipo y de tus clientes en una plataforma pensada para barberías.</p>
            <div className="actions">
              <Link className="btn primary" href="/login">Entrar al panel →</Link>
              <a className="btn" href="#funciones">Explorar funciones</a>
            </div>
          </div>
          <div className="hero-card hero-visual">
            <div className="visual-topline"><span className="eyebrow">BARBER EXPERIENCE · 01</span><span className="visual-live">● SISTEMA ACTIVO</span></div>
            <div className="barber-3d-scene" aria-hidden="true"><div className="scene-ring ring-one"/><div className="scene-ring ring-two"/><div className="clipper-3d"><div className="clipper-head"/><div className="clipper-body"/><div className="clipper-grip"/><div className="clipper-switch"/></div><div className="scene-star">✦</div></div>
            <div className="visual-caption"><div><div className="eyebrow">GESTIÓN INTELIGENTE</div><h2>Tu negocio, en otro nivel.</h2><p>Agenda, equipo y clientes en perfecta sincronía.</p></div><div className="visual-number">BP<span> / 01</span></div></div>
          </div>
        </section>
        <section className="showcase-strip"><div className="showcase-image"><img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=82" alt="Interior de una barbería moderna" loading="lazy"/><span>01 / THE SPACE</span></div><div className="showcase-copy"><div className="eyebrow">DISEÑADO PARA PROFESIONALES</div><h2>Una experiencia que se siente tan bien como se ve.</h2><p>Una plataforma para ordenar el día a día, elevar la atención y proyectar una marca profesional.</p><div className="showcase-points"><span>✦ Agenda clara</span><span>✦ Equipo organizado</span><span>✦ Marca propia</span></div></div></section>
        <section className="section" id="funciones">
          <div className="eyebrow">Disponible hoy</div>
          <h2 className="section-title">Lo esencial, bien hecho.</h2>
          <div className="grid">
            {available.map(([icon, title, description]) => (
              <article className="feature" key={title}>
                <div className="iconbox">{icon}</div>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="visual-gallery"><div className="eyebrow">EL UNIVERSO BARBERPRO</div><h2 className="section-title">Cada detalle cuenta.</h2><div className="gallery-tiles"><figure><img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=82" alt="Herramientas profesionales de barbería" loading="lazy"/><figcaption>PRECISIÓN</figcaption></figure><figure><img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=82" alt="Trabajo profesional de barbería" loading="lazy"/><figcaption>ESTILO</figcaption></figure><figure><img src="https://images.unsplash.com/photo-1593702295094-aea8c6c7e1d7?auto=format&fit=crop&w=900&q=82" alt="Sillón de barbería" loading="lazy"/><figcaption>EXPERIENCIA</figcaption></figure></div></section>
      </main>
      <footer className="footer"><div className="shell">© {new Date().getFullYear()} BarberPro. Plataforma de gestión para barberías.</div></footer>
    </>
  );
}
