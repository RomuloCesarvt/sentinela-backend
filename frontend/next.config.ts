import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  // Desabilita otimização de imagens, pois o GH Pages (static export) não suporta o Image Optimization API do Next.js padrão.
  images: {
    unoptimized: true
  }
};

export default nextConfig;
