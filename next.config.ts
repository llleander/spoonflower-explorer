import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "img.spoonflower.com",
      },
      {
        protocol: "https",
        hostname: "www.spoonflower.com",
      },
    ],
  },
};

export default nextConfig;