# Dokumentasi Auth (UI Lama)

## Cakupan
- Gue scan UI/components auth (Masuk, Daftar, Lupa Password, Reset Password) di `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur UI, label, status, serta styling/typography di desain lama.

## Titik masuk halaman
- `.development/knowledge-base/ui-old-makalah/app/auth/page.tsx` - halaman auth utama (Masuk/Daftar).
- `.development/knowledge-base/ui-old-makalah/app/auth/forgot-password/page.tsx` - halaman Lupa Password.
- `.development/knowledge-base/ui-old-makalah/app/auth/reset-password/page.tsx` - halaman Reset Password.
- `.development/knowledge-base/ui-old-makalah/app/auth/waiting-list/page.tsx` - halaman Daftar Tunggu (ada di folder auth).

## Struktur UI utama
1) Halaman auth utama (Masuk/Daftar)
- Pembungkus: `min-h-screen` dengan latar `hero-vivid hero-grid-thin` + lapisan `bg-black/20`.
- Card: `Card` dengan `p-8 border-border bg-card shadow-lg`.
- Identitas merek: `BrandLogo` variant `white` size `lg`.
- Judul: "Masuk ke Akun" atau "Daftar Akun Baru" (font-heading).

2) Mode Masuk
- Kolom:
  - Label "Email" + placeholder "nama@email.com" (ikon `Mail`).
  - Label "Password" + placeholder "Masukkan password" (ikon `Lock` + toggle `Eye/EyeOff`).
- Checkbox: "Ingat saya".
- Tautan: "Lupa password?" menuju `/auth/forgot-password`.
- Tombol submit:
  - Label normal: "Masuk".
  - Saat proses: "Memverifikasi..." (ikon `Loader2`).

3) Mode Daftar (2 tahap)
- Tahap 1:
  - Kolom: "Email", "Password", "Konfirmasi Password".
  - Tombol: "Selanjutnya →" (saat proses: "Memvalidasi...").
- Tahap 2:
  - Kolom: "Nama Depan", "Nama Belakang".
  - Pilihan: "Predikat" dengan opsi "Pilih predikat", "Mahasiswa", "Peneliti".
  - Tombol: "Daftar Akun" (saat proses: "Mendaftar...").
  - Tautan bawah: "← Kembali" dan "Masuk sekarang".

4) Notifikasi dan status di halaman auth
- Alert sukses verifikasi:
  - Teks: "Email Anda telah berhasil diverifikasi! Silakan login dengan kredensial Anda.".
  - Tombol: "Kirim Ulang Email Verifikasi".
- Alert akun tidak terdaftar/nonaktif:
  - Teks: "Email yang Anda masukkan belum terdaftar atau akun nonaktif. Silakan daftar baru.".
  - Tombol: "Daftar Sekarang".
- Alert error umum: menampilkan teks error dari auth.
- Panel kuning resend verifikasi:
  - Teks: "Email belum terverifikasi. Cek inbox atau kirim ulang.".
  - Tombol: "Kirim Ulang Email Verifikasi".
- Validasi tahap daftar memakai `alert()`:
  - "Semua field di slide 1 harus diisi".
  - "Password tidak cocok".
  - "Password minimal 6 karakter".
  - "Format email tidak valid".
  - "Semua field di slide 2 harus diisi".

5) Halaman Lupa Password
- Pembungkus: sama dengan halaman auth (hero-vivid + lapisan gelap).
- Card: `Card` dengan `p-6`.
- Judul status:
  - Normal: "Lupa Password".
  - Sukses: "Email Terkirim".
- Subjudul status:
  - Normal: "Masukkan email untuk mendapatkan link reset password".
  - Sukses: "Kami telah mengirim link reset password ke email Anda".
- Form normal:
  - Kolom "Email" (placeholder "nama@email.com", ikon `Mail`).
  - Tombol: "Kirim Link Reset" (saat proses: "Mengirim...").
  - Teks error: "Email diperlukan" atau pesan error dari Supabase.
- Status sukses:
  - Pesan: "Periksa inbox email {email}".
  - Hint: "Tidak menerima email? Periksa folder spam atau coba kirim ulang".
  - Tombol: "Kirim Ulang".
- Tautan bawah: "Kembali ke halaman masuk" (ikon `ArrowLeft`).

6) Halaman Reset Password
- Layout sederhana tanpa Card dan tanpa latar hero.
- Judul: "Set New Password".
- Status loading:
  - "Verifying reset link..." dan "Please wait...".
- Status error:
  - Pesan error (contoh: "Session expired. Please request a new password reset.").
  - Tautan: "Request new reset link" ke `/auth/forgot-password`.
- Form reset:
  - Label: "New Password:" dan "Confirm Password:".
  - Placeholder: "Enter new password" dan "Confirm new password".
  - Kontrol tampil/sembunyi: ikon teks "🙈" dan "👁️".
  - Tombol: "Update Password" (saat proses: "Updating...").
  - Pesan sukses: "Password updated successfully! Please login with your new password...".
- Tautan bawah: "Back to Login" ke `/auth`.
- Styling pakai gaya inline (tanpa class `Card`/`hero-vivid`).

7) Halaman Daftar Tunggu
- Pembungkus: `min-h-screen` dengan latar `hero-vivid hero-grid-thin` + lapisan `bg-black/20`.
- Card: `Card` dengan `p-8 border-border bg-card shadow-lg`.
- Identitas merek: `BrandLogo` variant `white` size `lg`.
- Judul: "Daftar Tunggu".
- Subjudul: "Masukkan email untuk ikut uji coba".
- Alert sukses: "Email kamu masuk daftar tunggu. Makasih!".
- Alert error (contoh):
  - "Format email kurang tepat.".
  - "Email sudah terdaftar di daftar tunggu.".
  - "Lagi gangguan, coba lagi ya.".
  - "Sedang gangguan, coba lagi nantu.".
- Form:
  - Label "Email" + placeholder "nama@email.com" (ikon `Mail`).
  - Honeypot input tersembunyi: `name="website"`.
  - Tombol: "Daftar" (saat proses: "Mendaftar...").
- Tautan bawah: "Masuk sekarang".

8) Rute callback auth (tanpa UI)
- Tidak ada teks UI yang ditampilkan.
- Redirect dengan query `error` bila gagal:
  - `Authentication failed`
  - `Failed to authenticate`
  - `invalid_callback`

## Komponen UI yang dipakai
- `BrandLogo`.
- `Button`.
- `Card`.
- `Input`.
- `Label`.
- `Checkbox`.
- `Alert` + `AlertDescription`.
- `WaitingListCard`.

## Ikon (lucide-react)
- Masuk/Daftar: `Mail`, `Lock`, `Eye`, `EyeOff`, `Loader2`, `CheckCircle2`, `XCircle`.
- Lupa Password: `Mail`, `ArrowLeft`, `Loader2`.
- Daftar Tunggu: `Mail`, `CheckCircle2`, `XCircle`, `Loader2`.

## Styling & typography
- Font global dari `.development/knowledge-base/ui-old-makalah/app/layout.tsx`:
  - `Inter` -> `--font-sans`, `Nunito_Sans` -> `--font-heading`, `Victor_Mono` -> `--font-hero`, `JetBrains_Mono` -> `--font-mono`.
- Class global dari `.development/knowledge-base/ui-old-makalah/app/globals.css`:
  - `hero-vivid`, `hero-grid-thin` untuk latar auth.
  - `space-ui-tight`, `space-ui-medium`, `space-ui-loose` untuk jarak antar elemen.
  - `text-destructive` untuk teks error.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
