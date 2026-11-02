import "./globals.css";
import { DM_Sans, Manrope } from "next/font/google";

const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });

export const metadata = {
  title: "BarberPro | Reservas y gestión para barberías",
  description: "Plataforma de reservas y administración para barberías.",
  applicationName: "BarberPro"
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${dmSans.variable} ${manrope.variable}`}>
      <body>{children}</body>
    </html>
  );
}
