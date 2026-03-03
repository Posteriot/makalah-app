# Hero CTA Auth Redirect Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Pastikan user yang sudah login selalu diarahkan ke `/chat` saat klik CTA hero "AYO MULAI", dan user login yang nyasar ke `/sign-up` langsung di-redirect ke route aman.

**Architecture:** Alur CTA hero disatukan lewat `HeroCTA` sebagai single source of truth untuk keputusan redirect berbasis auth. `HeroCMS` hanya mengirimkan konten CTA dari CMS (label + fallback href untuk signed-out), tanpa mengambil keputusan auth sendiri. Halaman sign-up ditambah guard client-side berbasis `useSession` untuk mencegah user login tetap berada di halaman registrasi.

**Tech Stack:** Next.js 16 App Router, React 19, Better Auth client (`useSession`), Convex auth state (`useConvexAuth`), Vitest + Testing Library.

---

### Task 1: Tambah Regression Test Hero CTA Routing

**Files:**
- Create: `__tests__/marketing/hero-cta-routing.test.tsx`

**Step 1: Write failing tests for route decision**

Buat test untuk 3 kondisi:
1. user belum login -> CTA mengarah ke `/sign-up` (atau fallback `signedOutHref`)
2. user login -> CTA mengarah ke `/chat`
3. waitlist mode aktif -> CTA mengarah ke `/waitinglist`

**Step 2: Mock dependency auth/waitlist dan render komponen**

Mock:
- `convex/react` -> `useConvexAuth`
- `@/lib/hooks/useWaitlistMode`
- `next/link` untuk memastikan `href` bisa diinspeksi.

**Step 3: Run test file**

Run: `npx vitest run __tests__/marketing/hero-cta-routing.test.tsx`

Expected: minimal 1 test gagal karena API/behavior lama belum sesuai semua skenario.

---

### Task 2: Refactor HeroCTA menjadi Auth-Aware Reusable CTA

**Files:**
- Modify: `src/components/marketing/hero/HeroCTA.tsx`
- Modify: `src/components/marketing/hero/README.md`

**Step 1: Tambah props opsional pada HeroCTA**

Tambahkan props:
- `ctaText?: string`
- `signedOutHref?: string`

Default:
- `ctaText` default "AYO MULAI"
- `signedOutHref` default `/sign-up`

**Step 2: Terapkan satu fungsi route resolver**

Aturan final:
- jika waitlist mode aktif -> `/waitinglist`
- jika user belum login -> `signedOutHref` (aman, hanya path internal `/...`; fallback ke `/sign-up` bila invalid)
- jika user login -> `/chat`

**Step 3: Pertahankan loading behavior existing**

Jangan ubah semantik loading saat auth belum settle (`isAuthLoading && !hadSessionCookie`).

**Step 4: Update README komponen Hero**

Tambahkan catatan bahwa `HeroCTA` sekarang menerima props dan tetap memaksa signed-in route ke `/chat`.

**Step 5: Run Task 1 tests lagi**

Run: `npx vitest run __tests__/marketing/hero-cta-routing.test.tsx`

Expected: semua test Task 1 pass.

---

### Task 3: Ubah HeroCMS untuk Delegasi ke HeroCTA

**Files:**
- Modify: `src/components/marketing/hero/HeroCMS.tsx`
- Create: `__tests__/marketing/hero-cms-cta-delegation-smoke.test.ts`

**Step 1: Ganti direct SectionCTA dengan HeroCTA di mode normal**

Di cabang non-waitlist:
- render `<HeroCTA ctaText={content.ctaText} signedOutHref={content.ctaHref} />`
- hapus penggunaan langsung `SectionCTA href={content.ctaHref}`.

**Step 2: Tambah smoke test source-level**

Test memastikan:
- `HeroCMS.tsx` memanggil `HeroCTA` dengan `ctaText` dan `signedOutHref`
- tidak ada lagi string `SectionCTA href={content.ctaHref}`

**Step 3: Run tests Task 1 + Task 3**

Run:
- `npx vitest run __tests__/marketing/hero-cta-routing.test.tsx __tests__/marketing/hero-cms-cta-delegation-smoke.test.ts`

Expected: pass.

---

### Task 4: Tambah Guard di Halaman Sign-Up untuk User Login

**Files:**
- Modify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `__tests__/auth/sign-up-auth-redirect-smoke.test.ts`

**Step 1: Tambahkan guard session**

Gunakan `useSession` dari `@/lib/auth-client`.
Jika session tersedia:
- ambil redirect aman via `getRedirectUrl(searchParams, "/chat")`
- lakukan `window.location.replace(...)`
- jangan render form signup.

**Step 2: Tambah smoke test source-level**

Pastikan file signup:
- import `useSession`
- memiliki branch redirect saat session ada
- fallback default redirect ke `/chat`

**Step 3: Run auth guard test**

Run: `npx vitest run __tests__/auth/sign-up-auth-redirect-smoke.test.ts`

Expected: pass.

---

### Task 5: Verifikasi Regresi Utama

**Files:**
- No file changes required

**Step 1: Run targeted regression suite**

Run:
`npx vitest run __tests__/marketing/hero-cta-routing.test.tsx __tests__/marketing/hero-cms-cta-delegation-smoke.test.ts __tests__/auth/sign-up-auth-redirect-smoke.test.ts`

Expected: semua pass.

**Step 2: Summarize outcomes**

Laporkan:
- perubahan file
- output test
- risiko residual (jika ada)
