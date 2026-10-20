import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships a WASM build; postgres.js must not be bundled by webpack/turbopack.
  serverExternalPackages: ["@electric-sql/pglite", "postgres"],
  eslint: {
    // Lint is run explicitly via `npm run lint` / `npm run qa`.
    ignoreDuringBuilds: false,
  },
  experimental: {
    // Keeps HTML payloads small for the deal grids.
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
