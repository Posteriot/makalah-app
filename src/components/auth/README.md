# Auth Components

Komponen UI auth kustom yang dipakai oleh halaman `(auth)`.

## Scope

README ini mendokumentasikan:

- `src/components/auth/AuthWideCard.tsx`
- `src/components/auth/WaitlistForm.tsx`

## Struktur

```txt
auth/
├── AuthWideCard.tsx   # Shell 2-kolom untuk halaman auth (branding + form)
├── WaitlistForm.tsx   # Form daftar waiting list + submit ke Convex
└── README.md          # Dokumentasi ini
```

## Penggunaan

Contoh pemakaian di page route:

```tsx
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { WaitlistForm } from "@/components/auth/WaitlistForm"

<AuthWideCard
  title="Daftar Waiting List"
  subtitle="Bergabunglah dengan waiting list, dan dapatkan akses eksklusif lebih awal!"
>
  <WaitlistForm />
</AuthWideCard>
```

Integrasi utamanya ada di:
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

## Komponen dan Tanggung Jawab

- `AuthWideCard.tsx`
  - Menyusun layout auth dua kolom responsif.
  - Kiri: branding/pesan (atau `customLeftContent`).
  - Kanan: container untuk form/interaksi (BetterAuth custom form).
  - Memecah subtitle menjadi dua bagian (`subtitleLead` dan `subtitleEmphasis`) berdasarkan koma pertama.

- `WaitlistForm.tsx`
  - Form submit email untuk waiting list.
  - Validasi format email lokal.
  - Submit ke Convex mutation `api.waitlist.register`.
  - Trigger email konfirmasi via server action.
  - State machine sederhana: `idle` -> `loading` -> `success`.
  - Redirect ke homepage dengan query `waitlist=success`.

## Client dan Server Boundary

Kedua file adalah client component (`"use client"`).

Server action yang dipanggil dari `WaitlistForm`:
- `sendConfirmationEmail` di `src/app/(auth)/waiting-list/actions.ts`.

## Perilaku Ringkas

### AuthWideCard

- `title` dan `subtitle` punya fallback default.
- Jika `customLeftContent` diberikan, konten kiri sepenuhnya didelegasikan ke caller.
- Jika tidak, card menampilkan:
  - logo
  - heading
  - subtitle yang dipisah untuk emphasis visual.

### WaitlistForm

- Validasi awal via regex email.
- Saat submit sukses:
  - set state `success`
  - tampil toast sukses
  - redirect tertunda 1.5 detik.
- Saat gagal:
  - state kembali `idle`
  - tampilkan pesan error.

## Data dan Konstanta Penting

- `FormState`: `"idle" | "loading" | "success"`.
- Regex email: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.

## Styling

### AuthWideCard

- Wrapper: `max-w-4xl`, `rounded-lg`, `border`, dua kolom responsif.
- Left panel: `bg-slate-950` + diagonal stripe texture (inline style).
- Right panel: `bg-slate-100 dark:bg-slate-800` untuk area interaksi.

### WaitlistForm

- Input memakai primitive `Input` + icon prefix.
- Tombol submit memakai primitive `Button` dengan utility `hover-slash`.
- Success state memakai semantic token `success`.
- Error state memakai semantic token `destructive`.

Detail class/token lengkap ada di:
- `docs/tailwind-styling-consistency/auth-page/auth-page-style.md`

## Dependencies

- `next/link`
- `next/image`
- `next/navigation`
- `convex/react`
- `@convex/_generated/api`
- `iconoir-react`
- `sonner`
- `@/components/ui/input`
- `@/components/ui/button`
- `@/app/(auth)/waiting-list/actions`

## Audit Temuan (Task 1)

1. Pemisahan subtitle di `AuthWideCard` hanya berdasarkan koma pertama, jadi format kalimat lain bisa menghasilkan emphasis yang tidak sesuai niat copywriter.
- Bukti: `src/components/auth/AuthWideCard.tsx:23`.

2. `WaitlistForm` mengirim confirmation email secara fire-and-forget, sehingga UX tidak membedakan sukses daftar vs sukses kirim email.
- Bukti: `src/components/auth/WaitlistForm.tsx:41`.

3. `WaitlistForm` belum membersihkan timer redirect jika komponen unmount sebelum 1.5 detik.
- Bukti: `src/components/auth/WaitlistForm.tsx:53`.

## Analisis Khusus Waitlist (Belum Sempurna)

Bagian ini fokus pada gap implementasi `WaitlistForm` yang masih perlu dibereskan.

1. State sukses UI tidak menunggu status email konfirmasi.
- Penjelasan: setelah `registerMutation` sukses, komponen langsung set `formState = "success"` dan menampilkan toast sukses, sementara pengiriman email berjalan terpisah (`fire-and-forget`).
- Dampak: user bisa melihat alur berhasil, tapi email konfirmasi ternyata gagal dikirim.
- Bukti: `src/components/auth/WaitlistForm.tsx:41`, `src/components/auth/WaitlistForm.tsx:45`, `src/components/auth/WaitlistForm.tsx:48`.

2. Input email belum dinormalisasi sebelum submit.
- Penjelasan: validasi regex berjalan pada value mentah tanpa `trim()` atau normalisasi case.
- Dampak: potensi data email tidak konsisten (contoh spasi di ujung, variasi kapital) dan risiko duplikasi logic di backend.
- Bukti: `src/components/auth/WaitlistForm.tsx:28`, `src/components/auth/WaitlistForm.tsx:38`.

3. Redirect timer belum punya cleanup lifecycle.
- Penjelasan: `setTimeout` dipanggil saat sukses, tapi id timer tidak disimpan dan tidak dibersihkan saat komponen unmount.
- Dampak: berpotensi memicu update/redirect setelah komponen tidak aktif (leak kecil tapi nyata di long session/navigation cepat).
- Bukti: `src/components/auth/WaitlistForm.tsx:53`.

4. Validasi email masih satu lapis (client-only regex) sebelum mutation.
- Penjelasan: komponen hanya menampilkan satu pesan error umum dari `err.message` bila backend menolak.
- Dampak: UX error reason bisa kurang terarah untuk kasus spesifik (mis. email sudah terdaftar vs domain tidak valid).
- Bukti: `src/components/auth/WaitlistForm.tsx:28`, `src/components/auth/WaitlistForm.tsx:56`.

## Daftar File Terkait

- `src/components/auth/AuthWideCard.tsx`
- `src/components/auth/WaitlistForm.tsx`
- `src/app/(auth)/waiting-list/actions.ts`
- `src/app/(auth)/waiting-list/page.tsx`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/button.tsx`
- `src/app/globals.css`
