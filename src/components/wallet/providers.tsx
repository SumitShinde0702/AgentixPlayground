"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http, injected } from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";

/**
 * Wagmi-only providers — no RainbowKit / @wagmi/connectors barrel.
 * That barrel eagerly loads Base Account → CDP → missing @x402/core/client.
 */
export const wagmiConfig = createConfig({
  chains: [avalanche, avalancheFuji],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [avalanche.id]: http("https://api.avax.network/ext/bc/C/rpc"),
    [avalancheFuji.id]: http("https://api.avax-test.network/ext/bc/C/rpc"),
  },
  ssr: true,
});

export function WalletProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
