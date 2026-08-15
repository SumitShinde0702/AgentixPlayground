import Link from "next/link";

export function SiteNav({ dim = false }: { dim?: boolean }) {
  const ink = dim ? "text-[var(--paper)]" : "text-[var(--ink)]";
  const link = dim
    ? "text-[var(--paper)]/70 hover:text-[var(--paper)]"
    : "text-[var(--ink)]/70 hover:text-[var(--ink)]";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-6 md:px-10 ${
        dim ? "bg-transparent" : "bg-[var(--paper)]/80 backdrop-blur-sm"
      }`}
    >
      <Link href="/" className={`display text-[17px] ${ink}`}>
        Secure-Procure
      </Link>
      <nav className="flex items-center gap-8 text-[12px] uppercase tracking-[0.16em]">
        <Link href="/demo" className={link}>
          Demo
        </Link>
        <Link href="/controls" className={link}>
          Controls
        </Link>
        <Link href="/console" className={link}>
          Console
        </Link>
        <Link href="/supplier" className={link}>
          Supplier
        </Link>
      </nav>
    </header>
  );
}
