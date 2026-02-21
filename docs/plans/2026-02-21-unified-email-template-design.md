# Design: Unified Email Template System

> **Created:** 2026-02-21
> **Status:** APPROVED

---

## Arsitektur

**Satu file**: `convex/authEmails.ts` — semua email templates + shared layout.

```
convex/authEmails.ts
├── emailLayout(content, options?)     ← BARU: shared wrapper
├── sendViaResend(to, subject, html)   ← existing helper
├── sendVerificationEmail()            ← upgrade: pakai layout
├── sendMagicLinkEmail()               ← upgrade: pakai layout
├── sendPasswordResetEmail()           ← upgrade: pakai layout
├── sendTwoFactorOtpEmail()            ← upgrade: pakai layout
├── sendSignupSuccessEmail()           ← upgrade: pakai layout
├── sendWaitlistConfirmationEmail()    ← PINDAH dari resend.ts
├── sendWaitlistInviteEmail()          ← upgrade: pakai layout
└── sendWaitlistAdminNotification()    ← upgrade: pakai layout
```

**Dihapus:**
- `src/lib/email/resend.ts` — fungsi pindah ke `convex/authEmails.ts`
- `src/app/(auth)/waitinglist/actions.ts` — refactor, panggil Convex scheduler

---

## Shared Layout: `emailLayout()`

```
┌──────────────────────────────────────────────┐
│ bg: #0f172a (slate-900)                      │
│ max-width: 520px, center, rounded 8px        │
│ padding: 32px 24px                           │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ [logo 24x24]  MAKALAH AI (svg brand)     │ │
│ │ ──────────────────────────────────────── │ │
│ │ border-bottom: 1px solid #334155         │ │
│ └──────────────────────────────────────────┘ │
│                                              │
│   {{ content slot }}                         │
│                                              │
│ ┌──────────────────────────────────────────┐ │
│ │ ──────────────────────────────────────── │ │
│ │ © 2026 Makalah AI · makalah.ai           │ │
│ │ Email otomatis. Tidak perlu dibalas.      │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

---

## Design Tokens (Mechanical Grace)

| Token | Value | Note |
|-------|-------|------|
| Background | `#0f172a` | slate-900 |
| Text body | `#cbd5e1` | slate-300 |
| Text heading | `#f8fafc` | slate-50 |
| Text muted | `#64748b` | slate-500 |
| Separator | `#334155` | slate-700 |
| CTA button bg | `#059669` | emerald-600 |
| CTA button text | `#f8fafc` | slate-50 |
| Secondary button bg | `#334155` | slate-700 |
| Secondary button text | `#f8fafc` | slate-50 |
| Info box bg | `#1e293b` | slate-800 |
| Info box border | `#334155` | slate-700 |
| Font body | `'Geist Sans', -apple-system, sans-serif` | |
| Font mono | `'Geist Mono', 'SF Mono', monospace` | |
| Header text | mono, 11px, uppercase, tracking 0.1em | |
| Body text | 13px | |
| Greeting | 15px, slate-50 | |
| Fine print | 11px, slate-500 | |
| Border radius buttons/boxes | 6px | |
| Border radius outer | 8px | |

---

## Header

- Logo icon: `https://www.makalah.ai/logo/logo-color-darkmode.png` (24x24)
- Brand text: `https://www.makalah.ai/logo-makalah-ai-white.svg` (auto height ~18px)
- Fallback `alt="Makalah AI"` pada kedua image
- Separator: 1px solid #334155, padding-bottom 16px, margin-bottom 24px

## Footer

- Separator: 1px solid #334155, margin-top 24px, padding-top 16px
- Line 1: `© 2026 Makalah AI · makalah.ai` (linked)
- Line 2: `Email otomatis dari sistem Makalah AI. Tidak perlu dibalas.`
- Font: mono, 10px, slate-500, center

---

## Light-Safe Techniques

- Semua teks punya cukup kontras di kedua mode
- `alt` text di semua image (logo + brand)
- Background color di `<td>` bukan cuma `<div>` (beberapa client strip div bg)
- CTA button pakai `<a>` dengan inline styles, bukan `<button>`

---

## Per-Email Content

### 1. Verifikasi Email
```
Subject: Verifikasi Email — Makalah AI

Halo!
Klik tombol di bawah untuk verifikasi email kamu.
[VERIFIKASI EMAIL]  ← emerald CTA
Link berlaku selama 24 jam.
Kalau kamu tidak merasa mendaftar, abaikan email ini.
```

### 2. Magic Link
```
Subject: Masuk ke Makalah AI

Halo!
Klik tombol di bawah untuk masuk ke Makalah AI.
[MASUK SEKARANG]  ← emerald CTA
Link berlaku selama 5 menit. Jangan bagikan link ini.
```

### 3. Reset Password
```
Subject: Reset Password — Makalah AI

Halo!
Kamu meminta reset password. Klik tombol di bawah.
[RESET PASSWORD]  ← emerald CTA
Link berlaku selama 1 jam.
Kalau kamu tidak meminta ini, abaikan email ini.
```

### 4. 2FA OTP
```
Subject: Kode Verifikasi 2FA — Makalah AI

Masukkan kode berikut untuk menyelesaikan login:
┌─────────────────────────┐
│      1 2 3 4 5 6        │  ← dashed border box (#475569)
└─────────────────────────┘
Kode berlaku selama 5 menit. Jangan bagikan kode ini ke siapapun.
```

### 5. Signup Success
```
Subject: Pendaftaran Berhasil — Makalah AI

Halo!
Pendaftaran akun kamu berhasil. Sekarang kamu bisa mulai menyusun paper dengan Makalah AI.
[MULAI SEKARANG]  ← emerald CTA → /get-started
```

### 6. Waitlist Confirmation (pindah dari resend.ts)
```
Subject: Pendaftaran Waiting List Berhasil — Makalah AI

Halo, {firstName}!
Email kamu ({email}) sudah terdaftar di waiting list.
Saat giliran kamu tiba, kami akan mengirim email undangan berisi link pendaftaran.
Klik link tersebut untuk membuat akun — bisa pakai Google atau email dan password.

⚠ Periksa folder Inbox, Spam, Update, atau Promosi — email kami bisa masuk ke folder mana saja.
```
(Tidak ada CTA button — informational only)

### 7. Waitlist Invite
```
Subject: Undangan Bergabung — Makalah AI

Halo, {firstName}!
Giliran kamu sudah tiba! Klik tombol di bawah untuk mendaftar di Makalah AI.
Kamu bisa pilih masuk lewat Google atau daftar dengan email dan password.
[DAFTAR SEKARANG]  ← emerald CTA → /sign-up?params
Data kamu sudah kami siapkan di form pendaftaran — tinggal pilih metode masuk.
Kalau kamu tidak merasa mendaftar di Makalah AI, abaikan email ini.
```

### 8. Admin Notification
```
Subject: [Waitlist] {Event}: {name} ({email})

[EVENT BADGE]  ← colored badge (amber/sky/emerald per event type)
{description}
┌─────────────┐
│ WAKTU       │  ← info box
│ {timestamp} │
└─────────────┘
[BUKA DASHBOARD]  ← secondary button (slate-700)
```

---

## Caller Refactor

### Waitlist Confirmation Email

**Sebelum:** `WaitlistForm.tsx` → server action `actions.ts` → `src/lib/email/resend.ts` (Resend SDK)

**Sesudah:** `convex/waitlist.ts` register mutation → `ctx.scheduler.runAfter(0, internal.waitlist.sendConfirmationEmail, { email, firstName })` → `convex/authEmails.ts` sendWaitlistConfirmationEmail (fetch API)

Ini menghilangkan kebutuhan `actions.ts` dan `resend.ts` sepenuhnya.

### Files Summary

| File | Action |
|------|--------|
| `convex/authEmails.ts` | Modify — add emailLayout(), upgrade all templates, add sendWaitlistConfirmationEmail() |
| `convex/waitlist.ts` | Modify — add sendConfirmationEmail internal action, remove import from WaitlistForm |
| `src/components/auth/WaitlistForm.tsx` | Modify — remove sendConfirmationEmail call (now handled by Convex scheduler) |
| `src/lib/email/resend.ts` | Delete |
| `src/app/(auth)/waitinglist/actions.ts` | Delete |
