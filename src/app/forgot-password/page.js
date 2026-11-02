import Brand from "@/components/Brand";
import ForgotForm from "./forgot-form";

export const metadata = { title: "Recuperar contraseña | BarberPro" };

export default function ForgotPage() {
  return (
    <>
      <header className="shell topbar"><Brand /></header>
      <main className="shell auth-wrap">
        <section className="auth-card">
          <div className="eyebrow">Recuperar acceso</div>
          <h1 style={{ fontSize: 30, margin: "12px 0" }}>¿Olvidaste tu contraseña?</h1>
          <p className="muted" style={{ lineHeight: 1.6 }}>Te enviaremos un enlace para crear una nueva.</p>
          <ForgotForm />
        </section>
      </main>
    </>
  );
}
