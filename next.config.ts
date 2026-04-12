import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  serverExternalPackages: [
    "pdf-parse",
    "mammoth",
    "xlsx-populate",
    "officeparser",
    // pdfkit ships AFM font metric files alongside its JS that are
    // loaded at runtime via fs.readFileSync. Bundling pdfkit through
    // Turbopack strips those data files from the function bundle and
    // `new PDFDocument()` crashes with `ENOENT … Helvetica.afm`.
    // Marking it as a server-external package keeps pdfkit loaded
    // straight from `node_modules` so the AFM files resolve.
    // Required by /api/naskah/export/pdf and the legacy /api/export/pdf.
    "pdfkit",
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

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Upload source maps for readable stack traces
  widenClientFileUpload: true,

  // Remove source maps from public bundle after upload
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },

  // Suppress source map upload logs in CI unless debugging
  silent: !process.env.CI,
});
