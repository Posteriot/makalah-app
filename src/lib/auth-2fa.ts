// Client-side helpers for the custom 2FA OTP flow (cross-domain workaround)

const PENDING_2FA_KEY = "pending_2fa"
const CONVEX_SITE_URL = process.env.NEXT_PUBLIC_CONVEX_SITE_URL!

interface Pending2FA {
  email: string
  password: string
}

export function setPending2FA(data: Pending2FA): void {
  sessionStorage.setItem(PENDING_2FA_KEY, JSON.stringify(data))
}

export function getPending2FA(): Pending2FA | null {
  const stored = sessionStorage.getItem(PENDING_2FA_KEY)
  if (!stored) return null
  try {
    return JSON.parse(stored) as Pending2FA
  } catch {
    return null
  }
}

export function clearPending2FA(): void {
  sessionStorage.removeItem(PENDING_2FA_KEY)
}

export function hasPending2FA(): boolean {
  return sessionStorage.getItem(PENDING_2FA_KEY) !== null
}

export async function sendOtp(
  email: string
): Promise<{ status: boolean; error?: string }> {
  try {
    const response = await fetch(`${CONVEX_SITE_URL}/api/auth/2fa/send-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    })

    const data = (await response.json()) as {
      status: boolean
      error?: string
    }
    return data
  } catch {
    return { status: false, error: "Gagal mengirim kode OTP." }
  }
}

export async function verifyOtp(
  email: string,
  code: string
): Promise<{ status: boolean; bypassToken?: string; error?: string }> {
  try {
    const response = await fetch(
      `${CONVEX_SITE_URL}/api/auth/2fa/verify-otp`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      }
    )

    const data = (await response.json()) as {
      status: boolean
      bypassToken?: string
      error?: string
    }
    return data
  } catch {
    return { status: false, error: "Gagal memverifikasi kode." }
  }
}
