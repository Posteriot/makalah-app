import type { CanonicalCategory, TimeRangeFilter } from "./types"

export function normalizeCategory(raw: string, title: string, excerpt: string): CanonicalCategory {
  const source = `${raw} ${title} ${excerpt}`.toLowerCase()
  const clean = raw.trim().toLowerCase()

  if (clean === "update") return "Update"
  if (clean === "tutorial") return "Tutorial"
  if (clean === "opini") return "Opini"
  if (clean === "event") return "Event"

  if (clean === "produk" || clean === "dinamika") return "Update"
  if (clean === "penelitian" || clean === "perspektif") return "Opini"

  if (source.includes("tutorial") || source.includes("panduan") || source.includes("how-to")) return "Tutorial"
  if (source.includes("event") || source.includes("webinar") || source.includes("launch") || source.includes("rilis")) return "Event"
  if (source.includes("opini") || source.includes("perspektif") || source.includes("analisis")) return "Opini"

  return "Update"
}

export function isInTimeRange(publishedAt: number, range: TimeRangeFilter) {
  if (range === "all") return true

  const now = Date.now()
  if (range === "7d") return publishedAt >= now - 7 * 24 * 60 * 60 * 1000
  if (range === "30d") return publishedAt >= now - 30 * 24 * 60 * 60 * 1000
  if (range === "90d") return publishedAt >= now - 90 * 24 * 60 * 60 * 1000

  const startOfYear = new Date(new Date().getFullYear(), 0, 1).getTime()
  return publishedAt >= startOfYear
}

const PLACEHOLDER_PALETTE: Record<CanonicalCategory, { start: string; end: string; accent: string }> = {
  Update: { start: "#0f3b35", end: "#0a2622", accent: "#34d399" },
  Tutorial: { start: "#1f355e", end: "#121f39", accent: "#60a5fa" },
  Opini: { start: "#493410", end: "#2f2208", accent: "#f59e0b" },
  Event: { start: "#3e1947", end: "#220c28", accent: "#e879f9" },
}

function toCanonicalCategory(value: string): CanonicalCategory {
  const token = value.trim().toLowerCase()
  if (token === "tutorial") return "Tutorial"
  if (token === "opini") return "Opini"
  if (token === "event") return "Event"
  return "Update"
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function createPlaceholderImageDataUri({
  title,
  category,
  width,
  height,
}: {
  title: string
  category: string
  width: number
  height: number
}) {
  const canonical = toCanonicalCategory(category)
  const palette = PLACEHOLDER_PALETTE[canonical]
  const categoryLabel = canonical.toUpperCase().slice(0, 12)
  const titleLabel = title.trim().replace(/\s+/g, " ").slice(0, 32).toUpperCase()

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="${width}" y2="${height}" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette.start}" />
      <stop offset="1" stop-color="${palette.end}" />
    </linearGradient>
    <linearGradient id="line" x1="0" y1="0" x2="${width}" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="${palette.accent}" stop-opacity="0.55" />
      <stop offset="1" stop-color="#ffffff" stop-opacity="0.22" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <rect x="1" y="1" width="${width - 2}" height="${height - 2}" rx="18" stroke="#ffffff" stroke-opacity="0.22" />
  <path d="M0 ${Math.round(height * 0.28)} H${width}" stroke="url(#line)" stroke-opacity="0.65" />
  <path d="M0 ${Math.round(height * 0.72)} H${width}" stroke="url(#line)" stroke-opacity="0.4" />
  <circle cx="${Math.round(width * 0.85)}" cy="${Math.round(height * 0.22)}" r="${Math.max(8, Math.round(Math.min(width, height) * 0.08))}" fill="${palette.accent}" fill-opacity="0.18" />
  <text x="14" y="26" fill="${palette.accent}" font-size="11" font-family="ui-monospace, SFMono-Regular, Menlo, monospace" letter-spacing="2" font-weight="700">${escapeXml(categoryLabel)}</text>
  <text x="14" y="${height - 16}" fill="#ffffff" fill-opacity="0.88" font-size="12" font-family="ui-sans-serif, system-ui, sans-serif" font-weight="600">${escapeXml(titleLabel)}</text>
</svg>`

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
}
