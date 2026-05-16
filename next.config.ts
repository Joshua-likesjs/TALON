import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: true, // fix #24: re-enable to catch side-effect bugs
  experimental: {
    staleTimes: {
      dynamic: 30, // fix #23: was 0 (disabled cache); 30s is a sane default
    },
  },
};

export default nextConfig;