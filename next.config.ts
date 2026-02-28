import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "xlsx-populate",
    "officeparser",
  ],
  outputFileTracingIncludes: {
    "/api/extract-file": [
      "./node_modules/pdf-parse/**/*",
      "./node_modules/pdfjs-dist/legacy/build/**/*",
      "./node_modules/@napi-rs/canvas/**/*",
      "./node_modules/@napi-rs/canvas-*/*",
      "./node_modules/@napi-rs/canvas-*/**/*",
    ],
  },
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
