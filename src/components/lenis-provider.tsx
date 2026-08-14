"use client";

import { ReactLenis } from "lenis/react";
import type { ReactNode } from "react";

export function LenisProvider({ children }: { children: ReactNode }) {
  return (
    <ReactLenis root options={{ lerp: 0.09, duration: 1.15, autoRaf: true }}>
      {children}
    </ReactLenis>
  );
}
