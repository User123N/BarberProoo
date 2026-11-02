import Link from "next/link";

export default function Brand() {
  return (
    <Link className="brand" href="/">
      <span className="brand-mark">B</span>
      <span>BARBER<span style={{color:"var(--gold-light)"}}>PRO</span></span>
    </Link>
  );
}
