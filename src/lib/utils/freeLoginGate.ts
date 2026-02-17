import { getEffectiveTier } from "@/lib/utils/subscription"

const FREE_LOGIN_GATE_MARKER_KEY = "makalah:free-login-gate:marker"

type AuthSessionLike = {
  user?: {
    id?: string
  }
  session?: Record<string, unknown>
} & Record<string, unknown>

type MarkerPayload = {
  fingerprint: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readPrimitive(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number" && Number.isFinite(value)) return String(value)
  return null
}

function getFingerprintSeed(session: AuthSessionLike): string {
  const candidates: string[] = []

  const topLevelKeys = [
    "id",
    "sessionId",
    "sessionToken",
    "token",
    "expiresAt",
    "createdAt",
    "updatedAt",
  ]

  for (const key of topLevelKeys) {
    const value = readPrimitive(session, key)
    if (value) candidates.push(value)
  }

  if (isRecord(session.session)) {
    for (const key of topLevelKeys) {
      const value = readPrimitive(session.session, key)
      if (value) candidates.push(value)
    }
  }

  return candidates[0] ?? "active"
}

export function getFreeLoginSessionFingerprint(session: unknown): string | null {
  if (!isRecord(session)) return null

  const authSession = session as AuthSessionLike
  const userId = authSession.user?.id
  if (!userId) return null

  return `${userId}:${getFingerprintSeed(authSession)}`
}

function readMarkerPayload(): MarkerPayload | null {
  if (typeof window === "undefined") return null
  const raw = window.sessionStorage.getItem(FREE_LOGIN_GATE_MARKER_KEY)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as MarkerPayload
    if (typeof parsed.fingerprint !== "string" || parsed.fingerprint.length === 0) {
      return null
    }
    return parsed
  } catch {
    return null
  }
}

export function hasSeenFreeLoginGateForSession(session: unknown): boolean {
  const fingerprint = getFreeLoginSessionFingerprint(session)
  if (!fingerprint) return false

  const marker = readMarkerPayload()
  return marker?.fingerprint === fingerprint
}

export function markFreeLoginGateSeenForSession(session: unknown): void {
  if (typeof window === "undefined") return
  const fingerprint = getFreeLoginSessionFingerprint(session)
  if (!fingerprint) return

  const payload: MarkerPayload = { fingerprint }
  window.sessionStorage.setItem(FREE_LOGIN_GATE_MARKER_KEY, JSON.stringify(payload))
}

export function clearFreeLoginGateSessionMarker(): void {
  if (typeof window === "undefined") return
  window.sessionStorage.removeItem(FREE_LOGIN_GATE_MARKER_KEY)
}

export function isFreeTierForLoginGate(role?: string, subscriptionStatus?: string): boolean {
  return getEffectiveTier(role, subscriptionStatus) === "gratis"
}
