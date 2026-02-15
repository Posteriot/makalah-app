# Auth Notifications Inventory

## Ruang Lingkup
Dokumen ini mencatat seluruh notifikasi yang tampil ke user di area auth berdasarkan scan kode berikut:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- `src/app/(auth)/waiting-list/page.tsx`
- `src/components/auth/WaitlistForm.tsx`
- `src/app/api/auth/email-recovery-precheck/route.ts` (sumber code notifikasi precheck email recovery)

Status scan:
- `src/components/auth/AccountLinkingNotice.tsx` mengandung toast control, tapi saat ini belum dipakai oleh route di `src/app/(auth)`.

## Kategori Channel Notifikasi
- `Toast`: notifikasi ephemeral via `sonner`.
- `Inline Error`: pesan error di dalam form.
- `Status Panel`: panel/layar status setelah aksi tertentu.
- `Status Badge`: badge informasi state.

## Pola Styling Notifikasi

### A) Toast Global (`sonner`)
Karakter styling toast di area auth mengikuti konfigurasi global aplikasi, bukan di-override per halaman auth.

| Elemen | Pola Styling | Sumber |
|---|---|---|
| Container toaster | `className="toaster group"` | `src/components/ui/sonner.tsx:14` |
| Toast item | `group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg` | `src/components/ui/sonner.tsx:18` |
| Description text | `group-[.toast]:text-muted-foreground` | `src/components/ui/sonner.tsx:19` |
| Action button | `group-[.toast]:bg-primary group-[.toast]:text-primary-foreground` | `src/components/ui/sonner.tsx:21` |
| Cancel button | `group-[.toast]:bg-muted group-[.toast]:text-muted-foreground` | `src/components/ui/sonner.tsx:23` |

Catatan mounting:
- `Toaster` dirender global di root layout, jadi semua route auth mewarisi style toast yang sama: `src/app/layout.tsx:40`.

### B) Inline Error (Form Error)
Ada dua varian utama di auth:

| Varian | Pola Styling | Karakter Visual | Sumber |
|---|---|---|---|
| Inline error box (sign-in) | `rounded-action border border-destructive/40 bg-destructive/60 px-3 py-2 text-xs text-slate-100 font-mono` | Kontras tinggi (slate over rose) agar lebih mudah dibaca | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:439`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:503`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:565`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:637` |
| Inline error box (sign-up) | `rounded-action border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive font-mono` | Box merah lembut dengan border + teks monospaced kecil | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:291` |
| Inline error text sederhana (waiting-list) | `text-sm text-destructive` | Error ringan tanpa box | `src/components/auth/WaitlistForm.tsx:102` |

Catatan:
- Khusus sign-in, hint recovery sekarang disatukan ke teks error (tanpa tombol/link di dalam box error).

### C) Status Panel (Success/Info/Warning State)
Semua state panel memakai layout terpusat dengan jarak konsisten.

| State | Pola Styling Utama | Ikon & Warna | Sumber |
|---|---|---|---|
| Email sent / reset sent / verify email | `text-center space-y-4 w-full` + heading `text-narrative text-lg font-medium` + body `text-sm text-muted-foreground` | Ikon `Mail` `h-12 w-12 text-primary mx-auto` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:550`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:552`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:328`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:330` |
| Reset success | Pola container sama (`text-center space-y-4 w-full`) | Ikon `Lock` `h-12 w-12 text-success mx-auto` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:588`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:589` |
| Waitlist success | `w-full flex flex-col items-center justify-center py-8 text-center` | Lingkaran sukses `w-16 h-16 rounded-full bg-success/10` + ikon `CheckCircle text-success` | `src/components/auth/WaitlistForm.tsx:68`, `src/components/auth/WaitlistForm.tsx:69`, `src/components/auth/WaitlistForm.tsx:70` |
| Invalid invite token | `w-full flex flex-col items-center justify-center py-8 text-center` | Lingkaran warning `w-16 h-16 rounded-full bg-destructive/10` + ikon `WarningCircle text-destructive` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:74`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:75`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:76` |

### D) Status Badge

| Badge | Pola Styling | Sumber |
|---|---|---|
| `UNDANGAN VALID` | Wrapper `flex items-center gap-2 text-success`, teks badge `font-mono text-xs font-bold uppercase tracking-widest` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:49`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:51` |

### E) Loading/Validating State sebagai Notifikasi Progres

| State | Pola Styling | Sumber |
|---|---|---|
| Validasi token undangan berjalan | Card title/subtitle + skeleton `animate-pulse` dengan blok `h-10 bg-muted rounded-md` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:354`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:355`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:357` |
| Submit waitlist berjalan | CTA menampilkan spinner `h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin` + label `MENDAFTAR...` | `src/components/auth/WaitlistForm.tsx:111`, `src/components/auth/WaitlistForm.tsx:113`, `src/components/auth/WaitlistForm.tsx:114` |

### F) Konsistensi Typography & Token
- Typography notifikasi cenderung pakai `font-mono` untuk pesan operasional dan CTA status.
- Hierarki teks:
  - Judul state: `text-lg`.
  - Pesan penjelas: `text-sm` atau `text-xs`.
  - Error box: `text-xs`.
- Token warna:
  - Error: `destructive` (teks, border, background tint).
  - Success: `success`.
  - Info/neutral: `muted-foreground`, `background`, `border-border`.

## Inventory Notifikasi

### 1) Route: `/sign-in`
Sumber: `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

| Channel | Trigger | Teks Notifikasi | Sumber |
|---|---|---|---|
| Toast | Exception umum saat submit email/password, magic link, forgot password, reset password | `Terjadi kesalahan. Silakan coba lagi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:157`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:217`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:262`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:297` |
| Toast | Gagal OAuth Google | `Gagal masuk dengan Google. Silakan coba lagi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:173` |
| Inline Error | Email/password kosong di form sign-in | `Email dan password wajib diisi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:119` |
| Inline Error | Kredensial salah (deteksi regex invalid/incorrect credentials) | `Email atau password tidak cocok.\nCoba gunakan fitur "Lupa password?" atau "Magic Link" untuk masuk.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:135` |
| Inline Error + Link | OAuth Google ditolak karena implicit signup dimatikan (`error=signup_disabled`) | `Akun Google ini belum terdaftar di Makalah.\nSilakan daftar dulu, lalu masuk kembali.` dengan kata `daftar` sebagai link inline (underline + hover) ke `/sign-up?redirect_url=...` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` |
| Inline Error (dinamis) | Error dari SDK sign-in email | `msg || "Terjadi kesalahan."` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:167` |
| Inline Error | Email kosong di magic link / forgot password | `Email wajib diisi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:184`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:229` |
| Inline Error | CAPTCHA belum diselesaikan saat mode recovery aktif | `Selesaikan verifikasi keamanan terlebih dahulu.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:189`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:234` |
| Inline Error (precheck) | Email tidak terdaftar saat precheck recovery | `Email belum terdaftar. Cek lagi penulisan email atau daftar akun terlebih dahulu.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:103`, `src/app/api/auth/email-recovery-precheck/route.ts:163`, `src/app/api/auth/email-recovery-precheck/route.ts:205` |
| Inline Error (precheck) | Rate limit precheck recovery | `Terlalu banyak percobaan. Coba lagi dalam beberapa menit.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:106`, `src/app/api/auth/email-recovery-precheck/route.ts:199` |
| Inline Error (precheck) | CAPTCHA invalid/expired/unavailable | `Verifikasi keamanan gagal. Coba lagi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:109`, `src/app/api/auth/email-recovery-precheck/route.ts:167`, `src/app/api/auth/email-recovery-precheck/route.ts:174`, `src/app/api/auth/email-recovery-precheck/route.ts:179`, `src/app/api/auth/email-recovery-precheck/route.ts:210` |
| Inline Error (precheck) | Fail-closed karena konfigurasi verifikasi/security tidak siap | `Layanan verifikasi keamanan sedang tidak tersedia. Coba lagi sebentar.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:144`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:224`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:274`, `src/app/api/auth/email-recovery-precheck/route.ts:126`, `src/app/api/auth/email-recovery-precheck/route.ts:130`, `src/app/api/auth/email-recovery-precheck/route.ts:183`, `src/app/api/auth/email-recovery-precheck/route.ts:218` |
| Inline Error (dinamis) | Error API magic link / forgot password / reset password | `apiError.message ?? "Terjadi kesalahan."` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:242`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:287`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:322` |
| Inline Error | Field reset password belum lengkap | `Semua field wajib diisi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:273` |
| Inline Error | Konfirmasi password tidak sama | `Password tidak cocok.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:277` |
| Inline Error | Password baru kurang dari 8 karakter | `Password minimal 8 karakter.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:281` |
| Status Panel | Magic link berhasil dikirim | `Cek Email Kamu` + `Link masuk sudah dikirim ke {email}. Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:672`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:674`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:676` |
| Status Panel | Reset link berhasil dikirim | `Cek Email Kamu` + `Link reset password sudah dikirim ke {email}. Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:692`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:694`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:696` |
| Status Panel | Reset password berhasil | `Password Berhasil Direset` + `Kamu sekarang bisa masuk dengan password baru.` | `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:710`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:712` |

Catatan tambahan judul state (`AuthWideCard`):
- `Cek Email Kamu` / `Link masuk sudah dikirim. Jika belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:221`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:222`)
- `Cek Email Kamu` / `Link reset password sudah dikirim. Jika belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:225`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:226`)
- `Password Direset` / `Password kamu berhasil diubah` (`src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:229`, `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx:230`)

### 2) Route: `/sign-up`
Sumber: `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx`

| Channel | Trigger | Teks Notifikasi | Sumber |
|---|---|---|---|
| Toast | Gagal OAuth Google | `Gagal mendaftar dengan Google. Silakan coba lagi.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:130` |
| Toast | Exception umum saat submit sign-up | `Terjadi kesalahan. Silakan coba lagi.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:185` |
| Inline Error | Nama depan kosong | `Nama depan wajib diisi.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:140` |
| Inline Error | Email kosong | `Email wajib diisi.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:144` |
| Inline Error | Password kosong | `Password wajib diisi.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:148` |
| Inline Error | Password kurang dari 8 karakter | `Password minimal 8 karakter.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:152` |
| Inline Error (dinamis) | Error dari SDK sign-up email | `result.error.message ?? "Terjadi kesalahan."` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:166` |
| Status Panel | Verifikasi email required | `Cek Email Kamu` + `Link verifikasi sudah dikirim ke {email}. Kalau email belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` + `Klik link di email untuk mengaktifkan akun kamu.` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:330`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:332`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:334`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:337` |
| Status Panel | Invite token sedang dicek | `Memvalidasi...` + `Sedang memeriksa undangan kamu` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:354`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:355` |
| Status Panel | Invite token invalid (card title/subtitle) | `Link Tidak Valid` + `Token undangan tidak dapat digunakan` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:370`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:371` |
| Status Panel | Invite token invalid (body) | `Link Tidak Valid` + `{error}` (fallback `Token tidak valid`) | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:79`, `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:373` |
| Status Badge | Invite token valid | `UNDANGAN VALID` | `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx:51` |

### 3) Route: `/waiting-list`
Sumber route: `src/app/(auth)/waiting-list/page.tsx`  
Sumber notifikasi utama: `src/components/auth/WaitlistForm.tsx`

| Channel | Trigger | Teks Notifikasi | Sumber |
|---|---|---|---|
| Inline Error | Format email tidak valid | `Format email tidak valid` | `src/components/auth/WaitlistForm.tsx:30` |
| Inline Error (dinamis) | Error dari mutation `register` | `err.message` | `src/components/auth/WaitlistForm.tsx:59` |
| Inline Error | Fallback error unknown | `Terjadi kesalahan. Silakan coba lagi.` | `src/components/auth/WaitlistForm.tsx:61` |
| Toast Success | Registrasi waitlist sukses | `Berhasil terdaftar!` + deskripsi `Cek email kamu untuk konfirmasi. Kalau belum masuk dalam 3-5 menit, cek folder Spam/Junk/Promosi.` | `src/components/auth/WaitlistForm.tsx:48`, `src/components/auth/WaitlistForm.tsx:49` |
| Status Panel | Setelah sukses submit | `Pendaftaran Berhasil!` + `Mengalihkan ke halaman utama...` | `src/components/auth/WaitlistForm.tsx:73`, `src/components/auth/WaitlistForm.tsx:76` |

## Ringkasan Cepat
Total notifikasi user-facing yang tercatat di area auth:
- `/sign-in`: 17 entri (termasuk pesan dinamis, status panel, dan link inline khusus signup Google yang ditolak)
- `/sign-up`: 13 entri (termasuk flow invite token)
- `/waiting-list`: 5 entri

Catatan: pesan dinamis (`err.message`, `apiError.message`, `result.error.message`, `msg`) bisa berubah tergantung respons backend/provider.

## Notifikasi Email Auth ke User

### Signup Berhasil
- Channel: Email transaksional (Resend, via Better Auth callback di Convex).
- Subject: `Pendaftaran Berhasil — Makalah AI`.
- Trigger:
  - Signup Google berhasil (user baru dibuat via OAuth, email sudah verified).
  - Signup email/password setelah user verifikasi email berhasil.
- Konten ringkas:
  - Konfirmasi pendaftaran berhasil.
  - Ajakan mulai menggunakan aplikasi.
  - Link `.../get-started`.
- Sumber:
  - `convex/auth.ts`
  - `convex/authEmails.ts`
