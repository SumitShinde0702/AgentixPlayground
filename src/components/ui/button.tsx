import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center text-[13px] tracking-[0.14em] uppercase transition-transform duration-150 active:scale-[0.98] disabled:opacity-50",
  {
    variants: {
      variant: {
        solid:
          "bg-[var(--ink)] text-[var(--paper)] hover:bg-[var(--ink-soft)] px-6 py-3",
        ghost:
          "border border-[var(--ink)]/20 text-[var(--ink)] hover:border-[var(--ink)] px-6 py-3",
        pass: "bg-[var(--pass)] text-[var(--paper)] px-5 py-2",
        block: "bg-[var(--block)] text-[var(--paper)] px-5 py-2",
      },
    },
    defaultVariants: { variant: "solid" },
  },
);

export function Button({
  className,
  variant,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>) {
  return (
    <button className={cn(buttonVariants({ variant }), className)} {...props} />
  );
}
