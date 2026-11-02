import Brand from "@/components/Brand";
import ReservaClient from "./reserva-client";

export const metadata = { title: "Mi reserva | BarberPro" };

export default function ReservaPage() {
  return (
    <>
      <header className="shell topbar"><Brand /></header>
      <main className="shell auth-wrap">
        <section className="auth-card" style={{ width: "min(560px,100%)" }}>
          <div className="eyebrow">Mi reserva</div>
          <h1 style={{ fontSize: 30, margin: "12px 0" }}>Consulta tu cita.</h1>
          <p className="muted" style={{ lineHeight: 1.6 }}>Ingresa el código que recibiste y el teléfono con el que reservaste.</p>
          <ReservaClient />
        </section>
      </main>
    </>
  );
}
