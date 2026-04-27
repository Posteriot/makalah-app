# Cloudflare Turnstile: Invisible Bot Protection

Makalah AI menggunakan **Cloudflare Turnstile** untuk melindungi aplikasi dari serangan bot, *spam*, dan *brute-force* tanpa mengganggu kenyamanan pengguna dengan tantangan CAPTCHA tradisional yang menjengkelkan.

## 1. Implementasi Frontend (TurnstileWidget)

Widget Turnstile dibungkus dalam komponen React khusus yang terletak di `src/components/auth/TurnstileWidget.tsx`. Komponen ini menangani siklus hidup widget secara otomatis.

- **Explicit Rendering**: Menggunakan metode `render` eksplisit untuk kontrol yang lebih baik atas penempatan dan waktu pemuatan.
- **Flexible Size**: Menggunakan `size: "flexible"` untuk memastikan widget menyesuaikan dengan tata letak formulir autentikasi yang responsif.
- **Theme Support**: Widget secara dinamis menyesuaikan dengan tema aplikasi (gelap/terang) melalui properti `theme`.
- **Automatic Script Injection**: Sistem secara otomatis menyuntikkan skrip Cloudstile ke dalam `<head>` dokumen jika belum tersedia.

## 2. Verifikasi Sisi Server (Site Verify)

Setiap token yang dihasilkan oleh widget di sisi *client* harus divalidasi di sisi server sebelum tindakan sensitif diproses. Logika ini diimplementasikan dalam fungsi `verifyTurnstileToken`.

- **Endpoint**: Validasi dilakukan melalui POST ke `https://challenges.cloudflare.com/turnstile/v0/siteverify`.
- **Secret Validation**: Menggunakan `TURNSTILE_SECRET_KEY` yang tersimpan aman di variabel lingkungan.
- **IP Binding**: Sistem menyertakan IP pengguna (`remoteip`) dalam permintaan verifikasi untuk meningkatkan keamanan dan mencegah serangan *replay*.

## 3. Kasus Penggunaan Utama

Cloudflare Turnstile diaktifkan pada titik-titik krusial di Makalah AI:
- **Autentikasi (Sign-In/Sign-Up)**: Melindungi alur masuk dan pendaftaran dari pendaftaran massal oleh bot.
- **Email Recovery Precheck**: Digunakan pada rute `src/app/api/auth/email-recovery-precheck/route.ts` untuk mencegah bot memindai database guna mengecek keberadaan email tertentu (proteksi privasi).
- **Password Reset**: Mengamankan alur pengaturan ulang kata sandi.

## 4. Keamanan & Resilience

- **Timeout Management**: Permintaan verifikasi ke Cloudflare memiliki batas waktu (*timeout*) 5 detik untuk mencegah pemblokiran rute API jika terjadi masalah jaringan.
- **Graceful Failure**: Jika verifikasi gagal (token tidak valid atau kedaluwarsa), sistem akan mengembalikan kode error `CAPTCHA_FAILED` yang kemudian ditampilkan kepada pengguna sebagai pesan instruksi untuk mencoba lagi.

---
**Rujukan Kode:**
- [src/components/auth/TurnstileWidget.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/auth/TurnstileWidget.tsx): Implementasi komponen UI Turnstile.
- [src/app/api/auth/email-recovery-precheck/route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/auth/email-recovery-precheck/route.ts): Contoh implementasi validasi server-side.
