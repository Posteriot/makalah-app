# Auth Pages

Halaman autentikasi kustom berbasis BetterAuth untuk route group `(auth)`.

## Scope

README ini mendokumentasikan struktur, perilaku, data flow, dependensi, dan audit untuk file:

- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/waiting-list/actions.ts`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

## Struktur

```txt
(auth)/
├── layout.tsx                        # Shell auth + industrial grid background
├── waiting-list/
│   ├── page.tsx                      # Entry waiting list UI
│   └── actions.ts                    # Server actions kirim email waitlist/invite
├── sign-up/
│   └── [[...sign-up]]/page.tsx       # BetterAuth SignUp kustom + flow invite token
└── sign-in/
    └── [[...sign-in]]/page.tsx       # BetterAuth SignIn kustom
```

## Integrasi

- Semua route auth memakai `AuthLayout` sebagai wrapper visual konsisten.
- `waiting-list/page.tsx` merender komponen UI auth (`AuthWideCard` + `WaitlistForm`).
- `sign-in` dan `sign-up` merender form autentikasi kustom berbasis BetterAuth.

## Komponen dan Tanggung Jawab

- `layout.tsx`
  - Menyediakan container auth center-aligned.
  - Menambahkan pattern grid via inline style `linear-gradient` berbasis `--border-hairline`.

- `waiting-list/page.tsx`
  - Entry sederhana untuk form daftar waiting list.

- `waiting-list/actions.ts`
  - `sendConfirmationEmail(email)`: kirim email konfirmasi setelah user daftar.
  - `sendBulkInviteEmails(entries)`: kirim undangan paralel (`Promise.allSettled`) + hitung sukses/gagal.
  - `sendSingleInviteEmail(email, inviteToken)`: resend undangan tunggal.

- `sign-in/[[...sign-in]]/page.tsx`
  - Form sign-in kustom dengan email/password + social OAuth (Google, GitHub).
  - Redirect pasca-auth ke `/chat` atau URL dari query param.

- `sign-up/[[...sign-up]]/page.tsx`
  - Form sign-up kustom dengan email/password + social OAuth.
  - Support token undangan via query `invite`:
    - validasi token ke Convex (`api.waitlist.getByToken`)
    - state loading/invalid/valid.
  - Jika token valid, tampilkan konten kiri khusus (email undangan) sebelum form.

## Client dan Server Boundary

Client components (`"use client"`):
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

Server files:
- `src/app/(auth)/layout.tsx` (server component)
- `src/app/(auth)/waiting-list/actions.ts` (`"use server"`)

## Perilaku Ringkas

### Layout auth

- Wrapper utama: `min-h-dvh`, center content, `max-w-5xl`.
- Grid texture di background memakai 2 `linear-gradient` dan `backgroundSize: 48px 48px`.

### Sign-in

- Form kustom BetterAuth dengan email/password dan social login (Google, GitHub).
- Redirect pasca-auth ke `/chat` atau URL dari query param `redirect_url`.

### Sign-up

- Jika `invite` tidak ada: render signup normal.
- Jika `invite` ada:
  - `tokenValidation === undefined`: tampil skeleton validasi.
  - `!tokenValidation.valid`: tampil error card + CTA ke `/waiting-list`.
  - valid: tampil varian welcome card + info email undangan.
- Redirect pasca-auth ke `/chat` via `redirect_url` query param.

### Waiting-list actions

- Bulk invite memproses paralel via `Promise.allSettled` agar satu email gagal tidak membatalkan batch lain.
- Return payload agregat: `{ success, failed }`.

## Data dan Konstanta Penting

- `inviteToken` (query param `invite`) sebagai trigger flow undangan signup.
- `redirectUrl` di sign-up dipin saat initial render untuk menjaga redirect consistency.

## Styling Ringkas

Pola styling auth pages:

- Layout industrial grid dengan `--border-hairline`.
- Auth card dua kolom (branding kiri, form kanan) lewat `AuthWideCard`.
- Form kustom BetterAuth dengan styling Tailwind langsung.

Dokumen styling lengkap ada di:
- `docs/tailwind-styling-consistency/auth-page/auth-page-style.md`

## Dependencies

Core:
- `next/dynamic`
- `next/navigation`
- `next/link`
- `next/image`
- `next-themes`

Auth:
- `@/lib/auth-client` (`signIn`, `signUp`, `useSession`)

Data/backend:
- `convex/react`
- `@convex/_generated/api`
- `@/lib/utils/redirectAfterAuth`
- `@/lib/email/resend`

UI:
- `iconoir-react`
- `@/components/auth/AuthWideCard`
- `@/components/auth/WaitlistForm`

## Audit Temuan (Task 1)

1. `WaitlistForm` menandai sukses dulu walau email konfirmasi dikirim fire-and-forget, sehingga user bisa lihat sukses meskipun pengiriman email gagal.
- Bukti: `src/components/auth/WaitlistForm.tsx:41`, `src/components/auth/WaitlistForm.tsx:45`.

2. `WaitlistForm` tidak melakukan normalisasi email (`trim`/lowercase) sebelum validasi dan submit mutation.
- Bukti: `src/components/auth/WaitlistForm.tsx:28`, `src/components/auth/WaitlistForm.tsx:38`.

3. Timer redirect (`setTimeout`) pada `WaitlistForm` tidak punya cleanup saat unmount.
- Bukti: `src/components/auth/WaitlistForm.tsx:53`.

4. Custom `appearance.elements` di sign-in dan sign-up sangat besar dan duplicated, meningkatkan risiko drift styling jika salah satu diubah.
- Bukti: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:52`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:152`.

## Analisis Khusus Waitlist (Belum Sempurna)

Bagian ini fokus ke file waitlist yang masih punya gap implementasi.

1. `src/app/(auth)/waiting-list/actions.ts`: pengiriman bulk invite masih tanpa pembatas concurrency.
- Penjelasan: semua email diproses sekaligus lewat `Promise.allSettled(entries.map(...))`.
- Dampak: saat jumlah entry besar, request ke provider email bisa spike dan meningkatkan peluang throttling/rate-limit.
- Bukti: `src/app/(auth)/waiting-list/actions.ts:26`.

2. `src/app/(auth)/waiting-list/actions.ts`: kegagalan email belum punya retry/backoff.
- Penjelasan: jika satu kiriman gagal, fungsi hanya menaikkan counter `failed` dan log ke console.
- Dampak: transient error (network/provider) langsung dianggap gagal permanen dalam batch yang sama.
- Bukti: `src/app/(auth)/waiting-list/actions.ts:35`, `src/app/(auth)/waiting-list/actions.ts:40`.

3. `src/app/(auth)/waiting-list/actions.ts`: observability hasil gagal masih minim.
- Penjelasan: return hanya `{ success, failed }` tanpa daftar email/token yang gagal.
- Dampak: operator/admin harus menelusuri manual jika mau tahu entry mana yang perlu resend cepat.
- Bukti: `src/app/(auth)/waiting-list/actions.ts:21`, `src/app/(auth)/waiting-list/actions.ts:44`.

4. `src/app/(auth)/waiting-list/page.tsx`: page layer hanya delegasi UI tanpa handling state-level fallback.
- Penjelasan: page langsung render `AuthWideCard` + `WaitlistForm`, sementara seluruh state/error handling dipusatkan di komponen.
- Dampak: coupling tinggi ke `WaitlistForm`; kalau form berubah, page tidak punya fallback behavior sendiri.
- Bukti: `src/app/(auth)/waiting-list/page.tsx:8`, `src/app/(auth)/waiting-list/page.tsx:12`.

## Daftar File Terkait

- `src/app/(auth)/layout.tsx`
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/waiting-list/actions.ts`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/components/auth/AuthWideCard.tsx`
- `src/components/auth/WaitlistForm.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`
- `src/app/globals.css`
