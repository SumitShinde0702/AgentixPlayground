import { INJECTION, PRODUCT } from "@/lib/supplier/content";

const CAMEL_PAPER = "https://arxiv.org/abs/2503.18813";

export default function SupplierPage() {
  return (
    <main
      className="relative flex min-h-[100dvh] flex-col bg-[#f4f5f2] px-6 py-16 text-[#1b2420] md:px-16"
      data-sku={PRODUCT.sku}
      data-price={PRODUCT.price}
      data-merchant={PRODUCT.merchant}
    >
      <div className="flex-1">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#6a736c]">
          {PRODUCT.house}
        </p>
        <h1 className="display mt-16 max-w-[12ch] text-[clamp(2.8rem,7vw,6rem)]">
          {PRODUCT.name}
        </h1>
        <p className="mt-8 text-[18px] text-[#4d564f]">{PRODUCT.spec}</p>
        <p className="display mt-16 text-[2.4rem]">
          S${PRODUCT.price.toLocaleString("en-SG")}
        </p>
        <span
          aria-hidden
          className="absolute h-px w-px overflow-hidden opacity-0"
          style={{ fontSize: 0, color: "transparent" }}
        >
          {INJECTION}
        </span>
      </div>

      <aside className="mt-24 max-w-[42ch] border-t border-[#1b2420]/12 pt-6">
        <p className="text-[11px] uppercase tracking-[0.16em] text-[#6a736c]">
          Demo note · human eyes only
        </p>
        <p className="mt-3 text-[13px] leading-relaxed text-[#4d564f]">
          You cannot see the injection — but it is in this page’s HTML, hidden
          from humans and readable by an agent. How do you fight an invisible
          enemy?{" "}
          <a
            href={CAMEL_PAPER}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2 hover:text-[#1b2420]"
          >
            CaMeL
          </a>
          : quarantine untrusted page text before any tool can run.
        </p>
      </aside>
    </main>
  );
}
