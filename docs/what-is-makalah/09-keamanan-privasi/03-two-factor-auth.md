# 03 — Two-Factor Authentication (2FA)

**Sumber kode**: `convex/twoFactorHttp.ts`, `convex/twoFactorOtp.ts`, `convex/twoFactorBypass.ts`, `src/lib/auth-2fa.ts`

---

## Gambaran Umum

Makalah AI menerapkan 2FA berbasis OTP (One-Time Password) via email. Sistem ini dirancang ulang dari plugin 2FA bawaan BetterAuth karena plugin tersebut **tidak kompatibel dengan cross-domain auth** — mekanisme yang digunakan Makalah AI untuk memisahkan frontend dan Convex backend.

Ada dua sub-sistem 2FA yang bekerja bersama:
1. **Custom OTP System** — endpoint HTTP Convex yang mengelola pengiriman, penyimpanan, dan verifikasi OTP secara mandiri
2. **Cross-Domain Bypass Plugin** — BetterAuth plugin yang menjembatani OTP custom dengan sign-in flow BetterAuth

---

## Auto-Enable 2FA

2FA **diaktifkan secara otomatis** setelah user berhasil verifikasi email:

```typescript
// convex/twoFactorBypass.ts — baris 34–63
{
  matcher(ctx) {
    return ctx.path?.startsWith("/verify-email") === true
  },
  handler: createAuthMiddleware(async (ctx) => {
    const session = ctx.context.newSession ?? ctx.context.session
    if (!session?.user) return

    const user = session.user as Record<string, unknown>
    if (user.twoFactorEnabled) return  // sudah aktif, skip

    await ctx.context.internalAdapter.updateUser(
      session.user.id,
      { twoFactorEnabled: true }
    )
  }),
},
```

User yang tidak menginginkan 2FA harus menonaktifkannya secara aktif melalui halaman Settings.

---

## Batasan & Rate Limiting OTP

Semua angka ini faktual dari kode:

```typescript
// convex/twoFactorOtp.ts — baris 4–7
const OTP_EXPIRY_MS = 5 * 60 * 1000     // 5 menit
const MAX_ATTEMPTS = 5                   // maks 5 percobaan verifikasi per OTP
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000  // jendela 10 menit
const RATE_LIMIT_MAX = 5                 // maks 5 OTP request per email per 10 menit
```

| Parameter | Nilai |
|---|---|
| Masa berlaku OTP | 5 menit |
| Max percobaan verifikasi per OTP | 5 kali |
| Max OTP yang bisa dikirim | 5 per 10 menit per email |
| Format OTP | 6 digit angka (`padStart(6, "0")`) |
| Penyimpanan OTP | SHA-256 hash di tabel `twoFactorOtps` |

---

## Penyimpanan OTP (Hashing)

OTP tidak disimpan sebagai plaintext. Sebelum disimpan, OTP di-hash:

```typescript
// convex/twoFactorOtp.ts — baris 9–15
export async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(otp)
  const hashBuffer = await crypto.subtle.digest("SHA-256", data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")
}
```

Saat verifikasi, OTP yang dikirim user juga di-hash terlebih dahulu, lalu dibandingkan hash-nya.

---

## Endpoint HTTP 2FA

Tiga endpoint Convex HTTP yang melayani flow 2FA:

### `POST /api/auth/2fa/send-otp`

**File**: `convex/twoFactorHttp.ts`, fungsi `sendOtp`

1. Baca `email` dari body request
2. Cari user via `findUserByEmail()` — jika tidak ada, **tetap return `status: true`** (tidak mengungkap apakah email terdaftar)
3. Cek `user.twoFactorEnabled` — jika false, tetap return `status: true`
4. Generate OTP 6 digit via `crypto.getRandomValues()`
5. Hash OTP, simpan ke `twoFactorOtps` via `createOtp` mutation
6. Jika rate limit hit → return HTTP 429
7. Kirim OTP via Resend email (template DB → fallback hardcoded)

**Privacy design**: Error "user tidak ditemukan" dan "2FA tidak aktif" keduanya menghasilkan response yang sama (`status: true`) — sehingga tidak ada cara bagi penyerang untuk enumerate akun yang terdaftar.

### `POST /api/auth/2fa/verify-otp`

**File**: `convex/twoFactorHttp.ts`, fungsi `verifyOtp`

1. Baca `email` dan `code` dari body
2. Hash `code` yang diterima
3. Jalankan `verifyOtp` mutation di Convex (cek hash, expiry, attempt count)
4. Jika gagal: error `INVALID_CODE` (salah tapi belum expired) vs `INVALID_OR_EXPIRED`
5. Jika berhasil:
   - Buat **bypass token**: string `"2fa-bypass-" + 32 random bytes (hex)`
   - Simpan bypass token ke `internalAdapter.createVerificationValue()` dengan **expiry 30 detik**
   - Return `{ status: true, bypassToken }`

**Bypass token lifetime: 30 detik** — sangat ketat, hanya cukup untuk sign-in call berikutnya.

### `POST /api/auth/2fa/verify-backup-code`

**File**: `convex/twoFactorHttp.ts`, fungsi `verifyBackupCode`

1. Lookup `twoFactor` record user via adapter
2. Decrypt backup codes menggunakan `symmetricDecrypt` dari `better-auth/crypto` (server secret)
3. Cek apakah `code` ada di array backup codes
4. Jika valid: **hapus kode yang digunakan** dari array (single-use), enkripsi ulang, simpan
5. Update menggunakan `updateMany` dengan kondisi `backupCodes === twoFactor.backupCodes` — optimistic lock untuk mencegah race condition
6. Buat bypass token (30 detik) → return

**Backup code bersifat single-use dan terenkripsi** di database.

---

## Cross-Domain Bypass Flow

Masalah: Plugin `twoFactor` bawaan BetterAuth menghapus session dan set cookie `two_factor` untuk signaling — tapi cookie ini tidak bisa di-relay di cross-domain mode.

Solusi: Plugin custom `twoFactorCrossDomainBypass` yang menginterrrupt flow saat `twoFactorRedirect: true` terdeteksi.

### Alur Lengkap (6 Langkah)

```
Client                          Convex HTTP                    BetterAuth
  │                                   │                              │
  │  1. POST /api/auth/2fa/verify-otp │                              │
  │──────────────────────────────────>│                              │
  │  { bypassToken: "2fa-bypass-..." }│                              │
  │<──────────────────────────────────│                              │
  │                                   │                              │
  │  2. signIn.email() + header       │                              │
  │     X-2FA-Bypass-Token: <token>   │                              │
  │──────────────────────────────────>│────────────────────────────>│
  │                                   │                              │
  │                                   │  3. twoFactor plugin:        │
  │                                   │     hapus session            │
  │                                   │     return twoFactorRedirect │
  │                                   │<────────────────────────────│
  │                                   │                              │
  │                                   │  4. twoFactorCrossDomainBypass
  │                                   │     hook dijalankan:         │
  │                                   │     - matcher: path="/sign-in/email"
  │                                   │       && twoFactorRedirect=true
  │                                   │     - baca X-2FA-Bypass-Token│
  │                                   │     - validasi bypass token  │
  │                                   │       (cek expiry, one-time) │
  │                                   │                              │
  │                                   │  5. Buat session baru        │
  │                                   │     Generate OTT (3 menit)   │
  │                                   │     Return OTT response      │
  │                                   │                              │
  │  6. crossDomain client            │                              │
  │     tukar OTT → session cookie    │                              │
  │<──────────────────────────────────│                              │
```

### Detail Bypass Token Lifecycle

```typescript
// convex/twoFactorBypass.ts — baris 84–112
// Validate bypass token
const verification = await ctx.context.internalAdapter.findVerificationValue(bypassToken)

if (!verification) { /* invalid */ return }

// Check expiry
if (verification.expiresAt && new Date(verification.expiresAt) < new Date()) {
  await ctx.context.internalAdapter.deleteVerificationValue(verification.id).catch(() => {})
  return
}

// Delete bypass token (one-time use)
await ctx.context.internalAdapter.deleteVerificationValue(verification.id).catch(() => {})

// Create new session
const newSession = await ctx.context.internalAdapter.createSession(userId, false)

// Generate OTT (3 menit)
const ottToken = generateRandomString(32)
const ottExpiresAt = new Date(Date.now() + 3 * 60 * 1000)
await ctx.context.internalAdapter.createVerificationValue({
  value: newSession.token,
  identifier: `one-time-token:${ottToken}`,
  expiresAt: ottExpiresAt,
})
```

### Token Lifetime Summary

| Token | Lifetime | Sifat |
|---|---|---|
| OTP (6 digit) | 5 menit | Single-use (ditandai `used: true`) |
| Bypass Token | 30 detik | Single-use (dihapus setelah dipakai) |
| OTT (One-Time Token) | 3 menit | Single-use (untuk cross-domain relay) |

---

## Client-Side: Pending 2FA State

```typescript
// src/lib/auth-2fa.ts — baris 3–4
const PENDING_2FA_KEY = "pending_2fa"
// TTL: Date.now() + 5 * 60 * 1000 — baris 20
```

Data `{ email, password, redirectUrl }` disimpan di `sessionStorage` (bukan localStorage) dengan TTL 5 menit. Ini memastikan bahwa credentials pending tidak bocor ke tab lain dan dibersihkan otomatis setelah 5 menit tanpa interaksi.

---

## CORS pada Endpoint 2FA

Semua endpoint 2FA menggunakan `getCorsHeaders()` yang memanggil `getAllowedCorsOrigin()`:

```typescript
// convex/twoFactorHttp.ts — baris 18–26
function getCorsHeaders(request: Request): Record<string, string> {
  const allowed = getAllowedCorsOrigin(request)
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  }
}
```

`getAllowedCorsOrigin()` mengizinkan origin hanya jika ada dalam daftar trusted origins. Jika origin tidak dikenal, fallback ke `trustedOrigins[0]` (nilai `SITE_URL`).
