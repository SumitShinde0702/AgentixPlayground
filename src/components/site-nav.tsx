import Link from "next/link";

export function SiteNav({ dim = false }: { dim?: boolean }) {
  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between px-6 md:px-10 ${
        dim ? "bg-transparent" : "bg-[var(--paper)]/80 backdrop-blur-sm"
      }`}
    >
      <Link
        href="/"
        className="display text-[17px] text-[var(--ink)]"
      >
        Secure-Procure
      </Link>
      <nav className="flex items-center gap-8 text-[12px] uppercase tracking-[0.16em] text-[var(--ink)]/70">
        <Link href="/demo" className="hover:text-[var(--ink)]">
          Demo
        </Link>
        <Link href="/console" className="hover:text-[var(--ink)]">
          Console
        </Link>
      </nav>
    </header>
  );
}
