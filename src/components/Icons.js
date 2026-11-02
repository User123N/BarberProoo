/** Iconos de línea (24x24). Un solo trazo para todo el producto. */
const P = {
  overview: "M4 13h6V4H4v9Zm0 7h6v-4H4v4Zm10 0h6v-9h-6v9Zm0-16v4h6V4h-6Z",
  calendar: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z",
  appointments: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01",
  customers: "M16 19v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 17.5V19M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm9 8v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 5.2a3 3 0 0 1 0 5.6",
  services: "M6 3l6 9m0 0 6-9M12 12l-6.5 9M12 12l6.5 9M5 21h.01M19 21h.01",
  barbers: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0",
  hours: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm7.4-3a7.4 7.4 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7.5 7.5 0 0 0-2-1.2L14.600 3h-4l-.4 2.600a7.500 7.500 0 0 0-2 1.200l-2.300-.9-2 3.400 2 1.500a7.400 7.400 0 0 0 0 2.400l-2 1.500 2 3.400 2.300-.9c.600.500 1.300.900 2 1.200l.4 2.600h4l.4-2.600c.700-.300 1.400-.700 2-1.200l2.300.9 2-3.400-2-1.500c.100-.400.100-.800.100-1.200Z",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  search: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Zm9 3-4.500-4.500",
  clock: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  plus: "M12 5v14M5 12h14",
  scissors: "M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm0 12a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM8.100 7.900 20 19M8.100 16.100 20 5",
  razor: "M3 15l11-9 3 3-9 11H3v-5Zm11-9 3-2 3 3-2 3",
  beard: "M5 8c0-3 3-5 7-5s7 2 7 5v3c0 5-3 9-7 9s-7-4-7-9V8Zm4 6c1 1 2 1.500 3 1.500s2-.500 3-1.500",
  comb: "M3 7h18v4H3V7Zm2 4v6m3-6v6m3-6v6m3-6v6m3-6v6m3-6v6",
  spark: "M12 3l1.800 5.200L19 10l-5.200 1.800L12 17l-1.800-5.200L5 10l5.200-1.800L12 3Z",
  shield: "M12 3l8 3v6c0 5-3.500 8-8 9-4.500-1-8-4-8-9V6l8-3Z",
  bolt: "M13 3 5 14h6l-1 7 8-11h-6l1-7Z"
};

export default function Icon({ name, size = 20, stroke = 1.7, className }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={P[name] || P.spark} />
    </svg>
  );
}

/** Elige un icono para un servicio según su nombre. */
export function serviceIcon(name = "") {
  const n = name.toLowerCase();
  if (/barba|afeit|navaja|toalla/.test(n)) return "razor";
  if (/ceja|perfil|facial|mascar/.test(n)) return "beard";
  if (/peina|lavad|tinte|color/.test(n)) return "comb";
  return "scissors";
}
