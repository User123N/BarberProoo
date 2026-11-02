import Link from "next/link";
import Brand from "@/components/Brand";
import HeroScene from "@/components/HeroScene";

const features = [
  { id: "agenda", size: "wide", title: "Horarios reales, sin cruces", text: "El cliente sólo ve horas libres. Se respeta el horario de cada barbero, los turnos con almuerzo, los festivos, los bloqueos y la duración del servicio." },
  { id: "equipo", title: "Equipo y servicios", text: "Cada barbero con su horario y sus servicios asignados, con precios y duraciones editables." },
  { id: "clientes", title: "Clientes con historial", text: "Directorio con búsqueda y reservas anteriores, visible según el rol de cada persona." },
  { id: "roles", size: "tall", title: "Un panel para cada rol", text: "Propietario, administrador, gerente, recepción y barbero ven y hacen sólo lo que les corresponde." },
  { id: "codigo", title: "Código de reserva", text: "Tus clientes consultan, cancelan o reprograman con su código y su teléfono, según las reglas de tu negocio." },
  { id: "tenant", size: "wide", title: "Cada barbería, aislada", text: "Los datos de un negocio nunca se mezclan con los de otro: el aislamiento está en la base de datos, no sólo en la pantalla." }
];

const sample = [
  ["09:00", "Corte clásico", "Confirmada", "ok"],
  ["10:00", "Barba y toalla caliente", "Pendiente", "wait"],
  ["11:30", "Corte y perfilado", "Confirmada", "ok"],
  ["12:30", "Almuerzo", "Bloqueado", "off"]
];

export default function Home() {
  return (
    <>
      <header className="shell topbar">
        <Brand />
        <nav className="top-actions">
          <a className="nav-link" href="#funciones">Funciones</a>
          <a className="nav-link" href="#agenda">Agenda</a>
          <Link className="nav-link" href="/reserva">Mi reserva</Link>
          <Link className="btn" href="/login">Acceder</Link>
        </nav>
      </header>

      <main>
        <section className="shell hero">
          <div className="hero-copy">
            <p className="hero-kicker">Reservas y gestión para barberías</p>
            <h1>La agenda de tu barbería, sin un solo cruce de horarios.</h1>
            <p className="lead">Tus clientes reservan en segundos, tu equipo ve su día en una vista y tú controlas servicios, clientes y pagos desde un mismo lugar.</p>
            <div className="actions">
              <Link className="btn primary" href="/login">Entrar al panel</Link>
              <a className="btn ghost" href="#agenda">Ver cómo funciona</a>
            </div>
          </div>
          <HeroScene />
        </section>

        <section className="shell agenda-preview" id="agenda">
          <div className="agenda-copy">
            <h2>Tu día completo, de un vistazo.</h2>
            <p>Citas pendientes, confirmadas y bloqueos con un color propio cada una. Mueve una cita a otra hora arrastrándola.</p>
            <small className="sample-note">Vista de ejemplo con datos ficticios.</small>
          </div>
          <div className="agenda-glass" role="img" aria-label="Ejemplo de agenda diaria con cuatro citas">
            <div className="agenda-glass-head"><b>Hoy</b><span>3 citas · 1 bloqueo</span></div>
            {sample.map(([time, name, status, tone]) => (
              <div className={`agenda-row tone-${tone}`} key={time}>
                <time>{time}</time>
                <span>{name}</span>
                <em>{status}</em>
              </div>
            ))}
          </div>
        </section>

        <section className="shell features" id="funciones">
          <h2>Lo esencial, bien resuelto.</h2>
          <div className="bento">
            {features.map((f) => (
              <article className={`bento-item ${f.size || ""}`} key={f.id}>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="shell photo-band" aria-label="El oficio">
          <figure className="pb-a"><img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=80" alt="Barbero perfilando una barba" width="900" height="1100" loading="lazy" decoding="async" /><figcaption>Precisión en cada línea</figcaption></figure>
          <div className="pb-copy">
            <h2>Una experiencia a la altura de tu marca.</h2>
            <p>Tus clientes reservan desde una página con tu logo, tu portada, tus servicios y tu equipo. Tú decides cómo se ve tu barbería; BarberPro se encarga del orden.</p>
            <ul className="pb-list">
              <li><span>Página pública propia</span><small>Con logo, portada y fotos de tu equipo.</small></li>
              <li><span>Reserva en pocos pasos</span><small>Servicio, profesional, fecha, hora y datos.</small></li>
              <li><span>Avisos por WhatsApp</span><small>Contacta a tu cliente con un mensaje listo.</small></li>
            </ul>
          </div>
          <figure className="pb-b"><img src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=800&q=80" alt="Interior de barbería con sillones de cuero" width="800" height="1000" loading="lazy" decoding="async" /><figcaption>Tu espacio, bien presentado</figcaption></figure>
        </section>

        <section className="shell gallery">
          <figure className="g-main">
            <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=1100&q=80" alt="Interior de una barbería moderna" width="1100" height="760" loading="lazy" decoding="async" />
          </figure>
          <figure>
            <img src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=700&q=80" alt="Herramientas profesionales de barbería" width="700" height="500" loading="lazy" decoding="async" />
          </figure>
          <figure>
            <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=700&q=80" alt="Trabajo profesional de barbería" width="700" height="500" loading="lazy" decoding="async" />
          </figure>
        </section>

        <section className="shell cta-band">
          <h2>Pon orden en tu agenda desde hoy.</h2>
          <div className="actions">
            <Link className="btn primary" href="/login">Entrar al panel</Link>
            <Link className="btn ghost" href="/reserva">Consultar una reserva</Link>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="shell footer-row">
          <Brand />
          <span>© {new Date().getFullYear()} BarberPro. Plataforma de gestión para barberías.</span>
        </div>
      </footer>
    </>
  );
}
