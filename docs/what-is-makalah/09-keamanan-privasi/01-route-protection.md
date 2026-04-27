# 01 — Route Protection (Middleware)

**Sumber kode**: `src/proxy.ts`

> [!NOTE]
> File middleware Next.js di proyek ini bernama `src/proxy.ts`, **bukan** `src/middleware.ts`. Keduanya berfungsi identik sebagai Next.js middleware, tetapi nama file-nya berbeda dari konvensi default.

---

## Gambaran Umum

Middleware adalah layer pertama dan paling awal dalam rantai keamanan Makalah AI. Setiap HTTP request ke aplikasi melewati `src/proxy.ts` sebelum menyentuh route handler atau server component manapun.

Postur middleware ini adalah **gerbang kasar** — ia hanya memblokir request yang *jelas-jelas tidak memiliki cookie session*. Validasi session yang sesungguhnya (apakah token valid, belum kedaluwarsa, dll.) dilakukan di layer berikutnya:
- **Client-side**: `useConvexAuth()` di React component
- **Server-side**: `getToken()` di `src/lib/auth-server.ts`

---

## Public Routes

Middleware mendefinisikan daftar rute yang **tidak memerlukan autentikasi** secara hardcoded:

```typescript
// src/proxy.ts — baris 4–18
const PUBLIC_ROUTES = [
  "/",
  "/sign-in",
  "/sign-up",
  "/verify-2fa",
  "/api",
  "/about",
  "/pricing",
  "/blog",
  "/documentation",
  "/waitinglist",
  "/privacy",
  "/security",
  "/terms",
]
```

**Catatan penting**: `/api` ada di daftar ini, artinya **seluruh** rute di bawah `/api/...` bersifat publik dari perspektif middleware. Keamanan API endpoint individual diatur masing-masing di dalam handler-nya (misalnya: webhook menggunakan `CONVEX_INTERNAL_KEY`, dan `XENDIT_WEBHOOK_TOKEN`).

---

## Logika `isPublicRoute()`

```typescript
// src/proxy.ts — baris 20–24
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  )
}
```

Fungsi ini melakukan **prefix match**, bukan exact match. Artinya:
- `/pricing` → publik (exact match)
- `/pricing/detail` → publik (prefix match `/pricing/`)
- `/about/team` → publik (prefix match `/about/`)
- `/dashboard` → **bukan** publik → perlu autentikasi

---

## Mekanisme Gate di Middleware

```typescript
// src/proxy.ts — baris 26–52
export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 1. Lewati jika rute publik
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // 2. Lewati jika request memiliki query param `?ott=`
  if (request.nextUrl.searchParams.has("ott")) {
    return NextResponse.next()
  }

  // 3. Blokir jika tidak ada cookie `ba_session`
  const sessionCookie = request.cookies.get("ba_session")?.value
  if (!sessionCookie) {
    const signInUrl = new URL("/sign-in", request.url)
    const redirectPath = `${request.nextUrl.pathname}${request.nextUrl.search}`
    signInUrl.searchParams.set("redirect_url", redirectPath)
    return NextResponse.redirect(signInUrl)
  }

  // 4. Cookie ada → lanjutkan request
  return NextResponse.next()
}
```

### Tiga Gate (Urutan Eksekusi)

| Gate | Kondisi | Hasil |
|---|---|---|
| 1. Public Route Check | Pathname match `PUBLIC_ROUTES` | `NextResponse.next()` — langsung lanjut |
| 2. OTT Bypass | Query param `?ott=` ada | `NextResponse.next()` — lanjut (untuk OAuth/magic-link callback) |
| 3. Cookie Presence Check | Cookie `ba_session` tidak ada | Redirect ke `/sign-in?redirect_url=...` |

---

## OTT Bypass: Alasan dan Cara Kerja

Query param `?ott=` (One-Time Token) digunakan oleh BetterAuth untuk alur OAuth/magic-link cross-domain. Flow-nya:

1. User klik magic link atau selesaikan OAuth
2. BetterAuth redirect ke frontend dengan `?ott=<token>`
3. `ConvexBetterAuthProvider` di client menangkap OTT ini
4. Client menukar OTT ke session cookie via Convex
5. Setelah pertukaran, cookie `ba_session` tersedia

Jika middleware tidak mengizinkan `?ott=`, request pertama setelah OAuth/magic-link akan langsung diredirect ke `/sign-in` sebelum client sempat menukar token — infinite redirect loop.

---

## Matcher Config

```typescript
// src/proxy.ts — baris 54–56
export const config = {
  matcher: ["/((?!.*\\..*|_next).*)","/" ,"/(api|trpc)(.*)"],
}
```

Middleware berjalan pada:
- Semua pathname yang **tidak mengandung titik** (`.`) — mengecualikan file statis seperti `.png`, `.css`, `.js`
- Pengecualian `_next` — Next.js internal assets
- Semua rute `/api/...` dan `/trpc/...` tetap dijalankan middleware

---

## Kesimpulan: Posture Middleware

Middleware ini adalah **necessary but not sufficient** guard. Ia:
- ✅ Memblokir request tanpa cookie session sama sekali
- ✅ Tidak membuat external call (tidak ada dependency ke Convex/BetterAuth)
- ✅ Cepat — hanya string comparison dan cookie lookup
- ❌ Tidak memvalidasi apakah token dalam cookie masih valid
- ❌ Tidak mengecek apakah user memiliki izin untuk resource tertentu

Validasi full-stack yang sesungguhnya ada di `src/lib/auth-server.ts` (`getToken()` → call ke Convex token endpoint).
