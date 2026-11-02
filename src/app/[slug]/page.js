import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BookingForm from "./booking-form";
import HeroScene from "@/components/HeroScene";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  return { title: `${slug} | BarberPro` };
}

export default async function PublicBusinessPage({ params }) {
  const { slug } = await params;
  const sb = await createClient();
  const { data: business } = await sb.from("businesses")
    .select("id,name,slug,description,logo_url,cover_url,phone,address,city,timezone,latitude,longitude")
    .eq("slug", slug).eq("status", "active").maybeSingle();
  if (!business) notFound();

  const [{ data: services }, { data: barbers }, { data: gallery }, { data: products }] = await Promise.all([
    sb.from("services").select("id,name,description,price,duration_minutes,image_url")
      .eq("business_id", business.id).eq("active", true).order("created_at"),
    sb.from("barbers").select("id,display_name,bio,photo_url")
      .eq("business_id", business.id).eq("active", true).order("created_at"),
    sb.from("gallery_images").select("id,media_url,media_type,description,position")
      .eq("business_id", business.id).eq("active", true).order("position"),
    sb.from("products").select("id,name,description,category,price,compare_at_price,image_url,featured,stock")
      .eq("business_id", business.id).eq("active", true).order("featured", { ascending: false }).order("position").order("created_at", { ascending: false })
  ]);

  const whatsappNumber = (business.phone || "").replace(/\D/g, "").replace(/^0+/, "");
  const whatsapp = whatsappNumber ? (whatsappNumber.startsWith("57") ? whatsappNumber : "57" + whatsappNumber) : "";
  const mapQuery = business.latitude != null && business.longitude != null
    ? `${business.latitude},${business.longitude}`
    : [business.address, business.city].filter(Boolean).join(", ") || [business.name, business.city].filter(Boolean).join(", ");
  const mapUrl = `https://maps.google.com/maps?hl=es&q=${encodeURIComponent(mapQuery)}&z=15&ie=UTF8&iwloc=B&output=embed`;

  return (
    <main className="public-page">
      <nav className="public-nav shell">
        <Link className="brand" href="/">
          {business.logo_url
            ? <span className="public-logo-float"><img className="public-brand-logo" src={business.logo_url} alt={`Logo de ${business.name}`} /></span>
            : <>BARBER<span>PRO</span></>}
          <span className="public-brand-name">{business.name}</span>
        </Link>
        <a href="#reservar" className="btn btn-outline">Reservar ahora</a>
      </nav>

      <section className="public-hero" style={business.cover_url ? { backgroundImage: `linear-gradient(90deg,rgba(8,9,11,.94),rgba(8,9,11,.48)),url("${business.cover_url}")` } : undefined}>
        <div className="public-scene"><HeroScene compact /></div>
        <div className="shell hero-content">
          {business.logo_url && <div className="public-hero-logo-wrap"><img className="public-hero-logo" src={business.logo_url} alt="" /></div>}
          <div className="eyebrow">Estilo, precisión y experiencia</div>
          <h1>{business.name}</h1>
          <p>{business.description || "Tu estilo, nuestra pasión. Reserva tu próximo corte en pocos pasos."}</p>
          <a href="#reservar" className="btn btn-primary">Agendar una cita <span>↗</span></a>
          <div className="hero-meta">{[business.address, business.city].filter(Boolean).join(" · ")}{business.phone ? ` · ${business.phone}` : ""}</div>
        </div>
      </section>

      <section className="shell public-section">
        <div className="section-heading"><div><div className="eyebrow">Nuestro catálogo</div><h2>Servicios destacados</h2></div><span className="muted">Calidad en cada detalle</span></div>
        <div className="service-grid">
          {(services || []).map(s => <article className="service-card" key={s.id}>
            {s.image_url ? <img className="service-catalog-image" src={s.image_url} alt={s.name} loading="lazy" /> : <div className="service-symbol" aria-hidden="true">✂</div>}
            <h3>{s.name}</h3><p>{s.description || "Un servicio pensado para ti."}</p>
            <div className="service-bottom"><strong>${Number(s.price).toLocaleString("es-CO")}</strong><span>{s.duration_minutes} min</span></div>
          </article>)}
          {!services?.length && <p className="muted">Pronto publicaremos nuestros servicios.</p>}
        </div>
      </section>

      {!!products?.length && <section className="public-section public-products">
        <div className="shell">
          <div className="public-products-head"><div className="eyebrow">Tienda de la barbería</div><h2>Productos para llevar tu estilo más lejos.</h2><p>Descubre nuestra selección de cuidado personal y productos profesionales. Haz tu pedido directamente por WhatsApp.</p></div>
          <div className="public-products-grid">{products.map(product => {
            const message = "Hola, quiero comprar este producto de " + business.name + ": " + product.name + " - $" + Number(product.price).toLocaleString("es-CO") + ". ¿Me das más información?";
            const orderUrl = whatsapp ? "https://wa.me/" + whatsapp + "?text=" + encodeURIComponent(message) : "";
            return <article className="public-product-card" key={product.id}>
              <div className="public-product-photo">{product.image_url ? <img src={product.image_url} alt={product.name} loading="lazy"/> : <span>✦</span>}{product.featured && <b>RECOMENDADO</b>}</div>
              <div className="public-product-info">{product.category && <small>{product.category}</small>}<h3>{product.name}</h3><p>{product.description || "Calidad profesional para cuidar tu estilo."}</p>
                <div className="public-product-price"><strong>{"$" + Number(product.price).toLocaleString("es-CO")}</strong>{product.compare_at_price > product.price && <del>{"$" + Number(product.compare_at_price).toLocaleString("es-CO")}</del>}</div>
                {product.stock === 0 ? <span className="muted">Agotado</span> : orderUrl ? <a className="public-product-buy" href={orderUrl} target="_blank" rel="noopener noreferrer">Pedir por WhatsApp <span>↗</span></a> : <span className="muted">WhatsApp no configurado</span>}
              </div>
            </article>;
          })}</div>
        </div>
      </section>}

      <section className="shell public-section">
        <div className="section-heading"><div><div className="eyebrow">El equipo</div><h2>Conoce a tus barberos</h2></div></div>
        <div className="barber-grid">{(barbers || []).map(b => <article className="barber-card" key={b.id}>
          {b.photo_url ? <img src={b.photo_url} alt={b.display_name} loading="lazy" /> : <div className="barber-avatar">{b.display_name.slice(0,1).toUpperCase()}</div>}
          <h3>{b.display_name}</h3><p>{b.bio || "Barbero profesional"}</p>
        </article>)}</div>
      </section>

      {!!gallery?.length && <section className="shell public-section public-gallery-section">
        <div className="section-heading"><div><div className="eyebrow">Nuestro espacio</div><h2>Conoce la barbería</h2></div></div>
        <div className="public-media-grid">{gallery.map(item => <article className="public-media-card" key={item.id}>
          {item.media_type === "video"
            ? <video src={item.media_url} controls playsInline preload="metadata" aria-label={item.description || "Video de la barbería"} />
            : <img src={item.media_url || item.image_url} alt={item.description || "Imagen de la barbería"} loading="lazy" />}
          {item.description && <p>{item.description}</p>}
        </article>)}</div>
      </section>}

      <section className="shell public-section location-section">
        <div className="section-heading"><div><div className="eyebrow">Cómo llegar</div><h2>Visítanos</h2><p className="muted">{[business.address,business.city].filter(Boolean).join(", ")}</p></div>
          <a className="btn btn-outline" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`} target="_blank" rel="noopener noreferrer">Abrir en Google Maps ↗</a>
        </div>
        <div className="location-map"><iframe title={`Ubicación de ${business.name}`} src={mapUrl} loading="lazy" allowFullScreen /></div>
      </section>

      <section className="shell public-section booking-layout" id="reservar">
        <div className="booking-copy"><div className="eyebrow">Tu próximo look comienza aquí</div><h2>Reserva sin llamadas ni esperas.</h2>
          <p>Elige tu servicio y tu profesional, y escoge entre los horarios realmente disponibles. Recibirás un código para consultar, cancelar o reprogramar.</p>
          <div className="booking-perk">✓ Reserva en pocos pasos</div><div className="booking-perk">✓ Precios y duración visibles</div><div className="booking-perk">✓ Consulta, cancela o reprograma con tu código</div>
        </div>
        {services?.length && barbers?.length ? <BookingForm slug={slug} services={services} barbers={barbers} timezone={business.timezone || "America/Bogota"} /> :
          <div className="booking-card"><h2>Reservas no disponibles</h2><p className="muted">La barbería aún no ha publicado servicios y barberos.</p></div>}
      </section>
      <footer className="public-footer"><span>BARBER<span>PRO</span></span><span>Reservas gestionadas con BarberPro</span></footer>
    </main>
  );
}
