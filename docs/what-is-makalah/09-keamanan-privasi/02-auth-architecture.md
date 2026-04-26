# 02 — Arsitektur Autentikasi

**Sumber kode**: `convex/auth.ts`, `convex/authHelpers.ts`, `convex/authOrigins.ts`, `src/lib/auth-server.ts`, `src/lib/auth-client.ts`

---

## Gambaran Umum

Makalah AI menggunakan **BetterAuth** sebagai sistem autentikasi, diintegrasikan dengan Convex melalui adapter `@convex-dev/better-auth`. Arsitektur ini bersifat **cross-domain** — frontend Next.js (`SITE_URL`) dan backend Convex HTTP (`CONVEX_SITE_URL`) berjalan di origin yang berbeda.

---

## Stack Komponen Autentikasi

```
Browser (Next.js Frontend)
     │
     │  ba_session cookie (URL-encoded)
     ▼
src/lib/auth-server.ts          → Membaca cookie, request token ke Convex
     │
     │  Better-Auth-Cookie header
     ▼
CONVEX_SITE_URL/api/auth/convex/token  → Convex HTTP endpoint
     │
     │  JWT token
     ▼
convex/auth.ts (BetterAuth)     → Validasi session, return user identity
     │
     │  identity.subject = BetterAuth userId
     ▼
convex/authHelpers.ts           → Lookup user di tabel `users` Convex
```

---

## Inisialisasi BetterAuth

```typescript
// convex/auth.ts — baris 29–31
export const authComponent = createClient<DataModel>(components.betterAuth, {
  verbose: false,
})
```

Fungsi `createAuth()` dipanggil per-request (bukan singleton) karena menerima `ctx` Convex yang bersifat request-scoped.

```typescript
// convex/auth.ts — baris 163–165
export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx))
```

---

## Metode Autentikasi yang Tersedia

| Metode | Konfigurasi | Catatan |
|---|---|---|
| Email + Password | `emailAndPassword.enabled: true` | Wajib verifikasi email sebelum aktif |
| Magic Link | Plugin `magicLink`, expiry 300 detik (5 menit) | Via Resend email |
| Google OAuth | `socialProviders.google`, `disableImplicitSignUp: true` | User harus terdaftar dulu untuk OAuth Google |

**`disableImplicitSignUp: true`** — Artinya Google OAuth **tidak bisa digunakan untuk mendaftarkan akun baru** secara otomatis. User harus mendaftar via email+password terlebih dahulu, baru kemudian bisa link Google account.

---

## Plugin yang Aktif

```typescript
// convex/auth.ts — baris 121–160
plugins: [
  crossDomain({ siteUrl }),           // Cross-domain OTT flow
  convex({ authConfig }),             // Convex adapter integration
  magicLink({ ... }),                 // Magic link login
  twoFactor({ ... }),                 // 2FA enforcement
  createPasswordEndpoint(),           // Buat password dari OAuth account
  twoFactorCrossDomainBypass(),       // Custom: bypass 2FA untuk cross-domain
]
```

---

## Account Linking

```typescript
// convex/auth.ts — baris 115–119
account: {
  accountLinking: {
    enabled: true,
    trustedProviders: ["google"],
  },
},
```

Account linking diaktifkan, hanya Google yang menjadi **trusted provider**. User dengan email yang sama bisa menghubungkan akun email+password dengan akun Google.

---

## Email Verification

Email verification **wajib** sebelum akun dapat digunakan:

```typescript
// convex/auth.ts — baris 60–62
emailAndPassword: {
  enabled: true,
  requireEmailVerification: true,
```

Setelah verifikasi berhasil, hook `afterEmailVerification` mengirimkan email "signup success" — dan `twoFactorCrossDomainBypass` plugin secara otomatis mengaktifkan 2FA untuk user tersebut.

---

## Trusted Origins & CORS

```typescript
// convex/authOrigins.ts — baris 3–12
const staticTrustedOrigins = [
  siteUrl,                        // Dari env SITE_URL
  "https://makalah.ai",
  "https://www.makalah.ai",
  "https://dev.makalah.ai",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
]
```

Fungsi `getTrustedOrigins()` menambahkan origin localhost secara dinamis **hanya** di environment non-production:

```typescript
// convex/authOrigins.ts — baris 25–36
export function getTrustedOrigins(request?: Request): string[] {
  const trustedOrigins = [...staticTrustedOrigins]
  const origin = request?.headers.get("origin") ?? ""
  if (
    process.env.NODE_ENV !== "production" &&
    isLocalDevOrigin(origin) &&
    !trustedOrigins.includes(origin)
  ) {
    trustedOrigins.push(origin)
  }
  return trustedOrigins
}
```

---

## Cross-Domain Session Flow

Karena frontend dan backend berbeda origin, BetterAuth tidak bisa menggunakan cookie biasa. Mekanisme yang digunakan:

### 1. SessionCookieSync (Client → Convex token)

`ConvexBetterAuthProvider` di `providers.tsx` membaca semua cookies dari `crossDomainClient` localStorage dan mengenkodenya ke cookie browser `ba_session` (URL-encoded cookie string).

### 2. getToken() (Server-side)

```typescript
// src/lib/auth-server.ts — baris 145–148
export async function getToken(): Promise<string | null> {
  const betterAuthCookies = await getBetterAuthCookies()
  return getTokenFromBetterAuthCookies(betterAuthCookies)
}
```

Flow `getToken()`:
1. Baca cookie `ba_session` dari browser
2. Decode URL encoding → string cookie BetterAuth
3. Forward ke `CONVEX_SITE_URL/api/auth/convex/token` via header `Better-Auth-Cookie`
4. Convex validasi → return JWT token untuk Convex queries/mutations

### 3. Retry & Resilience

```typescript
// src/lib/auth-server.ts — baris 163–165
const CONVEX_TOKEN_TIMEOUT_MS = 5_000
const CONVEX_TOKEN_MAX_ATTEMPTS = 2
const CONVEX_TOKEN_RETRY_DELAY_MS = 300
```

- Timeout: 5 detik per attempt
- Max attempts: 2 kali
- Delay antar retry: 300ms
- HTTP 5xx dari Convex → retry (transient), bukan invalidate session
- Network error → retry sekali, lalu return `status: "network_error"` (bukan `status: "invalid"`)

Pemisahan antara `network_error` dan `invalid` ini krusial: Convex downtime sementara tidak menyebabkan user ter-logout.

---

## Resolusi Identitas di Convex

```typescript
// convex/authHelpers.ts — baris 17–30
export async function getAuthUser(ctx: AnyCtx): Promise<Doc<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) return null

  const user = await ctx.db
    .query("users")
    .withIndex("by_betterAuthUserId", (q) =>
      q.eq("betterAuthUserId", identity.subject)
    )
    .unique()

  return user ?? null
}
```

- `identity.subject` = BetterAuth user ID
- Lookup via index `by_betterAuthUserId` ke tabel `users` Convex
- Return `null` jika tidak terauthentikasi atau user tidak ditemukan (tidak throw)

### Varian Resolusi

| Fungsi | Behavior saat tidak auth |
|---|---|
| `getAuthUser()` | Return `null` |
| `requireAuthUser()` | Throw `"Unauthorized"` |
| `requireAuthUserId(ctx, userId)` | Throw jika tidak auth atau userId tidak cocok |
| `verifyAuthUserId(ctx, userId)` | Return `null` — graceful, untuk query |

---

## Database Hooks

```typescript
// convex/auth.ts — baris 101–113
databaseHooks: {
  user: {
    create: {
      after: async (user) => {
        // Kirim email signup success jika email sudah terverifikasi
        // (untuk OAuth flow yang langsung verified)
        if (!email || user.emailVerified !== true) return
        await sendSignupSuccessEmailSafely(ctx, email, userName)
      },
    },
  },
},
```

Hook ini hanya berjalan untuk Google OAuth user yang langsung `emailVerified: true` saat pembuatan akun. Untuk email+password, welcome email dikirim via `afterEmailVerification`.

---

## Kesimpulan

Arsitektur autentikasi Makalah AI dirancang untuk:
- **Cross-domain safety** via OTT dan cookie forwarding, bukan shared origin
- **Resilience** via retry logic yang membedakan transient error dari invalid token
- **Minimum exposure** via `disableImplicitSignUp` dan `requireEmailVerification`
- **Unified identity** via `by_betterAuthUserId` index sebagai bridge antara BetterAuth dan Convex data
