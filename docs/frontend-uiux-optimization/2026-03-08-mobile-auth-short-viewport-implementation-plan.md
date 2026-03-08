# Mobile Auth Short Viewport Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memperbaiki UX halaman auth di mobile viewport pendek dengan menambah mode layout `short-height mobile` yang merapikan jarak tombol kembali, logo, hero copy, dan form.

**Architecture:** Perbaikan dipusatkan pada shared auth shell agar semua auth states mewarisi perilaku yang konsisten. Perubahan utama ada pada `AuthWideCard` dan token/layout CSS auth, lalu diverifikasi di beberapa route auth dan viewport pendek.

**Tech Stack:** Next.js App Router, React, TypeScript, global CSS, browser verification via Next.js/Chrome tools

---

## Scope

- Shared shell: `src/components/auth/AuthWideCard.tsx`
- Shared auth styling: `src/app/globals-new.css`
- Validation routes:
  - `/sign-in`
  - `/sign-up`
  - `/verify-2fa`
- Validation submodes from sign-in:
  - `magic-link`
  - `forgot-password`
  - `reset-password` when token flow is available

## Acceptance Criteria

- Pada `320x568`, tombol kembali dan logo punya jarak visual yang jelas.
- Pada `320x568`, bagian awal form terlihat lebih cepat tanpa perlu scroll berlebihan.
- Pada `375x812`, safe-area atas tidak membuat tombol kembali atau hero terasa menempel.
- Semua elemen interaktif utama tetap minimal `44px`.
- Tidak ada overlap, horizontal scroll, atau focus ring yang terpotong.

## Tasks

### Task 1: Baseline verification and selector mapping

**Files:**
- Inspect: `src/components/auth/AuthWideCard.tsx`
- Inspect: `src/app/globals-new.css`
- Inspect: `src/lib/auth-2fa.ts`

**Step 1: Capture current auth layout behavior**

Run browser verification on:

- `/sign-in`
- `/sign-up`
- `/verify-2fa`

Target viewport:

- `320x568`
- `375x667`
- `375x812`

**Step 2: Record current problem points**

Document:

- gap tombol kembali ke logo,
- tinggi hero kiri,
- posisi awal form terhadap fold,
- perilaku top spacing pada device notch.

**Step 3: Confirm shared-shell impact**

Pastikan semua halaman di atas memakai `AuthWideCard` dan selector CSS auth yang sama.

**Step 4: Make verify-2fa verification feasible**

Karena `verify-2fa` akan redirect ke `/sign-in` jika tidak ada pending state, siapkan salah satu dari dua jalur verifikasi berikut:

- seed `sessionStorage` key `pending_2fa` dengan shape dari `src/lib/auth-2fa.ts`,
- atau capai page melalui flow sign-in yang benar-benar memicu pending 2FA.

### Task 2: Introduce short-height mobile layout mode

**Files:**
- Modify: `src/components/auth/AuthWideCard.tsx`
- Modify: `src/app/globals-new.css`

**Step 1: Adjust hero structure only where needed**

Ubah struktur wrapper hero agar mobile short-height bisa memakai flow layout yang stabil, tanpa mengubah hierarchy konten.

**Step 2: Add short-height breakpoint rules**

Tambahkan media query khusus mobile short-height untuk:

- `auth-section-left`
- `auth-back-button`
- `auth-logo-link` / ukuran image logo
- `auth-hero-title`
- `auth-hero-subtitle`
- wrapper hero stack
- safe-area aware top spacing bila diperlukan

**Step 3: Keep desktop and regular mobile intact**

Pastikan rules baru tidak mengubah desktop atau mobile tinggi normal secara tidak sengaja.

### Task 3: Compress form spacing without hurting usability

**Files:**
- Modify: `src/app/globals-new.css`
- Inspect if needed: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Inspect if needed: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Inspect if needed: `src/app/(auth)/verify-2fa/page.tsx`

**Step 1: Reduce vertical padding in shared form containers**

Sesuaikan:

- `auth-section-right`
- `auth-form-wrap`

untuk viewport pendek.

**Step 2: Review per-page wrappers**

Jika `space-y-5` atau wrapper lokal masih terlalu tinggi, tambahkan class atau selector yang lebih adaptif hanya bila shared CSS belum cukup.

**Step 3: Preserve minimum touch target**

Jangan turunkan tinggi `auth-input`, `auth-cta`, atau tombol kembali di bawah `44px`.

### Task 4: Review interaction behavior and motion safety

**Files:**
- Modify if needed: `src/app/globals-new.css`

**Step 1: Keep transitions purposeful**

Pastikan perubahan hanya memakai transition ringan pada properti yang sudah ada, seperti color, opacity, atau transform kecil.

**Step 2: Respect reduced motion**

Jika layout adjustment memperkenalkan transisi tambahan, tambahkan perlindungan `prefers-reduced-motion`.

**Step 3: Check focus visibility**

Verifikasi `auth-focus-ring` tetap terlihat dan tidak terpotong di viewport pendek.

### Task 5: Verify all auth states

**Files:**
- Verify: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Verify: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Verify: `src/app/(auth)/verify-2fa/page.tsx`

**Step 1: Verify primary routes**

Test:

- `/sign-in`
- `/sign-up`
- `/verify-2fa`

Viewport:

- `320x568`
- `375x667`
- `375x812`

**Step 2: Verify sign-in submodes**

Dari `/sign-in`, cek:

- sign-in default
- magic link
- forgot password
- reset password state jika tersedia dari token flow
- verify bahwa spacing shell tetap konsisten di semua state ini

**Step 3: Verify no new regressions**

Periksa:

- tidak ada overlap,
- tidak ada horizontal scroll,
- heading tetap terbaca,
- CTA tetap terlihat wajar,
- spacing antar elemen interaktif aman,
- top spacing aman pada device notch,
- `verify-2fa` benar-benar diuji dalam state yang valid, bukan hanya redirect fallback.

### Task 6: Final evidence capture

**Files:**
- No code change required

**Step 1: Capture after screenshots**

Ambil screenshot viewport pendek sesudah perubahan untuk minimal:

- `/sign-in`
- `/sign-up`

**Step 2: Compare against baseline**

Pastikan:

- gap tombol kembali ke logo sudah jelas,
- hero lebih kompak,
- form lebih cepat terlihat,
- hasil pada iPhone X class tetap aman terhadap safe-area.

**Step 3: Summarize residual risks**

Catat jika masih ada edge case khusus device height yang perlu iterasi kecil lanjutan.

## Verification Checklist

- `320x568` sign-in tidak lagi memiliki back button yang menempel ke logo
- `375x812` aman terhadap notch dan safe-area atas
- sign-up mewarisi spacing yang sama
- verify-2fa diuji lewat pending state yang valid dan tidak regress
- focus ring tetap terlihat
- touch target tetap aman
- tidak ada horizontal scroll
- reduced-motion tidak diabaikan

## Suggested Execution Order

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6

## Notes for Implementation

- Prioritaskan perubahan di shared shell daripada override per page.
- Gunakan media query yang sempit dan defensif.
- Hindari refactor besar yang tidak perlu; masalah ini adalah responsive compression, bukan redesign total.
