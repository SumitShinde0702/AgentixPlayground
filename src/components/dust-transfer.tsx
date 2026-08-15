"use client";

import { useState } from "react";

type Ethereum = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
};

function getEthereum(): Ethereum | undefined {
  return (window as unknown as { ethereum?: Ethereum }).ethereum;
}

function padAddress(addr: string) {
  return addr.replace(/^0x/i, "").toLowerCase().padStart(64, "0");
}

function encodeTransfer(to: string, amountAtomic: bigint) {
  return `0xa9059cbb${padAddress(to)}${amountAtomic.toString(16).padStart(64, "0")}`;
}

export function DustTransferButton({
  agent,
  merchant,
  token,
  chainId,
  onSettled,
}: {
  agent: string | null;
  merchant: string | null;
  token: string;
  chainId: number;
  onSettled?: () => void;
}) {
  const [status, setStatus] = useState<string>("");
  const [busy, setBusy] = useState(false);

  if (!agent || !merchant || !token) {
    return (
      <p className="mono text-[12px] text-[var(--mute)]">
        Set AGENT_WALLET_ADDRESS and MERCHANT_WALLET_ADDRESS in .env.local
      </p>
    );
  }

  const send = async () => {
    setBusy(true);
    setStatus("");
    try {
      const eth = getEthereum();
      if (!eth) {
        setStatus("MetaMask not found");
        return;
      }
      const accounts = (await eth.request({
        method: "eth_requestAccounts",
      })) as string[];
      const from = accounts[0];
      if (!from || from.toLowerCase() !== agent.toLowerCase()) {
        setStatus(
          `Switch MetaMask to agent ${agent.slice(0, 10)}… (got ${from?.slice(0, 10) ?? "none"}…)`,
        );
        return;
      }
      const hexChain = `0x${chainId.toString(16)}`;
      try {
        await eth.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: hexChain }],
        });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: hexChain,
              chainName: chainId === 43113 ? "Avalanche Fuji" : "Avalanche C-Chain",
              nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
              rpcUrls: [
                chainId === 43113
                  ? "https://api.avax-test.network/ext/bc/C/rpc"
                  : "https://api.avax.network/ext/bc/C/rpc",
              ],
              blockExplorerUrls: [
                chainId === 43113
                  ? "https://testnet.snowtrace.io"
                  : "https://snowtrace.io",
              ],
            },
          ],
        });
      }

      const amountAtomic = BigInt(100_000); // 0.1 XSGD (6 decimals)
      const data = encodeTransfer(merchant, amountAtomic);
      const txHash = (await eth.request({
        method: "eth_sendTransaction",
        params: [
          {
            from,
            to: token,
            data,
            value: "0x0",
          },
        ],
      })) as string;

      setStatus(`Sent · ${txHash.slice(0, 18)}…`);
      const res = await fetch("/api/chain/settle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash, amountSgd: 0.1 }),
      });
      const body = (await res.json()) as { snowtrace?: string; error?: string };
      if (!res.ok) {
        setStatus(body.error ?? "Failed to record tx");
        return;
      }
      setStatus(`Recorded · ${body.snowtrace ?? txHash}`);
      if (body.snowtrace) {
        setStatus(`Recorded — open Snowtrace, then press 3 again`);
        window.open(body.snowtrace, "_blank", "noopener,noreferrer");
      }
      onSettled?.();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Transfer failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        disabled={busy}
        onClick={() => void send()}
        className="border border-[var(--ink)] px-4 py-2 text-[12px] uppercase tracking-[0.14em] text-[var(--ink)] disabled:opacity-50"
      >
        {busy ? "Confirm in MetaMask…" : "Send 0.1 XSGD to merchant"}
      </button>
      {status ? (
        <p className="mono mt-3 break-all text-[12px] text-[var(--mute)]">
          {status}
        </p>
      ) : null}
    </div>
  );
}
