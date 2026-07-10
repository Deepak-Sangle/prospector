import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The landing app lives inside the prospector repo, which has its own
  // lockfile. Pin the Turbopack root so Next stops guessing.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
