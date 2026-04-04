import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Configuração para evitar problemas com chunks dinâmicos
  experimental: {
    // Força recarga quando há mudanças
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
