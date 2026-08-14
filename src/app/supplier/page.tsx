import { INJECTION, PRODUCT } from "@/lib/supplier/content";

export default function SupplierPage() {
  return (
    <main
      className="min-h-[100dvh] bg-[#f4f5f2] px-6 py-16 text-[#1b2420] md:px-16"
      data-sku={PRODUCT.sku}
      data-price={PRODUCT.price}
      data-merchant={PRODUCT.merchant}
    >
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
    </main>
  );
}
