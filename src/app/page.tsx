import { LandingHero } from "@/components/landing-hero";
import { LenisProvider } from "@/components/lenis-provider";
import { SiteNav } from "@/components/site-nav";
import Link from "next/link";

export default function HomePage() {
  return (
    <LenisProvider>
      <SiteNav dim />
      <main>
        <LandingHero />
        <section className="min-h-[100dvh] px-6 py-28 md:px-10">
          <p className="display max-w-[16ch] text-[clamp(2.4rem,6vw,5.4rem)] text-[var(--ink)]">
            Hidden text cannot spend.
          </p>
          <p className="mt-8 max-w-[38ch] text-[17px] leading-relaxed text-[var(--mute)]">
            A product page can tell an agent to buy gift cards. Signed identity
            and a frozen mandate keep that instruction out of the payment path.
          </p>
        </section>
        <section className="min-h-[70dvh] border-t border-[var(--line)] px-6 py-28 md:px-10">
          <p className="display max-w-[14ch] text-[clamp(2.4rem,6vw,5.4rem)]">
            Card. Protocol. Chain.
          </p>
          <p className="mt-8 max-w-[40ch] text-[17px] leading-relaxed text-[var(--mute)]">
            StraitsX issues a one-time XSGD card. x402 settles on Avalanche.
            The credential is revoked before the receipt is sealed.
          </p>
          <Link
            href="/demo"
            className="mt-12 inline-flex bg-[var(--ink)] px-6 py-3 text-[13px] uppercase tracking-[0.14em] text-[var(--paper)]"
          >
            Run the live demo
          </Link>
        </section>
      </main>
    </LenisProvider>
  );
}
