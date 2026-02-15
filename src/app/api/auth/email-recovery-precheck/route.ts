import { NextRequest, NextResponse } from "next/server"
import { fetchMutation } from "convex/nextjs"
import type { FunctionReference } from "convex/server"
import { createHash } from "crypto"

type RecoveryIntent = "magic-link" | "forgot-password"

type PrecheckMutationArgs = {
  email: string
  emailHash: string
  ipHash: string
  keyHash: string
  intent: RecoveryIntent
  internalKey?: string
}

type PrecheckMutationResult =
  | {
      status: "registered"
      emailRegistered: true
    }
  | {
      status: "email_not_registered"
      emailRegistered: false
    }
  | {
      status: "rate_limited"
      retryAfterSeconds: number
    }

const precheckEmailRecoveryRef =
  "authRecovery:precheckEmailRecovery" as unknown as FunctionReference<
    "mutation",
    "public",
    PrecheckMutationArgs,
    PrecheckMutationResult
  >

const TURNSTILE_VERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify"
const TURNSTILE_TIMEOUT_MS = 5000
const JITTER_MIN_MS = 150
const JITTER_MAX_MS = 350

function randomJitterMs() {
  return Math.floor(Math.random() * (JITTER_MAX_MS - JITTER_MIN_MS + 1)) + JITTER_MIN_MS
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function respondWithJitter(payload: unknown, status = 200) {
  await sleep(randomJitterMs())
  return NextResponse.json(payload, { status })
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function hashString(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function isRecoveryIntent(value: unknown): value is RecoveryIntent {
  return value === "magic-link" || value === "forgot-password"
}

function getClientIp(req: NextRequest) {
  const forwardedFor = req.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]?.trim()
    if (firstIp) return firstIp
  }

  const realIp = req.headers.get("x-real-ip")
  if (realIp) return realIp

  const cloudflareIp = req.headers.get("cf-connecting-ip")
  if (cloudflareIp) return cloudflareIp

  return "0.0.0.0"
}

function isValidEmailFormat(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function verifyTurnstileToken(token: string, ip: string, secret: string) {
  const body = new URLSearchParams({
    secret,
    response: token,
  })

  if (ip) {
    body.set("remoteip", ip)
  }

  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
      signal: AbortSignal.timeout(TURNSTILE_TIMEOUT_MS),
    })

    if (!response.ok) {
      return false
    }

    const result = (await response.json()) as { success?: boolean }
    return result.success === true
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  const isPrecheckEnabled = process.env.AUTH_EMAIL_PRECHECK_ENABLED === "true"
  const turnstileSecretKey = process.env.TURNSTILE_SECRET_KEY

  if (!isPrecheckEnabled) {
    return respondWithJitter({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503)
  }

  if (!turnstileSecretKey) {
    return respondWithJitter({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503)
  }

  let body: {
    email?: unknown
    intent?: unknown
    captchaToken?: unknown
  }

  try {
    body = await req.json()
  } catch {
    return respondWithJitter(
      { ok: false, code: "INVALID_REQUEST" },
      400
    )
  }

  const emailInput = typeof body.email === "string" ? body.email : ""
  const captchaToken =
    typeof body.captchaToken === "string" ? body.captchaToken.trim() : ""
  const intentInput = body.intent

  const normalizedEmail = normalizeEmail(emailInput)

  if (!isRecoveryIntent(intentInput)) {
    return respondWithJitter(
      { ok: false, code: "INVALID_REQUEST" },
      400
    )
  }

  if (!normalizedEmail || !isValidEmailFormat(normalizedEmail)) {
    return respondWithJitter({ ok: false, code: "EMAIL_NOT_REGISTERED" })
  }

  if (!captchaToken) {
    return respondWithJitter({ ok: false, code: "CAPTCHA_FAILED" })
  }

  const clientIp = getClientIp(req)
  const isCaptchaValid = await verifyTurnstileToken(
    captchaToken,
    clientIp,
    turnstileSecretKey
  )

  if (!isCaptchaValid) {
    return respondWithJitter({ ok: false, code: "CAPTCHA_FAILED" })
  }

  const internalKey = process.env.CONVEX_INTERNAL_KEY
  if (!internalKey) {
    return respondWithJitter({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503)
  }

  const emailHash = hashString(normalizedEmail)
  const ipHash = hashString(clientIp)
  const keyHash = hashString(`${ipHash}|${emailHash}|${intentInput}`)

  try {
    const result = await fetchMutation(precheckEmailRecoveryRef, {
      email: normalizedEmail,
      emailHash,
      ipHash,
      keyHash,
      intent: intentInput,
      internalKey,
    })

    if (result.status === "rate_limited") {
      return respondWithJitter({
        ok: false,
        code: "RATE_LIMITED",
        retryAfterSeconds: result.retryAfterSeconds,
      })
    }

    if (result.status === "email_not_registered") {
      return respondWithJitter({ ok: false, code: "EMAIL_NOT_REGISTERED" })
    }

    return respondWithJitter({ ok: true, status: "registered" })
  } catch (error) {
    const message = error instanceof Error ? error.message : ""

    if (/unauthorized/i.test(message)) {
      console.error("[EmailRecoveryPrecheck] Unauthorized internal key")
      return respondWithJitter({ ok: false, code: "SERVICE_UNAVAILABLE" }, 503)
    }

    console.error("[EmailRecoveryPrecheck] Unexpected precheck error", error)
    return respondWithJitter({ ok: false, code: "CAPTCHA_FAILED" })
  }
}
