export default function Loading() {
  return (
    <main className="shell" style={{ padding: "60px 0" }} aria-busy="true" aria-live="polite">
      <div className="skeleton" style={{ height: 28, width: 220, marginBottom: 18 }} />
      <div className="skeleton" style={{ height: 120, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 120 }} />
    </main>
  );
}
