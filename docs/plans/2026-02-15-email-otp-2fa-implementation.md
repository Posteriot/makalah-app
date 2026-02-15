# Email OTP 2FA Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add optional Email OTP two-factor authentication to Makalah App using BetterAuth's `twoFactor` plugin with Convex adapter.

**Architecture:** BetterAuth `twoFactor` plugin handles all 2FA logic (OTP generation, validation, rate limiting, trusted devices, backup codes). Email delivery via Resend (existing infra). Cross-domain auth preserved via existing `SessionCookieSync` pattern.

**Tech Stack:** BetterAuth twoFactor plugin, Convex adapter (`@convex-dev/better-auth`), Resend API, Next.js App Router, React 19

**Design Doc:** `docs/plans/2026-02-15-email-otp-2fa-design.md`

---

## Task 0: Cross-Domain Cookie Smoke Test (GATE)

> This task is a **hard gate**. If steps 3-4 fail, STOP and reassess before continuing to Task 1+.

**Files:**
- Modify: `convex/auth.ts` (temporary test config)
- Modify: `convex/authEmails.ts` (temporary test function)
- Modify: `src/lib/auth-client.ts` (temporary test plugin)

**Purpose:** Verify that BetterAuth `twoFactor` plugin works with Convex adapter + cross-domain auth before investing in UI work.

**Step 1: Add twoFactor plugin to server config**

In `convex/auth.ts`, add the import and plugin:

```typescript
// Add import at top
import { twoFactor } from "better-auth/plugins";

// In createAuthOptions plugins array, add:
twoFactor({
  otpOptions: {
    sendOTP: async ({ user, otp }) => {
      console.log(`[2FA TEST] OTP for ${user.email}: ${otp}`);
      // Temporarily just log — don't send email yet
    },
  },
}),
```

**Step 2: Add twoFactorClient to client config**

In `src/lib/auth-client.ts`:

```typescript
// Add import
import { twoFactorClient } from "better-auth/client/plugins";

// Add to plugins array
twoFactorClient()
```

**Step 3: Verify Convex syncs schema**

Run: `npm run convex:dev`

Expected: Convex should sync without errors. Check dashboard for new `twoFactor` table (or fields on BetterAuth's internal tables).

If schema error → STOP. Check `@convex-dev/better-auth` version compatibility.

**Step 4: Test enable 2FA for a test user**

In browser console (while logged in as test user with email/password account):

```javascript
// Import from auth-client
const { authClient } = await import('/src/lib/auth-client');

// Enable 2FA (requires password)
const result = await authClient.twoFactor.enable({ password: 'testpassword123' });
console.log('Enable result:', result);
```

Expected: Success response + `[2FA TEST] OTP for ...` in Convex logs.

**Step 5: Test login flow with 2FA enabled**

1. Sign out
2. Sign in with email/password
3. Check response — should contain `twoFactorRedirect: true`
4. Check localStorage `better-auth_cookie` — does it contain 2FA temporary cookie?
5. Try `authClient.twoFactor.verifyOtp({ code: '<otp from console log>' })`

Expected: Verify whether cross-domain cookie sync works for 2FA.

**Step 6: Document findings**

If all passes → continue to Task 1.
If cookie sync fails → document the failure mode and create a fallback strategy before continuing.

**Step 7: Revert temporary console.log**

Remove the `console.log` from `sendOTP` callback (will be replaced by real email in Task 1).

**Step 8: Commit**

```bash
git add convex/auth.ts src/lib/auth-client.ts
git commit -m "feat(2fa): add twoFactor plugin to BetterAuth config"
```

---

## Task 1: Email Delivery for 2FA OTP

**Files:**
- Modify: `convex/authEmails.ts` — add `sendTwoFactorOTPEmail()`
- Modify: `convex/auth.ts` — wire `sendOTP` callback to real email function

**Step 1: Add OTP email function to authEmails.ts**

Add at the bottom of `convex/authEmails.ts`:

```typescript
export async function sendTwoFactorOTPEmail(email: string, otp: string): Promise<void> {
  await sendViaResend(
    email,
    "Kode Verifikasi — Makalah AI",
    [
      '<div style="font-family: monospace; max-width: 400px; margin: 0 auto; padding: 24px;">',
      '<h2 style="font-size: 16px; margin-bottom: 16px;">Kode Verifikasi</h2>',
      '<div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 16px; background: #f1f5f9; border-radius: 8px; margin-bottom: 16px;">',
      otp,
      "</div>",
      '<p style="font-size: 12px; color: #64748b; margin-bottom: 8px;">Kode ini berlaku selama 3 menit.</p>',
      '<p style="font-size: 12px; color: #ef4444;">Jangan bagikan kode ini ke siapapun.</p>',
      "</div>",
    ].join("")
  );
}
```

**Step 2: Wire sendOTP in convex/auth.ts**

Replace the temporary `console.log` in `sendOTP` callback:

```typescript
// Add import at top of convex/auth.ts
import { sendTwoFactorOTPEmail } from "./authEmails";

// In twoFactor plugin config, update sendOTP:
twoFactor({
  otpOptions: {
    sendOTP: async ({ user, otp }) => {
      await sendTwoFactorOTPEmail(user.email, otp);
    },
  },
}),
```

**Step 3: Test email delivery**

1. Enable 2FA for test user (if not already)
2. Sign out, sign in → OTP should be sent via email
3. Verify email arrives with correct format

**Step 4: Commit**

```bash
git add convex/authEmails.ts convex/auth.ts
git commit -m "feat(2fa): add OTP email delivery via Resend"
```

---

## Task 2: Handle twoFactorRedirect in Sign-In Page

**Files:**
- Modify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — detect `twoFactorRedirect` response
- Modify: `src/proxy.ts` — add `/verify-2fa` to public routes

**Step 1: Add /verify-2fa to public routes**

In `src/proxy.ts`, add to `PUBLIC_ROUTES` array:

```typescript
const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-2fa",   // <-- add this
  "/api",
  // ... rest unchanged
]
```

This is needed because the user is in a partial auth state (credentials valid, 2FA pending) when accessing `/verify-2fa`.

**Step 2: Modify handleEmailSignIn in sign-in page**

In `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`, modify the `handleEmailSignIn` function. Inside the `else if (result.data)` block, add `twoFactorRedirect` check **before** the existing OTT check:

```typescript
} else if (result.data) {
  const data = result.data as Record<string, unknown>

  // 2FA required — redirect to verification page
  if (data.twoFactorRedirect) {
    router.push("/verify-2fa")
    return
  }

  // Existing OTT cross-domain flow (unchanged)
  if (data.redirect && data.token) {
    const url = new URL(data.url as string)
    url.searchParams.set("ott", data.token as string)
    window.location.href = url.toString()
    return
  }
  // Non cross-domain fallback
  window.location.href = callbackURL
  return
}
```

**Step 3: Test the redirect**

1. With 2FA enabled test user, sign in
2. Should redirect to `/verify-2fa` (page won't exist yet — just verify the redirect happens, 404 is fine)
3. With 2FA disabled user, sign in → normal flow unchanged

**Step 4: Commit**

```bash
git add src/app/(auth)/sign-in/[[...sign-in]]/page.tsx src/proxy.ts
git commit -m "feat(2fa): handle twoFactorRedirect in sign-in flow"
```

---

## Task 3: Verify 2FA Page

**Files:**
- Create: `src/app/(auth)/verify-2fa/page.tsx`

**Reference files:**
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — for UI patterns, AuthWideCard usage, button styles
- `src/components/auth/AuthWideCard.tsx` — for props interface

**Step 1: Create the verify-2fa page**

Create `src/app/(auth)/verify-2fa/page.tsx` with the following structure:

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { RefreshDouble, Lock, KeyAlt } from "iconoir-react"
import { authClient } from "@/lib/auth-client"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { getRedirectUrl } from "@/lib/utils/redirectAfterAuth"

type VerifyMode = "otp" | "backup-code"

export default function VerifyTwoFactorPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackURL = getRedirectUrl(searchParams, "/get-started")

  const [mode, setMode] = useState<VerifyMode>("otp")
  const [code, setCode] = useState("")
  const [trustDevice, setTrustDevice] = useState(true)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [resendCooldown, setResendCooldown] = useState(0)

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const handleVerifyOtp = useCallback(async () => {
    if (!code.trim()) {
      setError("Masukkan kode verifikasi.")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.verifyOtp({
        code: code.trim(),
        trustDevice,
      })
      if (result.error) {
        setError(result.error.message ?? "Kode tidak valid.")
        return
      }
      // Success — handle cross-domain OTT if present, else redirect
      const data = result.data as Record<string, unknown> | undefined
      if (data?.redirect && data?.token) {
        const url = new URL(data.url as string)
        url.searchParams.set("ott", data.token as string)
        window.location.href = url.toString()
        return
      }
      window.location.href = callbackURL
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }, [code, trustDevice, callbackURL])

  const handleVerifyBackupCode = useCallback(async () => {
    if (!code.trim()) {
      setError("Masukkan kode darurat.")
      return
    }
    setIsLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.verifyBackupCode({
        code: code.trim(),
      })
      if (result.error) {
        setError(result.error.message ?? "Kode darurat tidak valid.")
        return
      }
      const data = result.data as Record<string, unknown> | undefined
      if (data?.redirect && data?.token) {
        const url = new URL(data.url as string)
        url.searchParams.set("ott", data.token as string)
        window.location.href = url.toString()
        return
      }
      window.location.href = callbackURL
    } catch {
      toast.error("Terjadi kesalahan. Silakan coba lagi.")
    } finally {
      setIsLoading(false)
    }
  }, [code, callbackURL])

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return
    try {
      await authClient.twoFactor.sendOtp()
      toast.success("Kode baru sudah dikirim ke email kamu.")
      setResendCooldown(60)
    } catch {
      toast.error("Gagal mengirim kode. Coba lagi.")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (mode === "otp") {
      handleVerifyOtp()
    } else {
      handleVerifyBackupCode()
    }
  }

  const switchMode = (newMode: VerifyMode) => {
    setMode(newMode)
    setCode("")
    setError("")
  }

  const isOtpMode = mode === "otp"
  const title = "Verifikasi Dua Faktor"
  const subtitle = isOtpMode
    ? "Kode 6 digit sudah dikirim ke email kamu"
    : "Masukkan salah satu kode darurat kamu"

  return (
    <AuthWideCard title={title} subtitle={subtitle} showBackButton onBackClick={() => router.push("/sign-in")}>
      <div className="w-full space-y-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="2fa-code" className="sr-only">
              {isOtpMode ? "Kode verifikasi" : "Kode darurat"}
            </label>
            <input
              id="2fa-code"
              type="text"
              inputMode={isOtpMode ? "numeric" : "text"}
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => { setCode(e.target.value); if (error) setError("") }}
              placeholder={isOtpMode ? "000000" : "xxxx-xxxx"}
              autoFocus
              maxLength={isOtpMode ? 6 : 20}
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 text-center tracking-[0.3em] placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
            />
          </div>

          {isOtpMode && (
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-[18px] shrink-0 accent-slate-200"
                id="trust-device"
                checked={trustDevice}
                onChange={(e) => setTrustDevice(e.target.checked)}
              />
              <label
                className="text-interface text-xs text-muted-foreground"
                htmlFor="trust-device"
              >
                Percayai perangkat ini selama 30 hari
              </label>
            </div>
          )}

          {error && (
            <div className="rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="group relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-action h-10 px-4 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span
              className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0"
              aria-hidden="true"
            />
            <span className="relative z-10 inline-flex items-center gap-2">
              {isLoading ? <RefreshDouble className="h-4 w-4 animate-spin" /> : isOtpMode ? <Lock className="h-4 w-4" /> : <KeyAlt className="h-4 w-4" />}
              VERIFIKASI
            </span>
          </button>
        </form>

        {/* Action links */}
        <div className="flex flex-col items-center gap-2">
          {isOtpMode ? (
            <>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendCooldown > 0}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Kirim ulang kode (${resendCooldown}s)` : "Kirim ulang kode"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("backup-code")}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Gunakan kode darurat
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => switchMode("otp")}
              className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              Kembali ke kode email
            </button>
          )}
        </div>
      </div>
    </AuthWideCard>
  )
}
```

**Key implementation notes:**
- Uses same `AuthWideCard`, button styles, input styles, error box styles as sign-in page
- After `verifyOtp()` success, checks for cross-domain OTT response (same pattern as sign-in page line 206-213)
- `inputMode="numeric"` for OTP mode (mobile keyboard shows numbers)
- `autoComplete="one-time-code"` for browser autofill from SMS/email apps
- `tracking-[0.3em]` for spaced-out code display

**Step 2: Test the page**

1. Navigate to `/verify-2fa` directly — should render without errors
2. Full flow: sign in with 2FA-enabled user → redirected to `/verify-2fa` → enter OTP → verify

**Step 3: Commit**

```bash
git add src/app/(auth)/verify-2fa/page.tsx
git commit -m "feat(2fa): add OTP verification page"
```

---

## Task 4: TwoFactor Section in Security Tab

**Files:**
- Create: `src/components/settings/TwoFactorSection.tsx`
- Modify: `src/components/settings/SecurityTab.tsx` — import and render TwoFactorSection

**Reference:** `src/components/settings/SecurityTab.tsx` for exact card structure, button styles, and section patterns.

**Step 1: Create TwoFactorSection component**

Create `src/components/settings/TwoFactorSection.tsx`:

```typescript
"use client"

import { useState, useCallback } from "react"
import { authClient } from "@/lib/auth-client"
import { toast } from "sonner"
import { ShieldCheck, Copy, RefreshDouble } from "iconoir-react"

type TwoFactorState =
  | "idle"           // Initial — loading 2FA status
  | "disabled"       // 2FA off
  | "enable-password" // Asking for password to enable
  | "enable-verify"  // Verifying OTP after enable
  | "show-backup"    // Showing backup codes after successful enable
  | "enabled"        // 2FA on
  | "view-backup-password" // Asking password to view backup codes
  | "view-backup"    // Viewing backup codes
  | "disable-password" // Asking password to disable
  | "disable-confirm" // Confirmation before disable

interface TwoFactorSectionProps {
  hasPassword: boolean
}

export function TwoFactorSection({ hasPassword }: TwoFactorSectionProps) {
  const [state, setState] = useState<TwoFactorState>("idle")
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [password, setPassword] = useState("")
  const [otpCode, setOtpCode] = useState("")
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasConfirmedBackup, setHasConfirmedBackup] = useState(false)

  // Check 2FA status on mount
  // Use authClient to check if user has 2FA enabled
  // This will need to query BetterAuth's user record for twoFactorEnabled field
  // Implementation depends on what BetterAuth exposes — may need useSession().user.twoFactorEnabled

  // NOTE: The exact method to check 2FA status needs verification during Task 0.
  // Likely via session data or a dedicated API call.

  const handleEnable = useCallback(async () => {
    if (!password) { setError("Password wajib diisi."); return }
    setIsLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.enable({ password })
      if (result.error) {
        setError(result.error.message ?? "Gagal mengaktifkan 2FA.")
        return
      }
      // After enable, need to verify OTP to confirm
      setState("enable-verify")
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setIsLoading(false)
    }
  }, [password])

  const handleVerifyEnable = useCallback(async () => {
    if (!otpCode.trim()) { setError("Masukkan kode verifikasi."); return }
    setIsLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.verifyOtp({ code: otpCode.trim() })
      if (result.error) {
        setError(result.error.message ?? "Kode tidak valid.")
        return
      }
      // Generate backup codes
      const backupResult = await authClient.twoFactor.generateBackupCodes()
      if (backupResult.data?.backupCodes) {
        setBackupCodes(backupResult.data.backupCodes)
      }
      setIs2FAEnabled(true)
      setState("show-backup")
      toast.success("2FA berhasil diaktifkan!")
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setIsLoading(false)
    }
  }, [otpCode])

  const handleDisable = useCallback(async () => {
    if (!password) { setError("Password wajib diisi."); return }
    setIsLoading(true)
    setError("")
    try {
      const result = await authClient.twoFactor.disable({ password })
      if (result.error) {
        setError(result.error.message ?? "Gagal menonaktifkan 2FA.")
        return
      }
      setIs2FAEnabled(false)
      setState("disabled")
      setPassword("")
      toast.success("2FA berhasil dinonaktifkan.")
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setIsLoading(false)
    }
  }, [password])

  const handleViewBackupCodes = useCallback(async () => {
    if (!password) { setError("Password wajib diisi."); return }
    setIsLoading(true)
    setError("")
    try {
      // Generate fresh backup codes (invalidates old ones)
      const result = await authClient.twoFactor.generateBackupCodes({ password })
      if (result.data?.backupCodes) {
        setBackupCodes(result.data.backupCodes)
        setState("view-backup")
      }
    } catch {
      toast.error("Terjadi kesalahan.")
    } finally {
      setIsLoading(false)
    }
  }, [password])

  const copyBackupCodes = () => {
    navigator.clipboard.writeText(backupCodes.join("\n"))
    toast.success("Kode darurat disalin.")
  }

  const resetToIdle = () => {
    setPassword("")
    setOtpCode("")
    setError("")
    setHasConfirmedBackup(false)
    setState(is2FAEnabled ? "enabled" : "disabled")
  }

  // --- Render ---

  // Don't show 2FA section for OAuth-only users (no password)
  if (!hasPassword) {
    return (
      <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
        <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">
          Autentikasi Dua Faktor
        </div>
        <div className="p-4 bg-slate-50 dark:bg-slate-800">
          <p className="text-interface text-xs text-muted-foreground">
            Buat password terlebih dahulu untuk mengaktifkan 2FA.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-4 overflow-hidden rounded-lg border border-slate-300 bg-slate-200 dark:border-slate-600 dark:bg-slate-900">
      <div className="border-b border-slate-300 dark:border-slate-600 px-4 py-3 text-narrative text-md font-medium">
        Autentikasi Dua Faktor
      </div>
      <div className="p-4 bg-slate-50 dark:bg-slate-800">

        {/* STATE: disabled — show enable button */}
        {state === "disabled" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[120px_1fr_auto] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
              <span className="text-interface text-xs text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 rounded-badge bg-slate-200 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground w-fit">
                Nonaktif
              </span>
              <button
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-2 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring"
                onClick={() => { setState("enable-password"); setPassword(""); setError("") }}
                type="button"
              >
                <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
                <span className="relative z-10 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Aktifkan 2FA
                </span>
              </button>
            </div>
            <p className="text-narrative text-xs text-muted-foreground">
              Lindungi akunmu dengan verifikasi tambahan via email setiap login.
            </p>
          </div>
        )}

        {/* STATE: enable-password — ask password */}
        {state === "enable-password" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Aktifkan 2FA</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Masukkan password untuk mengaktifkan autentikasi dua faktor.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError("") }}
              autoFocus
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
            />
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>Batal</button>
              <button
                type="button"
                onClick={handleEnable}
                disabled={isLoading}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
                <span className="relative z-10">{isLoading ? "Memproses..." : "Lanjutkan"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: enable-verify — verify OTP sent to email */}
        {state === "enable-verify" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Verifikasi Email</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Kode 6 digit sudah dikirim ke email kamu. Masukkan kode tersebut untuk mengaktifkan 2FA.
            </p>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              value={otpCode}
              onChange={(e) => { setOtpCode(e.target.value); if (error) setError("") }}
              maxLength={6}
              autoFocus
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 text-center tracking-[0.3em] placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
            />
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>Batal</button>
              <button
                type="button"
                onClick={handleVerifyEnable}
                disabled={isLoading}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
                <span className="relative z-10">{isLoading ? "Memverifikasi..." : "Verifikasi"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: show-backup — show backup codes after enable */}
        {state === "show-backup" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Kode Darurat</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Simpan kode ini di tempat aman. Setiap kode hanya bisa dipakai sekali.
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 dark:bg-slate-900 p-3 border border-border">
              {backupCodes.map((code) => (
                <span key={code} className="font-mono text-xs text-foreground text-center py-1">
                  {code}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={copyBackupCodes}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Salin semua
            </button>
            <div className="flex items-start gap-2.5">
              <input
                type="checkbox"
                className="mt-0.5 size-[18px] shrink-0 accent-slate-200"
                id="backup-confirm"
                checked={hasConfirmedBackup}
                onChange={(e) => setHasConfirmedBackup(e.target.checked)}
              />
              <label className="text-interface text-xs text-muted-foreground" htmlFor="backup-confirm">
                Saya sudah menyimpan kode darurat ini
              </label>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={resetToIdle}
                disabled={!hasConfirmedBackup}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
                <span className="relative z-10">Selesai</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: enabled — show status + actions */}
        {state === "enabled" && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-[120px_1fr] items-center gap-3 max-sm:grid-cols-1 max-sm:items-start">
              <span className="text-interface text-xs text-muted-foreground">Status</span>
              <span className="inline-flex items-center gap-1 rounded-badge bg-success/10 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-widest text-success w-fit">
                Aktif
              </span>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                type="button"
                onClick={() => { setState("view-backup-password"); setPassword(""); setError("") }}
                className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
              >
                Lihat kode darurat
              </button>
              <button
                type="button"
                onClick={() => { setState("disable-password"); setPassword(""); setError("") }}
                className="text-xs font-mono text-destructive/70 hover:text-destructive transition-colors"
              >
                Nonaktifkan 2FA
              </button>
            </div>
          </div>
        )}

        {/* STATE: view-backup-password — ask password to view codes */}
        {state === "view-backup-password" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Lihat Kode Darurat</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Masukkan password untuk melihat kode darurat. Kode lama akan di-invalidate dan kode baru akan di-generate.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError("") }}
              autoFocus
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
            />
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>Batal</button>
              <button
                type="button"
                onClick={handleViewBackupCodes}
                disabled={isLoading}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-slate-800 text-slate-100 hover:text-slate-800 hover:border-slate-600 dark:bg-slate-100 dark:text-slate-800 dark:hover:text-slate-100 dark:hover:border-slate-400 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="btn-stripes-pattern absolute inset-0 pointer-events-none translate-x-[101%] transition-transform duration-300 ease-out group-hover:translate-x-0" aria-hidden="true" />
                <span className="relative z-10">{isLoading ? "Memproses..." : "Lihat Kode"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: view-backup — showing codes */}
        {state === "view-backup" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Kode Darurat</p>
            <div className="grid grid-cols-2 gap-2 rounded-md bg-slate-100 dark:bg-slate-900 p-3 border border-border">
              {backupCodes.map((code) => (
                <span key={code} className="font-mono text-xs text-foreground text-center py-1">
                  {code}
                </span>
              ))}
            </div>
            <button
              type="button"
              onClick={copyBackupCodes}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
              Salin semua
            </button>
            <div className="flex justify-end">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors">Tutup</button>
            </div>
          </div>
        )}

        {/* STATE: disable-password — ask password to disable */}
        {state === "disable-password" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold">Nonaktifkan 2FA</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Masukkan password untuk menonaktifkan autentikasi dua faktor.
            </p>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); if (error) setError("") }}
              autoFocus
              className="h-10 w-full rounded-md border border-border bg-background dark:bg-slate-900 dark:border-slate-700 px-3 font-mono text-sm text-foreground dark:text-slate-100 placeholder:font-mono placeholder:text-muted-foreground dark:placeholder:text-slate-300 transition-colors focus:outline-none focus:ring-0 focus:border-border dark:focus:border-slate-600"
            />
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>Batal</button>
              <button
                type="button"
                onClick={() => setState("disable-confirm")}
                disabled={isLoading || !password}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-destructive text-slate-100 hover:bg-destructive/80 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="relative z-10">Nonaktifkan</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: disable-confirm — final confirmation */}
        {state === "disable-confirm" && (
          <div className="flex flex-col gap-4">
            <p className="text-interface text-sm font-semibold text-destructive">Konfirmasi</p>
            <p className="text-narrative text-xs text-muted-foreground">
              Yakin ingin menonaktifkan 2FA? Akunmu akan kurang terlindungi.
            </p>
            {error && <p className="text-xs font-mono text-destructive">{error}</p>}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={resetToIdle} className="text-xs font-mono text-muted-foreground hover:text-foreground transition-colors" disabled={isLoading}>Batal</button>
              <button
                type="button"
                onClick={handleDisable}
                disabled={isLoading}
                className="group relative overflow-hidden inline-flex items-center justify-center gap-2 rounded-action px-3 py-1 text-narrative text-xs font-medium border border-transparent bg-destructive text-slate-100 hover:bg-destructive/80 transition-colors focus-ring disabled:opacity-50"
              >
                <span className="relative z-10">{isLoading ? "Memproses..." : "Ya, Nonaktifkan"}</span>
              </button>
            </div>
          </div>
        )}

        {/* STATE: idle — loading */}
        {state === "idle" && (
          <p className="text-interface text-xs text-muted-foreground">Memuat...</p>
        )}

      </div>
    </div>
  )
}
```

**Step 2: Import TwoFactorSection in SecurityTab**

In `src/components/settings/SecurityTab.tsx`, add import and render after the "Akun Terhubung" section:

```typescript
// Add import at top
import { TwoFactorSection } from "@/components/settings/TwoFactorSection"

// In the JSX return, add after the Connected Accounts section (after line 392's closing </div>):
<TwoFactorSection hasPassword={hasPassword} />
```

**Step 3: Test the section**

1. Navigate to Settings → Security tab
2. 2FA section should appear below "Akun Terhubung"
3. For credential user: should show "Nonaktif" + "Aktifkan 2FA" button
4. For OAuth-only user: should show "Buat password terlebih dahulu"
5. Full enable flow: click Aktifkan → enter password → enter OTP → see backup codes → confirm
6. Full disable flow: click Nonaktifkan → enter password → confirm

**Step 4: Commit**

```bash
git add src/components/settings/TwoFactorSection.tsx src/components/settings/SecurityTab.tsx
git commit -m "feat(2fa): add 2FA management section to Security settings"
```

---

## Task 5: Initialize 2FA Status on Mount

**Files:**
- Modify: `src/components/settings/TwoFactorSection.tsx` — add status check on mount

**Purpose:** The TwoFactorSection needs to know whether 2FA is currently enabled when it first renders. This depends on what BetterAuth exposes.

**Step 1: Determine how to check 2FA status**

Check if `useSession()` includes `twoFactorEnabled` on the user object. If so:

```typescript
// In TwoFactorSection, receive session as prop or use useSession
import { useSession } from "@/lib/auth-client"

// Inside component:
const { data: session } = useSession()

useEffect(() => {
  if (!session) return
  // Check if twoFactorEnabled is on the session user
  const user = session.user as Record<string, unknown>
  const enabled = user.twoFactorEnabled === true
  setIs2FAEnabled(enabled)
  setState(enabled ? "enabled" : "disabled")
}, [session])
```

If `useSession()` doesn't include `twoFactorEnabled`, try:

```typescript
// Alternative: direct API call
useEffect(() => {
  async function check() {
    try {
      // BetterAuth may expose this via the session or a dedicated endpoint
      // This needs verification during Task 0
      const result = await authClient.twoFactor.getStatus?.()
      // or check session.user.twoFactorEnabled
    } catch {
      setState("disabled")
    }
  }
  check()
}, [])
```

**NOTE:** The exact API depends on BetterAuth's implementation. This step will be refined based on Task 0 findings.

**Step 2: Test**

1. With 2FA enabled user → should show "Aktif" badge
2. With 2FA disabled user → should show "Nonaktif" + enable button
3. After enable → state should persist after page refresh

**Step 3: Commit**

```bash
git add src/components/settings/TwoFactorSection.tsx
git commit -m "feat(2fa): add status detection on mount"
```

---

## Task 6: End-to-End Testing & Polish

**Files:** All modified files from Tasks 0-5

**Step 1: Full E2E flow test — Enable 2FA**

1. Login with email/password user
2. Go to Settings → Security
3. Click "Aktifkan 2FA"
4. Enter password → verify OTP from email → save backup codes
5. Verify 2FA status shows "Aktif"

**Step 2: Full E2E flow test — Login with 2FA**

1. Sign out
2. Sign in with email/password
3. Should redirect to `/verify-2fa`
4. Enter OTP from email
5. Check "Percayai perangkat ini" → verify
6. Should land in app
7. Sign out + sign in again → should NOT ask for OTP (trusted device)

**Step 3: Full E2E flow test — Backup codes**

1. Sign out, sign in (clear trusted device or use different browser)
2. On `/verify-2fa`, click "Gunakan kode darurat"
3. Enter a backup code
4. Should successfully login

**Step 4: Full E2E flow test — Disable 2FA**

1. Go to Settings → Security
2. Click "Nonaktifkan 2FA"
3. Enter password → confirm
4. Sign out, sign in → should go directly to app (no 2FA challenge)

**Step 5: Edge case tests**

- Wrong OTP code → error message
- Expired OTP → error + "Kirim ulang kode" works
- Google OAuth user → 2FA section shows "Buat password dulu"
- Magic link login with 2FA enabled → bypasses 2FA (expected)

**Step 6: Fix any issues found**

Address bugs, adjust UI, fix error messages as needed.

**Step 7: Final commit**

```bash
git add -A
git commit -m "feat(2fa): end-to-end testing and polish"
```

---

## Task Order & Dependencies

```
Task 0 (GATE) ─── Must pass before anything else
  │
  ├─► Task 1 (Email delivery)
  │     │
  │     └─► Task 2 (Sign-in redirect)
  │           │
  │           └─► Task 3 (Verify page)
  │
  └─► Task 4 (Settings UI) ─── Can start after Task 0
        │
        └─► Task 5 (Status init) ─── Needs Task 0 findings
              │
              └─► Task 6 (E2E testing) ─── Needs all above
```

Tasks 1-3 (login flow) and Task 4 (settings UI) can be done in parallel after Task 0 passes.
