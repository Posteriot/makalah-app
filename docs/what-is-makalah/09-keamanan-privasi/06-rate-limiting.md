# 06 — Rate Limiting & Abuse Prevention

**Sumber kode**: `convex/authRecovery.ts`, `convex/twoFactorOtp.ts`

---

## Gambaran Umum

Makalah AI menerapkan dua sistem rate limiting yang independen, masing-masing dirancang untuk domain ancaman yang berbeda:

1. **Auth Recovery Rate Limiting** — melindungi endpoint magic link dan forgot-password dari brute force dan spam
2. **OTP Rate Limiting** — melindungi sistem 2FA dari exhaustion attack dan brute force kode

---

## Sistem 1: Auth Recovery Rate Limiting

**File**: `convex/authRecovery.ts`
**Endpoint yang dilindungi**: Magic link request, forgot password request

### Batasan (Faktual dari Kode)

```typescript
// convex/authRecovery.ts — baris 5–8
const WINDOW_MS = 10 * 60 * 1000        // Jendela 10 menit
const MAX_ATTEMPTS_PER_KEY = 5          // Maks 5 attempt per device+intent
const MAX_ATTEMPTS_PER_EMAIL = 10       // Maks 10 attempt per email
const MAX_ATTEMPTS_PER_IP = 30          // Maks 30 attempt per IP
```

Tiga dimensi yang dipantau **secara simultan** — request diblokir jika *salah satu* dari ketiganya melebihi batas:

| Dimensi | Limit | Jendela |
|---|---|---|
| Per key (device+intent) | 5 | 10 menit |
| Per email | 10 | 10 menit |
| Per IP | 30 | 10 menit |

**`keyHash`** merepresentasikan kombinasi unik dari: device fingerprint + intent (magic-link atau forgot-password). Ini lebih granular dari sekedar IP — seorang penyerang di belakang satu IP tapi dengan banyak email tetap bisa diblokir per-device.

### Cooldown Escalating

```typescript
// convex/authRecovery.ts — baris 10–13
const COOLDOWN_FIRST_MS = 5 * 60 * 1000    // 5 menit (pelanggaran ke-1)
const COOLDOWN_SECOND_MS = 15 * 60 * 1000  // 15 menit (pelanggaran ke-2)
const COOLDOWN_THIRD_MS = 60 * 60 * 1000   // 60 menit (pelanggaran ke-3+)
```

```typescript
// convex/authRecovery.ts — baris 19–23
function getCooldownDurationMs(violationCount: number) {
  if (violationCount <= 1) return COOLDOWN_FIRST_MS   // 5 menit
  if (violationCount === 2) return COOLDOWN_SECOND_MS  // 15 menit
  return COOLDOWN_THIRD_MS                             // 60 menit
}
```

Semakin sering melanggar, semakin lama blokir. `violationCount` diakumulasi per-record — artinya pola berulang (coba → blokir → tunggu → coba lagi) tetap terpantau dan dihukum lebih berat.

### Hashing Key Material

Tidak ada plaintext yang disimpan:

```typescript
// convex/authRecovery.ts — baris 42–46 (args schema)
args: {
  email: v.string(),        // plaintext — untuk lookup BetterAuth
  emailHash: v.string(),    // hash email — untuk rate limit tracking
  ipHash: v.string(),       // hash IP — untuk rate limit tracking
  keyHash: v.string(),      // hash device+intent — untuk rate limit tracking
}
```

`emailHash`, `ipHash`, `keyHash` adalah hash yang dihitung di sisi pemanggil (Next.js server) sebelum dikirim ke Convex. Database tidak menyimpan email atau IP dalam bentuk plaintext di tabel `authRecoveryAttempts`.

### Logika Triple-Check

```typescript
// convex/authRecovery.ts — baris 108–111
const wouldHitLimit =
  nextAttemptCount > MAX_ATTEMPTS_PER_KEY ||
  emailAttemptsInWindow + 1 > MAX_ATTEMPTS_PER_EMAIL ||
  ipAttemptsInWindow + 1 > MAX_ATTEMPTS_PER_IP
```

Pengecekan dilakukan **sebelum** attempt dicatat. Jika limit akan terlampaui, cooldown langsung diterapkan dan attempt tidak dicatat (tidak menambah `attemptCount`).

### Cek Email Existence (Privacy-Safe)

Setelah rate limit diizinkan, sistem mengecek apakah email terdaftar:

```typescript
// convex/authRecovery.ts — baris 166–175
const normalizedMatch = await ctx.runQuery(components.betterAuth.adapter.findOne, {
  model: "user",
  where: [{ field: "email", operator: "eq", value: normalizedEmail }],
})

if (normalizedMatch) {
  return { status: "registered", emailRegistered: true }
}
```

Fungsi ini juga mencoba exact-match jika email belum di-normalize (trim-only vs lowercase):

```typescript
// convex/authRecovery.ts — baris 178–190
if (trimmedEmail && trimmedEmail !== normalizedEmail) {
  const exactMatch = await ctx.runQuery(...)  // coba exact match
}
```

Response yang mungkin:
- `{ status: "rate_limited", retryAfterSeconds: N }` — diblokir
- `{ status: "registered", emailRegistered: true }` — email ada
- `{ status: "email_not_registered", emailRegistered: false }` — email tidak ada

---

## Sistem 2: OTP Rate Limiting

**File**: `convex/twoFactorOtp.ts`
**Scope**: Pengiriman dan verifikasi OTP 2FA

### Rate Limit Pengiriman OTP

```typescript
// convex/twoFactorOtp.ts — baris 4–7
const OTP_EXPIRY_MS = 5 * 60 * 1000        // 5 menit masa berlaku OTP
const MAX_ATTEMPTS = 5                      // 5 percobaan verifikasi per OTP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000 // Jendela 10 menit
const RATE_LIMIT_MAX = 5                    // Maks 5 OTP request per email per 10 menit
```

```typescript
// convex/twoFactorOtp.ts — baris 25–35 (createOtp handler)
const recentOtps = await ctx.db
  .query("twoFactorOtps")
  .withIndex("by_email", (q) =>
    q.eq("email", args.email).gte("createdAt", now - RATE_LIMIT_WINDOW_MS)
  )
  .collect()

if (recentOtps.length >= RATE_LIMIT_MAX) {
  return { success: false, error: "RATE_LIMITED" as const }
}
```

**Catatan penting**: Rate limit OTP dihitung berdasarkan jumlah OTP yang **dibuat** (bukan OTP yang valid). Jika user request OTP 5 kali dalam 10 menit, request ke-6 ditolak — meskipun sebagian besar OTP sebelumnya sudah expired atau dipakai.

### Logika Verifikasi OTP

```typescript
// convex/twoFactorOtp.ts — baris 59–84
const validOtp = otps.find(
  (otp) => !otp.used && otp.expiresAt > now && otp.attempts < MAX_ATTEMPTS
)

if (!validOtp) {
  return { success: false, error: "INVALID_OR_EXPIRED" as const }
}

if (validOtp.otpHash !== args.otpHash) {
  // Hash tidak cocok → increment attempts
  await ctx.db.patch(validOtp._id, {
    attempts: validOtp.attempts + 1,
  })
  return { success: false, error: "INVALID_CODE" as const }
}

// Benar → tandai sebagai used
await ctx.db.patch(validOtp._id, { used: true })
return { success: true }
```

Dua error yang dibedakan:
- `INVALID_CODE` — kode salah, tapi OTP masih valid (attempts++ dilakukan)
- `INVALID_OR_EXPIRED` — tidak ada OTP valid yang ditemukan (expired, sudah dipakai, atau melebihi max attempts)

### Pembersihan OTP Expired

```typescript
// convex/twoFactorOtp.ts — baris 104–119
export const cleanupExpired = internalMutation({
  handler: async (ctx) => {
    const now = Date.now()
    const expired = await ctx.db
      .query("twoFactorOtps")
      .withIndex("by_expiry", (q) => q.lt("expiresAt", now))
      .collect()

    for (const otp of expired) {
      await ctx.db.delete(otp._id)
    }

    return { deleted: expired.length }
  },
})
```

`cleanupExpired` dipanggil secara periodik oleh cron job (`convex/crons.ts`) untuk membersihkan baris OTP yang sudah kedaluwarsa dari tabel `twoFactorOtps`. Ini menjaga tabel tetap ramping dan memastikan index `by_expiry` tetap efisien.

---

## Perbandingan Kedua Sistem

| Aspek | Auth Recovery | OTP 2FA |
|---|---|---|
| Dimensi tracking | Per-key, per-email, per-IP | Per-email |
| Limit default | 5 / 10 / 30 per 10 menit | 5 request per 10 menit |
| Cooldown | Escalating (5 → 15 → 60 menit) | HTTP 429, tanpa cooldown eksplisit |
| Penyimpanan | Tabel `authRecoveryAttempts` | Tabel `twoFactorOtps` |
| Cleanup | Tidak ada (records persist) | Cron job `cleanupExpired` |
| Key material | Hash (privacy-safe) | Email plaintext (normalized lowercase) |

---

## Kesimpulan

Rate limiting Makalah AI menggunakan pendekatan **multi-dimensional** pada auth recovery (melindungi dari berbagai pola serangan sekaligus) dan **per-resource** pada OTP (melindungi per-email). Kedua sistem ini berjalan sepenuhnya di Convex backend — tidak bisa di-bypass dari sisi client.
