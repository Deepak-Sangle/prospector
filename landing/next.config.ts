import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site — `next build` emits an `out/` dir that Cloudflare
  // Workers serves as static assets (see wrangler.jsonc). No SSR/API routes.
  output: "export",
  images: { unoptimized: true },
  // The landing app lives inside the prospector repo, which has its own
  // lockfile. Pin the Turbopack root so Next stops guessing.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
