# Auth Fullpage Redesign - Design Doc

Tanggal: 26 Februari 2026  
Status: Draft Siap Implementasi  
Scope: `sign-in`, `sign-up`, `forgot-password`, `reset-password`, `verify-2fa`, `waitinglist`  

## 1. Latar Belakang

Auth page saat ini masih berbasis `AuthWideCard` (container card di tengah page). Target redesign adalah mengubah auth menjadi fullpage split layout (tanpa card), tetap mempertahankan dua section kiri-kanan di desktop dan stack terstruktur di mobile.

Migrasi styling harus berpindah ke `src/app/globals-new.css` dengan cluster token/style khusus auth. `src/app/globals.css` akan dibersihkan bertahap dari token auth legacy setelah cluster baru stabil.

## 2. Tujuan

1. Menghapus pola card-centered pada seluruh flow auth.
2. Menjadikan auth sebagai fullpage layout yang konsisten desktop/mobile.
3. Menyediakan dark/light mode yang konsisten via token auth di `globals-new.css`.
4. Menjamin parity seluruh state auth (signin/signup/forgot/reset/2FA/waitlist).
5. Menyiapkan landasan cleanup token lama di `globals.css`.

## 3. Non-Goal

1. Tidak mengubah logika backend auth (Better Auth, Convex, route API).
2. Tidak mengubah copywriting utama auth kecuali diperlukan untuk keterbacaan layout.
3. Tidak mengubah alur bisnis waitlist mode.

## 4. Prinsip Desain

1. `No Card`: tidak ada `rounded/border/bg card shell` sebagai kontainer utama auth.
2. `Split Identity`: kiri untuk branding/context, kanan untuk aksi form.
3. `Mode-aware`: judul/subjudul/isi form berubah per mode tanpa ganti kerangka layout.
4. `Mobile-first`: default stack mobile, desktop enhancement via breakpoint.
5. `Token-first`: warna, radius, border, spacing, focus ring mengacu cluster auth di `globals-new.css`.

## 5. Struktur Layout Target

## 5.1 Desktop (>= 1024px)

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ Top Utility Row                                                           │
│ [<-- Kembali]                                              [Theme] [Close]│
├────────────────────────────────────────────────────────────────────────────┤
│ Left Section (40%)                  │ Right Section (60%)                 │
│ - Logo                              │ - Form Header (mode-aware)          │
│ - Headline + Subtitle               │ - Input group + labels              │
│ - Trust/info bullets                │ - Inline error/success states       │
│ - Small footer/legal                │ - CTA + secondary action            │
└────────────────────────────────────────────────────────────────────────────┘
```

## 5.2 Mobile (< 1024px)

```text
┌──────────────────────────────────────────────┐
│ Top Row                                      │
│ [<-- Kembali]                 [Theme] [Close]│
├──────────────────────────────────────────────┤
│ Branding Strip (compact)                     │
│ Logo + short title + short subtitle          │
├──────────────────────────────────────────────┤
│ Form Section                                 │
│ Header, labels, inputs, errors, CTA          │
│ Secondary actions + helper text              │
└──────────────────────────────────────────────┘
```

## 6. Wireframe Komponen per Mode

## 6.1 Sign In

1. Header mode `Silakan masuk`.
2. Email + password.
3. Google button conditional (hidden saat waitlist mode aktif).
4. Link ke `Lupa password` dan `Magic link`.
5. Error block inline.

## 6.2 Sign Up

1. Header mode `Ayo bergabung`.
2. First name, last name, email, password.
3. Google sign up.
4. State `verify-email` sebagai panel informasi.

## 6.3 Forgot Password / Magic Link / Reset Password

1. Tetap di shell yang sama, konten kanan switch berdasarkan mode.
2. Turnstile tetap inline di bawah field email untuk mode recovery.
3. State sent/success menggunakan blok feedback yang konsisten.

## 6.4 Verify 2FA

1. OTP 6 digit tetap mempertahankan auto-focus UX.
2. Action `kirim ulang`, `backup code`, dan `batalkan`.
3. Error state harus terbaca jelas dan announceable.

## 6.5 Waiting List

1. Header khusus waitinglist.
2. Form nama depan/belakang/email + success state.
3. Tetap berada di shell fullpage yang sama untuk konsistensi.

## 7. Dark/Light Strategy

Auth mengikuti theme app (`next-themes`) dan enforcement existing:

1. Unauthenticated default dark tetap dipertahankan.
2. Seluruh warna auth dipetakan dari token cluster auth (`--auth-*`) di `globals-new.css`.
3. Komponen input, border, CTA, dan feedback tidak hardcode warna slate langsung di page component.

Target kontras minimal:

1. Body text: minimal 4.5:1.
2. Secondary text: minimal 3:1 untuk teks besar, 4.5:1 untuk teks normal.
3. Focus ring harus terlihat jelas di dark dan light.

## 8. Mobile/Responsive Rules

1. Touch target minimal tinggi 44px.
2. Tidak ada horizontal scroll pada 320-390 px.
3. Spacing di mobile dipadatkan, desktop diperlebar via breakpoint.
4. Struktur visual tetap sama antar mode, hanya content slot yang berubah.

## 9. Accessibility Rules

1. Semua input punya label eksplisit (`label`), bukan placeholder-only.
2. Error container pakai `role="alert"` atau `aria-live`.
3. Icon-only button wajib `aria-label`.
4. Keyboard tab order mengikuti urutan visual.
5. State loading CTA punya indikasi disable + status jelas.

## 10. Token & Cluster Plan (`globals-new.css`)

Akan ditambahkan cluster baru scoped auth:

1. `[data-auth-scope]` untuk override semantic token auth.
2. Utility auth:
   - `auth-shell`, `auth-section-left`, `auth-section-right`
   - `auth-input`, `auth-cta`, `auth-feedback-error`, `auth-feedback-success`
3. Token inti:
   - `--auth-background`, `--auth-foreground`
   - `--auth-surface-left`, `--auth-surface-right`
   - `--auth-border`, `--auth-input`, `--auth-ring`
   - `--auth-primary`, `--auth-primary-foreground`
   - `--auth-danger`, `--auth-success`
   - `--auth-radius-action`, `--auth-space-*`

## 11. Acceptance Criteria Desain

1. Tidak ada container card utama (`bg-card rounded-* border`) sebagai shell auth.
2. Desktop tetap split 2 section, mobile tetap stack terstruktur.
3. Semua mode auth tampil konsisten dalam shell yang sama.
4. Dark/light mode tervalidasi visual.
5. Semua styling auth bergantung pada cluster token baru di `globals-new.css`.
