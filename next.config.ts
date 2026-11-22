import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // PGlite ships WASM + data files; load it from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite"],
  // PGlite fallback applies ./drizzle migrations at runtime.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  turbopack: {
    // A stray package-lock.json in the home folder confuses root detection.
    root: process.cwd(),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
