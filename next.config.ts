import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Upload de documento (PDF/JPG/PNG até 20 MB) passa pela server action.
      bodySizeLimit: "25mb",
    },
  },
};

export default nextConfig;
