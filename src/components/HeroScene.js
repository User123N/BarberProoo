"use client";
import { useEffect, useRef } from "react";

/**
 * Escena de herramientas en SVG con tres capas de profundidad.
 * El parallax sólo se activa con puntero fino y sin "reduce motion";
 * en móviles queda estática y sin JavaScript de movimiento.
 */
export default function HeroScene({ compact = false }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fine = window.matchMedia("(hover:hover) and (pointer:fine)");
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!fine.matches || calm.matches) return;
    let raf = 0;
    function onMove(e) {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width - 0.5) * 2;
        const y = ((e.clientY - r.top) / r.height - 0.5) * 2;
        el.style.setProperty("--px", x.toFixed(3));
        el.style.setProperty("--py", y.toFixed(3));
      });
    }
    function onLeave() {
      el.style.setProperty("--px", "0");
      el.style.setProperty("--py", "0");
    }
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div className={compact ? "scene scene-compact" : "scene"} ref={ref} aria-hidden="true">
      <div className="scene-glow" />
      <div className="scene-floor" />

      <div className="layer layer-back">
        <svg className="tool comb" viewBox="0 0 320 90" width="320" height="90">
          <defs>
            <linearGradient id="combG" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2c2d32" />
              <stop offset="1" stopColor="#0d0e11" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="316" height="34" rx="12" fill="url(#combG)" stroke="rgba(255,255,255,.14)" />
          {Array.from({ length: 28 }).map((_, i) => (
            <rect key={i} x={12 + i * 10.7} y="36" width="5" height={i % 2 ? 40 : 46} rx="2.5" fill="url(#combG)" stroke="rgba(255,255,255,.08)" />
          ))}
          <rect x="14" y="8" width="292" height="2" rx="1" fill="rgba(255,255,255,.22)" />
        </svg>
      </div>

      <div className="layer layer-mid">
        <svg className="tool scissors" viewBox="-190 -230 380 480" width="380" height="480">
          <defs>
            <linearGradient id="steel" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#3a3c42" />
              <stop offset=".35" stopColor="#d9d6cf" />
              <stop offset=".55" stopColor="#8d8a84" />
              <stop offset="1" stopColor="#1b1c20" />
            </linearGradient>
            <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f6dfa9" />
              <stop offset=".5" stopColor="#c99d56" />
              <stop offset="1" stopColor="#6b4f26" />
            </linearGradient>
            <filter id="drop" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="14" dy="22" stdDeviation="14" floodColor="#000" floodOpacity=".6" />
            </filter>
          </defs>
          <g filter="url(#drop)">
            <g className="blade blade-a">
              <path d="M-10 6 L-2 -205 L7 -212 L11 6 Z" fill="url(#steel)" />
              <path d="M-2 -205 L7 -212 L3 -40" fill="none" stroke="rgba(255,255,255,.5)" strokeWidth="1" />
              <rect x="-8" y="0" width="17" height="78" rx="7" fill="url(#steel)" />
              <ellipse cx="0" cy="124" rx="36" ry="46" fill="none" stroke="url(#gold)" strokeWidth="15" />
              <ellipse cx="-6" cy="116" rx="26" ry="36" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
            </g>
            <g className="blade blade-b">
              <path d="M-11 6 L-7 -212 L2 -205 L10 6 Z" fill="url(#steel)" />
              <path d="M-7 -212 L2 -205 L-3 -40" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="1" />
              <rect x="-9" y="0" width="17" height="78" rx="7" fill="url(#steel)" />
              <ellipse cx="0" cy="124" rx="36" ry="46" fill="none" stroke="url(#gold)" strokeWidth="15" />
              <ellipse cx="-6" cy="116" rx="26" ry="36" fill="none" stroke="rgba(255,255,255,.22)" strokeWidth="1.5" />
            </g>
            <circle cx="0" cy="4" r="11" fill="url(#gold)" stroke="rgba(0,0,0,.4)" />
            <circle cx="-3" cy="1" r="3" fill="rgba(255,255,255,.6)" />
          </g>
        </svg>
      </div>

      <div className="layer layer-front">
        <svg className="tool razor" viewBox="0 0 300 120" width="300" height="120">
          <defs>
            <linearGradient id="razorBlade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f1efe9" />
              <stop offset=".5" stopColor="#8f8c86" />
              <stop offset="1" stopColor="#2a2b2f" />
            </linearGradient>
            <linearGradient id="razorHandle" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#3b2f1f" />
              <stop offset=".5" stopColor="#15110b" />
              <stop offset="1" stopColor="#050403" />
            </linearGradient>
          </defs>
          <path d="M20 60 C70 18 150 14 214 40 L214 62 C150 48 70 54 20 60 Z" fill="url(#razorBlade)" />
          <path d="M26 59 C76 28 150 24 210 44" fill="none" stroke="rgba(255,255,255,.7)" />
          <rect x="206" y="42" width="84" height="26" rx="13" fill="url(#razorHandle)" stroke="rgba(223,185,111,.45)" />
          <circle cx="214" cy="52" r="6" fill="#c99d56" />
        </svg>
      </div>

      <div className="layer layer-deep">
        <svg className="tool bottle" viewBox="0 0 90 190" width="90" height="190">
          <defs>
            <linearGradient id="glass" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#0b0c0f" /><stop offset=".3" stopColor="#3a3d45" /><stop offset=".55" stopColor="#14151a" /><stop offset="1" stopColor="#050506" />
            </linearGradient>
            <linearGradient id="cap" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#6b4f26" /><stop offset=".4" stopColor="#f0d5a0" /><stop offset="1" stopColor="#7a5a2b" />
            </linearGradient>
          </defs>
          <rect x="30" y="4" width="30" height="34" rx="6" fill="url(#cap)" />
          <rect x="36" y="38" width="18" height="12" fill="#1a1b20" />
          <path d="M22 54 Q22 48 30 48 H60 Q68 48 68 54 V172 Q68 184 56 184 H34 Q22 184 22 172 Z" fill="url(#glass)" stroke="rgba(255,255,255,.16)" />
          <rect x="30" y="88" width="30" height="52" rx="5" fill="none" stroke="rgba(217,179,106,.7)" />
          <path d="M37 106h16M40 116h10" stroke="rgba(217,179,106,.8)" strokeLinecap="round" />
          <path d="M28 58v108" stroke="rgba(255,255,255,.22)" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div className="cube" />
        <svg className="tool pole" viewBox="0 0 44 170" width="44" height="170">
          <defs>
            <clipPath id="poleClip"><rect x="6" y="14" width="32" height="142" rx="14" /></clipPath>
            <linearGradient id="poleShade" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="rgba(0,0,0,.55)" /><stop offset=".3" stopColor="rgba(255,255,255,.28)" /><stop offset=".7" stopColor="rgba(0,0,0,.05)" /><stop offset="1" stopColor="rgba(0,0,0,.65)" />
            </linearGradient>
          </defs>
          <rect x="10" y="0" width="24" height="16" rx="6" fill="#c99d56" />
          <rect x="10" y="154" width="24" height="16" rx="6" fill="#c99d56" />
          <g clipPath="url(#poleClip)">
            <rect x="6" y="14" width="32" height="142" fill="#f4efe6" />
            <g className="pole-stripes">
              {Array.from({ length: 10 }).map((_, i) => <path key={i} d={`M-10 ${i * 30 - 10} L60 ${i * 30 - 50} L60 ${i * 30 - 30} L-10 ${i * 30 + 10} Z`} fill={i % 2 ? "#1a1b20" : "#b0873f"} />)}
            </g>
            <rect x="6" y="14" width="32" height="142" fill="url(#poleShade)" />
          </g>
        </svg>
      </div>

      <div className="scene-ring" />
      <div className="scene-ring ring-b" />
    </div>
  );
}
