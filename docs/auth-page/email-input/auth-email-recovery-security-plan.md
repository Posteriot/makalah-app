# Auth Email Recovery Security Plan

## Ringkasan Masalah
Flow `Magic Link` dan `Forgot Password` perlu memberi tahu user saat email salah/tidak terdaftar agar UX jelas.  
Namun, jika pesan itu dibuka tanpa kontrol, endpoint akan rentan **email enumeration** (attacker bisa menebak email valid).

Dokumen ini menetapkan arsitektur aman agar:
- user tetap mendapat feedback eksplisit saat email salah,
- risiko enumeration ditekan kuat lewat guard berlapis.

## Tujuan
1. User bisa tahu saat email yang dimasukkan tidak terdaftar.
2. Cegah penyalahgunaan endpoint precheck oleh bot/attacker.
3. Hindari bocor PII di logs/storage.
4. Pertahankan UX tetap cepat dan konsisten.

## Non-Tujuan
1. Tidak mengubah flow login email+password.
2. Tidak mengubah desain auth card secara besar.
3. Tidak mengubah provider auth utama (BetterAuth + Convex).

## Keputusan Arsitektur

## 0) Lock Provider CAPTCHA
- Provider terpilih: **Cloudflare Turnstile**.
- Paket: **Free plan** (**locked**).
- Alasan:
  - friction UX rendah,
  - integrasi langsung didukung plugin `captcha` dari BetterAuth,
  - cukup kuat untuk hardening anti-enumeration pada scope ini.

## 0.1) Scope Fitur yang Diubah
- Route yang terdampak:
  - `/sign-in` mode `magic-link`
  - `/sign-in` mode `forgot-password`
- Out of scope:
  - flow `sign-up`
  - flow `waiting-list`
  - flow login `email + password`

## 1) Hapus jalur yang tidak aman
- Hentikan penggunaan query publik yang langsung mengecek keberadaan email user auth.
- Semua cek email recovery wajib lewat endpoint server yang dilindungi.

## 2) Tambah endpoint precheck aman (server-only)
- Endpoint baru: `POST /api/auth/email-recovery-precheck`.
- Input:
  - `email`
  - `intent` (`magic-link` | `forgot-password`)
  - `captchaToken`
- Output:
  - `ok: true, status: "registered"` → lanjut kirim link
  - `ok: false, code: "EMAIL_NOT_REGISTERED"` → tampilkan error eksplisit
  - `ok: false, code: "RATE_LIMITED"` → tampilkan cooldown
  - `ok: false, code: "CAPTCHA_FAILED"` → minta ulang challenge
  - `ok: false, code: "SERVICE_UNAVAILABLE"` → hard block saat konfigurasi/security backend tidak siap

## 3) Guard keamanan berlapis
1. **Cloudflare Turnstile wajib** sebelum precheck dieksekusi.
2. **Rate limit** per kombinasi:
   - IP hash,
   - email hash,
   - IP+email hash.
3. **Cooldown/block window** saat gagal berulang.
4. **Delay terkontrol + jitter kecil** agar timing lebih sulit dianalisis.
5. **Audit logging minimal** (tanpa email mentah).

## 3.1) Parameter Keamanan Default (Locked for v1)
1. Window rate limit: `10 menit`.
2. Max attempts per `ip+email+intent`: `5` per window.
3. Max attempts per `emailHash`: `10` per window.
4. Max attempts per `ipHash`: `30` per window.
5. Cooldown bertingkat:
   - pelanggaran 1: `5 menit`
   - pelanggaran 2: `15 menit`
   - pelanggaran >=3: `60 menit`
6. Jitter respons: `150-350ms` setelah precheck diproses.

## 4) Data minimization
- Jangan simpan email mentah/IP mentah untuk limiter.
- Simpan hash (SHA-256) dari:
  - email ternormalisasi,
  - IP,
  - key gabungan (`ip|email|intent`).
- Log payload sensitif wajib redacted (tanpa email/IP mentah).

## 4.1) Fail Mode Policy
1. Jika verifikasi Turnstile gagal/invalid/expired:
   - return `CAPTCHA_FAILED`.
2. Jika endpoint Turnstile timeout/unavailable:
   - fail closed untuk precheck (tidak lanjut cek email),
   - return `CAPTCHA_FAILED` dengan copy yang sama (tanpa detail infrastruktur).
3. Jika limiter error:
   - fail closed (jangan lanjut ke cek email).
4. Jika feature flag precheck nonaktif atau konfigurasi kunci server tidak lengkap:
   - fail closed, return `SERVICE_UNAVAILABLE` (jangan lanjut ke auth reset/magic link).

## 5) Validasi sumber kebenaran user
- Cek keberadaan email di tabel user BetterAuth via internal component adapter (`components.betterAuth.adapter.findOne`).
- Normalisasi email (`trim().toLowerCase()`) sebelum query.

## Desain UX Final

## Pesan validasi email salah (eksplisit)
`Email belum terdaftar. Cek lagi penulisan email atau daftar akun terlebih dahulu.`

## Pesan rate limit
`Terlalu banyak percobaan. Coba lagi dalam beberapa menit.`

## Pesan captcha gagal
`Verifikasi keamanan gagal. Coba lagi.`

## Pesan service unavailable
`Layanan verifikasi keamanan sedang tidak tersedia. Coba lagi sebentar.`

## Alur Frontend
1. User submit form `Magic Link` / `Forgot Password`.
2. Frontend ambil token Turnstile (`captchaToken`).
3. Frontend panggil `POST /api/auth/email-recovery-precheck`.
4. Server verifikasi token ke endpoint Turnstile `siteverify`.
5. Jika verifikasi lolos, lanjut precheck email + guard limiter.
6. Jika `registered` → panggil `signIn.magicLink` / `authClient.requestPasswordReset`.
7. Jika `EMAIL_NOT_REGISTERED` → tampilkan error eksplisit.
8. Jika `RATE_LIMITED`/`CAPTCHA_FAILED`/`SERVICE_UNAVAILABLE` → tampilkan error sesuai code.

## Kebutuhan Konfigurasi Environment
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (client).
- `TURNSTILE_SECRET_KEY` (server-only).
- `AUTH_EMAIL_PRECHECK_ENABLED` (`true|false`).

## Rencana Rollout
1. Implement behind feature flag: `AUTH_EMAIL_PRECHECK_ENABLED=true`.
2. Uji manual + staging.
3. Aktifkan di production.
4. Monitor metric:
   - precheck hits,
   - fail ratio,
   - rate-limited ratio,
   - request volume per IP hash.

## Risiko dan Mitigasi
1. **False positive rate limit** untuk user kantor/shared IP.
   - Mitigasi: limit kombinasi IP+email, bukan IP saja.
2. **CAPTCHA friction UX**.
   - Mitigasi: trigger challenge hanya saat submit, copy jelas.
3. **Leak lewat logging**.
   - Mitigasi: redact payload sensitif + hanya log hash.
4. **Konsistensi visual Turnstile terbatas**.
   - Mitigasi: gunakan layout width `flexible` dan spacing host container.
   - Catatan: border/radius internal Turnstile tidak bisa dioverride penuh karena dirender di cross-origin iframe.

## Definition of Done
1. User dapat pesan eksplisit saat email tidak terdaftar.
2. Endpoint precheck dilindungi captcha + rate limit + cooldown.
3. Tidak ada query publik langsung untuk cek email registered.
4. Lint/build lulus.
5. Dokumen notifikasi auth diupdate sesuai perilaku baru.
