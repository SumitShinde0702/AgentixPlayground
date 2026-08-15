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
        GateX
      </Link>
      <nav className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-[12px] uppercase tracking-[0.16em] md:gap-x-8">
        <Link href="/controls" className={link}>
          Controls
        </Link>
        <Link href="/skill" className={link}>
          Skill
        </Link>
        <Link href="/demo" className={link}>
          Demo
        </Link>
        <Link href="/receipts" className={link}>
          Receipts
        </Link>
        <Link href="/architecture" className={link}>
          Architecture
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
