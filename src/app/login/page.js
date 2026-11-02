import { Suspense } from "react";
import Brand from "@/components/Brand";
import LoginForm from "./login-form";
import HeroScene from "@/components/HeroScene";

export const metadata = { title: "Acceder | BarberPro" };

export default function LoginPage() {
  return (
    <>
      <header className="shell topbar"><Brand /><span className="muted" style={{fontSize:12}}>Acceso seguro</span></header>
      <main className="shell auth-wrap auth-split">
        <div className="auth-art"><HeroScene compact /><p>Tu agenda, tu equipo y tus clientes en un solo lugar.</p></div>
        <section className="auth-card">
          <div className="eyebrow">Bienvenido de nuevo</div>
          <h1 style={{fontSize:34,margin:"12px 0"}}>Inicia sesión.</h1>
          <p className="muted" style={{lineHeight:1.6}}>Accede al espacio de administración de tu barbería.</p>
          <Suspense fallback={null}><LoginForm /></Suspense>
        </section>
      </main>
    </>
  );
}
