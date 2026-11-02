import "./globals.css";
import "./premium.css";
import { DM_Sans, Manrope, Fraunces } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", display: "swap", axes: ["opsz"] });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata = {
  title: "BarberPro | Reservas y gestión para barberías",
  description: "Plataforma de reservas y administración para barberías.",
  applicationName: "BarberPro"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${manrope.variable} ${fraunces.variable}`}>
      <body>{children}</body>
    </html>
  );
}
