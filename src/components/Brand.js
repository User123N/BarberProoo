import Link from "next/link";

export default function Brand() {
  return (
    <Link className="brand" href="/" aria-label="BarberPro, inicio">
      <svg className="brand-mark" viewBox="0 0 32 32" width="34" height="34" aria-hidden="true">
        <defs>
          <linearGradient id="bm" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6dfa9" />
            <stop offset="1" stopColor="#a67c3c" />
          </linearGradient>
        </defs>
        <rect x=".75" y=".75" width="30.5" height="30.5" rx="10" fill="#101114" stroke="url(#bm)" strokeWidth="1.5" />
        <path d="M11 6.5v19M11 7h5.8c3 0 4.7 1.7 4.7 4s-1.7 4-4.7 4H11m0 0h6.8c3 0 5 1.8 5 4.5s-2 4.5-5 4.5H11" fill="none" stroke="url(#bm)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="brand-word">Barber<b>Pro</b></span>
    </Link>
  );
}
