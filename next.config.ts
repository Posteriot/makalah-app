import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "qr.xendit.co",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
