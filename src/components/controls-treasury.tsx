"use client";

import { useState } from "react";
import { formatUnits } from "viem";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
} from "wagmi";
import { avalanche, avalancheFuji } from "wagmi/chains";
import {
  XSGD_FUJI,
  XSGD_MAINNET,
  erc20BalanceOfAbi,
} from "@/lib/avalanche/tokens";

function fmtToken(raw: bigint | undefined, decimals: number) {
  if (raw === undefined) return "—";
  const n = Number(formatUnits(raw, decimals));
  return n.toLocaleString("en-SG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function ConnectTreasuryButton() {
  const { isConnected, address, chain } = useAccount();
  const { connect, connectors, isPending, error } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, isPending: switching } = useSwitchChain();
  const [err, setErr] = useState<string | null>(null);

  if (isConnected && address) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={switching || chain?.id === avalanche.id}
          onClick={() => switchChain({ chainId: avalanche.id })}
          className={`border px-3 py-2 text-[11px] uppercase tracking-[0.12em] ${
            chain?.id === avalanche.id
              ? "border-[var(--pass)] text-[var(--pass)]"
              : "border-[var(--line)] text-[var(--mute)]"
          }`}
        >
          Mainnet
        </button>
        <button
          type="button"
          disabled={switching || chain?.id === avalancheFuji.id}
          onClick={() => switchChain({ chainId: avalancheFuji.id })}
          className={`border px-3 py-2 text-[11px] uppercase tracking-[0.12em] ${
            chain?.id === avalancheFuji.id
              ? "border-[var(--pass)] text-[var(--pass)]"
              : "border-[var(--line)] text-[var(--mute)]"
          }`}
        >
          Fuji
        </button>
        <button
          type="button"
          onClick={() => disconnect()}
          className="border border-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em]"
        >
          {address.slice(0, 6)}…{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          setErr(null);
          const c = connectors[0];
          if (!c) {
            setErr("No injected wallet (install MetaMask / Core)");
            return;
          }
          connect(
            { connector: c },
            {
              onError: (e) => setErr(e.message),
            },
          );
        }}
        className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)] disabled:opacity-40"
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
      {err || error ? (
        <p className="max-w-[28ch] text-right text-[12px] text-[var(--block)]">
          {err || error?.message}
        </p>
      ) : null}
    </div>
  );
}

export function ControlsTreasury({
  onUseTreasury,
  treasuryAddress,
}: {
  onUseTreasury?: (address: string) => void;
  treasuryAddress?: string;
}) {
  const { address, isConnected, chain } = useAccount();

  const mainXsgd = useReadContract({
    address: XSGD_MAINNET.address,
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 43114,
    query: { enabled: Boolean(address) },
  });

  const fujiXsgd = useReadContract({
    address: XSGD_FUJI.address,
    abi: erc20BalanceOfAbi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 43113,
    query: { enabled: Boolean(address) },
  });

  const avax = useBalance({
    address,
    query: { enabled: Boolean(address) },
  });

  const sameAsPolicy =
    address &&
    treasuryAddress &&
    address.toLowerCase() === treasuryAddress.toLowerCase();

  return (
    <section className="border-t border-[var(--line)] pt-14">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--mute)]">
            Treasury
          </p>
          <h2 className="display mt-3 text-[clamp(1.8rem,3.5vw,2.6rem)]">
            Treasury
          </h2>
          <p className="mt-4 max-w-[36ch] text-[15px] leading-relaxed text-[var(--ink)]/70">
            Tops up agent spend. Mainnet · Fuji XSGD. Cards stay one-time.
          </p>
        </div>
        <ConnectTreasuryButton />
      </div>

      {isConnected && address ? (
        <div className="mt-10 grid gap-8 border-t border-[var(--line)] pt-8 md:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
              Mainnet XSGD
            </p>
            <p className="mono mt-2 text-[22px] tabular-nums">
              {fmtToken(mainXsgd.data as bigint | undefined, 6)}
            </p>
            <a
              className="mt-2 inline-block text-[12px] text-[var(--mute)] underline-offset-2 hover:underline"
              href={`https://snowtrace.io/token/${XSGD_MAINNET.address}?a=${address}`}
              target="_blank"
              rel="noreferrer"
            >
              Snowtrace
            </a>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
              Fuji XSGD
            </p>
            <p className="mono mt-2 text-[22px] tabular-nums">
              {fmtToken(fujiXsgd.data as bigint | undefined, 6)}
            </p>
            <a
              className="mt-2 inline-block text-[12px] text-[var(--mute)] underline-offset-2 hover:underline"
              href={`https://testnet.snowtrace.io/token/${XSGD_FUJI.address}?a=${address}`}
              target="_blank"
              rel="noreferrer"
            >
              Testnet Snowtrace
            </a>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[var(--mute)]">
              AVAX · {chain?.name ?? "—"}
            </p>
            <p className="mono mt-2 text-[22px] tabular-nums">
              {avax.data
                ? Number(avax.data.formatted).toLocaleString("en-SG", {
                    maximumFractionDigits: 4,
                  })
                : "—"}
            </p>
            <p className="mono mt-2 truncate text-[11px] text-[var(--mute)]">
              {address}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-8 text-[14px] text-[var(--mute)]">
          Connect MetaMask / Core to see mainnet and Fuji balances.
        </p>
      )}

      {isConnected && address && onUseTreasury ? (
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={() => onUseTreasury(address)}
            className="border border-[var(--ink)] bg-[var(--ink)] px-5 py-2.5 text-[12px] uppercase tracking-[0.14em] text-[var(--paper)] transition hover:opacity-90"
          >
            Use as treasury
          </button>
          {sameAsPolicy ? (
            <span className="text-[13px] text-[var(--pass)]">
              Linked to active policy
            </span>
          ) : treasuryAddress ? (
            <span className="mono text-[11px] text-[var(--mute)]">
              Policy treasury {treasuryAddress.slice(0, 10)}…
            </span>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
