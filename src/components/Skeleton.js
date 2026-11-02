/** Esqueletos de carga reutilizables. */
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="sk-rows" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div className="skeleton sk-row" key={i} style={{ animationDelay: `${i * 80}ms` }} />
      ))}
    </div>
  );
}

export function SkeletonCards({ cards = 6 }) {
  return (
    <div className="card-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: cards }).map((_, i) => <div className="skeleton sk-card" key={i} />)}
    </div>
  );
}
