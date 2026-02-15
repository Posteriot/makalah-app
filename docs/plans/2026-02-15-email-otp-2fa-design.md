# Email OTP 2FA Design

**Date:** 2026-02-15
**Status:** Approved
**Approach:** BetterAuth `twoFactor` plugin native with Email OTP only

## Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | 2FA policy | Optional — user enable/disable sendiri di Settings |
| 2 | Method | Email OTP only (no TOTP) |
| 3 | Trusted device | 30 hari |
| 4 | Backup codes | Ya, 10 kode |
| 5 | UI location | Section baru di Security tab |
| 6 | Approach | BetterAuth `twoFactor` plugin native |
| 7 | Magic link + 2FA | Magic link bypass 2FA (default BetterAuth behavior) |

## Architecture

### Plugin Config

```typescript
// convex/auth.ts — add twoFactor plugin
twoFactor({
  otpOptions: {
    sendOTP: async ({ user, otp }) => {
      await sendTwoFactorOTPEmail(user.email, otp)
    }
  },
  trustedDevices: true,
  backupCodeOptions: { length: 10 }
})

// src/lib/auth-client.ts — add client plugin
twoFactorClient()
```

### Schema

BetterAuth `twoFactor` plugin auto-creates its own table via Convex adapter:
- `twoFactor` table (secret, backupCodes, userId)
- `twoFactorEnabled` field on BetterAuth's internal `user` table

No manual changes to `convex/schema.ts` needed.

### Login Flow (with 2FA enabled)

```
User submit email + password
  ├─ Credentials invalid → Error (existing)
  ├─ Credentials valid, 2FA OFF → OTT flow (existing)
  └─ Credentials valid, 2FA ON
       ├─ Trusted device → Skip 2FA, OTT flow (existing)
       └─ Not trusted
            → Server return { twoFactorRedirect: true }
            → sign-in page redirect to /verify-2fa
            → Server auto-send OTP via Resend
            → User input 6-digit code
            ├─ Valid → Full session + trusted device → redirect to app
            └─ Invalid → Error + retry (max 3) → suggest backup code
```

## Files to Create/Modify

### New Files (2)

- `src/app/(auth)/verify-2fa/page.tsx` — OTP verification page (uses AuthWideCard)
- `src/components/settings/TwoFactorSection.tsx` — Enable/disable + backup codes UI

### Modified Files (4-5)

- `convex/auth.ts` — Add `twoFactor()` plugin + sendOTP callback
- `convex/authEmails.ts` — Add `sendTwoFactorOTPEmail()` function
- `src/lib/auth-client.ts` — Add `twoFactorClient()` plugin
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` — Handle `twoFactorRedirect`
- `src/components/(account)/settings/SecurityTab.tsx` — Import & render TwoFactorSection

## UI/UX Design

### Verify 2FA Page (`/verify-2fa`)

Layout: AuthWideCard (same as sign-in/sign-up).

State machine:
- `otp-input` (default) → `verifying` → success → redirect
- Invalid code → error + retry
- "Gunakan kode darurat" → `backup-code-input` mode

Elements:
- Title: "Verifikasi Dua Faktor"
- Subtitle: "Kode 6 digit sudah dikirim ke email kamu"
- 6-digit input (mono font, centered, auto-focus)
- Checkbox: "Percayai perangkat ini selama 30 hari"
- Button: "VERIFIKASI"
- Links: "Gunakan kode darurat", "Kirim ulang kode" (60s cooldown), "Kembali ke masuk"

### Security Tab — 2FA Section

**2FA OFF state:**
- Status badge: "Nonaktif"
- Description text + "AKTIFKAN 2FA" button
- Enable flow: password confirmation → enable() → OTP verify → show backup codes → "Sudah disimpan" confirm

**2FA ON state:**
- Status badge: "Aktif"
- "Lihat Kode Darurat" button (requires password)
- "Nonaktifkan 2FA" button (requires password + confirmation dialog)

### Backup Codes Display

10 codes in 2-column grid, mono font.
"SALIN SEMUA" button + "Saya sudah menyimpan kode ini" checkbox/confirm.

### Email Template

Subject: "Kode Verifikasi Makalah"
Body: Heading + large mono code [123456] + "Kode berlaku 3 menit" + "Jangan bagikan kode ini"

## Error Handling & Edge Cases

| Scenario | Handling |
|----------|----------|
| Email delivery fails | sendOTP throw → UI: "Gagal kirim kode. Coba lagi." |
| OTP expired (>3 min) | verifyOtp() error → UI: "Kode kedaluwarsa" + resend button |
| Brute force (>3 attempts) | BetterAuth rate limit → UI: "Terlalu banyak percobaan" + suggest backup code |
| Close tab after twoFactorRedirect | Session incomplete → must login again |
| Google OAuth user tries enable 2FA | enable() requires password → OAuth-only users can't enable. UI: hide section or show "Tambah password dulu" |
| All backup codes used | Warning at ≤2 remaining. "Generate kode baru" button (invalidates old codes) |
| Concurrent sessions | Enable/disable applies to all sessions |
| twoFactorEnabled flag caveat | May need OTP verify after enable() to set flag true. Must test. |

## Cross-Domain Risk

BetterAuth 2FA sets temporary cookie after credential validation. With cross-domain setup (Convex ≠ Next.js domain), this cookie must traverse:
`crossDomainClient` → localStorage → `SessionCookieSync` → `ba_session` cookie → server forwarding

`SessionCookieSync` forwards ALL cookies from localStorage (not just session), so 2FA cookie should sync. But must be verified during implementation.

### Critical Pre-Implementation Test

Before building UI:
1. Plugin twoFactor + Convex adapter → schema auto-created?
2. signIn.email() + 2FA enabled → twoFactorRedirect: true?
3. Cross-domain: 2FA temporary cookie synced via localStorage → ba_session?
4. verifyOtp() → success or INVALID_TWO_FACTOR_COOKIES?

If steps 3-4 fail, need fallback strategy before continuing.

## Out of Scope

- Admin force-enable/disable 2FA for other users
- SMS OTP
- TOTP (authenticator apps)
- 2FA for Google OAuth users
- Audit log for 2FA events
