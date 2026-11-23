import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // PGlite ships WASM + data files; ffmpeg-static ships a native binary.
  // Both load from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "ffmpeg-static"],
  outputFileTracingIncludes: {
    // PGlite fallback applies ./drizzle migrations at runtime.
    "/**": ["./drizzle/**/*"],
    // The binary ffmpeg-static downloads at install (linux-x64 on Vercel).
    "/api/creatives": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
  async redirects() {
    return [
      { source: "/portal", destination: "/admin", permanent: false },
      { source: "/portal/login", destination: "/entrar", permanent: false },
    ];
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
