import type { NextConfig } from "next";
import path from "node:path";

const x402Stub = path.join(__dirname, "src/lib/wallet/x402-stub.js");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["better-sqlite3"],
  // Baked at Amplify build time so Lambda never loads native sqlite
  env: {
    GATEX_BUILT_ON_AMPLIFY:
      process.env.AWS_APP_ID || process.env.AWS_BRANCH ? "1" : "",
  },
  turbopack: {
    root: path.join(__dirname),
    resolveAlias: {
      "@x402/core/client": x402Stub,
      "@x402/svm/exact/client": x402Stub,
    },
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@x402/core/client": x402Stub,
      "@x402/svm/exact/client": x402Stub,
    };
    return config;
  },
};

export default nextConfig;
