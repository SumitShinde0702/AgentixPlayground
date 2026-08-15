import { LandingHero } from "@/components/landing-hero";
import { LandingPitch } from "@/components/landing-pitch";
import { LenisProvider } from "@/components/lenis-provider";
import { SiteNav } from "@/components/site-nav";

export default function HomePage() {
  return (
    <LenisProvider>
      <SiteNav dim />
      <main>
        <LandingHero />
        <LandingPitch />
      </main>
    </LenisProvider>
  );
}
