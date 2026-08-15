import type { Metadata } from "next";
import type { ReactNode } from "react";
import { IBM_Plex_Mono, IBM_Plex_Sans, Syne } from "next/font/google";
import { WalletProviders } from "@/components/wallet/providers";
import "./globals.css";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

const ibm = IBM_Plex_Sans({
  variable: "--font-ibm",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const ibmMono = IBM_Plex_Mono({
  variable: "--font-ibm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "GateX",
  description: "Agents that buy, without being hijacked.",
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${syne.variable} ${ibm.variable} ${ibmMono.variable} h-full antialiased`}
    >
      <body className="ledger min-h-full bg-[var(--paper)] text-[var(--ink)]">
        <div className="grain" aria-hidden />
        <WalletProviders>{children}</WalletProviders>
      </body>
    </html>
  );
}
