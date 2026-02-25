const siteUrl = process.env.SITE_URL!

const staticTrustedOrigins = [
  siteUrl,
  "https://makalah.ai",
  "https://www.makalah.ai",
  "https://dev.makalah.ai",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]

export function isLocalDevOrigin(origin: string): boolean {
  if (!origin) return false
  try {
    const url = new URL(origin)
    if (url.protocol !== "http:" && url.protocol !== "https:") return false
    return url.hostname === "localhost" || url.hostname === "127.0.0.1"
  } catch {
    return false
  }
}

export function getTrustedOrigins(request?: Request): string[] {
  const trustedOrigins = [...staticTrustedOrigins]
  const origin = request?.headers.get("origin") ?? ""
  if (isLocalDevOrigin(origin) && !trustedOrigins.includes(origin)) {
    trustedOrigins.push(origin)
  }
  return trustedOrigins
}

export function getAllowedCorsOrigin(request: Request): string {
  const origin = request.headers.get("origin") ?? ""
  const trustedOrigins = getTrustedOrigins(request)
  return trustedOrigins.includes(origin) ? origin : trustedOrigins[0]
}
