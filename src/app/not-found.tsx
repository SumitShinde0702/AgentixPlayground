import { SiteNav } from "@/components/site-nav";
import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="px-6 pt-32 md:px-10">
        <p className="display text-[3rem]">Not found</p>
        <Link href="/" className="mt-8 inline-block text-[13px] uppercase tracking-[0.14em]">
          Home
        </Link>
      </main>
    </>
  );
}
