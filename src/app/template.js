/** Transición suave al cambiar de ruta. */
export default function Template({ children }) {
  return <div className="page-enter">{children}</div>;
}
