import Brand from "@/components/Brand";
import ResetForm from "./reset-form";

export const metadata = { title: "Nueva contraseña | BarberPro" };

export default function ResetPage() {
  return (
    <>
      <header className="shell topbar"><Brand /></header>
      <main className="shell auth-wrap">
        <section className="auth-card">
          <div className="eyebrow">Nueva contraseña</div>
          <h1 style={{ fontSize: 30, margin: "12px 0" }}>Crea tu nueva contraseña.</h1>
          <ResetForm />
        </section>
      </main>
    </>
  );
}
