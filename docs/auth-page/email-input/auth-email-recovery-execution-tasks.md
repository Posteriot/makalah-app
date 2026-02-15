# Auth Email Recovery Execution Tasks

Dokumen ini adalah checklist eksekusi implementasi aman untuk validasi email pada flow `Magic Link` dan `Forgot Password`.

Referensi utama:
- `docs/auth-page/email-input/auth-email-recovery-security-plan.md`

---

## Lock Keputusan

- [x] Provider CAPTCHA: **Cloudflare Turnstile**
- [x] Paket: **Free plan**
- [x] Scope implementasi dokumen ini mengikuti keputusan lock di atas.
- [x] Scope route:
  - `/sign-in` mode `magic-link`
  - `/sign-in` mode `forgot-password`

---

## Task 0 - Baseline & Safety

- [x] Catat baseline:
  - `git status --short`
  - behavior saat ini untuk `magic-link` dan `forgot-password`.
- [x] Pastikan perubahan hanya scope auth email recovery.
- [x] Konfirmasi env key Turnstile tersedia:
  - `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
  - `TURNSTILE_SECRET_KEY`
- [x] Konfirmasi feature flag tersedia:
  - `AUTH_EMAIL_PRECHECK_ENABLED`
- [x] Lock parameter security v1:
  - window `10 menit`
  - max `ip+email+intent = 5`
  - max `emailHash = 10`
  - max `ipHash = 30`
  - cooldown `5m -> 15m -> 60m`
  - jitter `150-350ms`

Output bukti:
- Snapshot status git sebelum implementasi.

---

## Task 1 - Cabut Jalur Tidak Aman

Target file:
- `convex/users.ts`
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

Task:
- [x] Hapus query publik cek email terdaftar (jika ada).
- [x] Hapus pemanggilan direct query cek email dari client sign-in.
- [x] Pastikan flow tidak lagi bisa enumerate lewat query publik.

Acceptance:
- [x] Tidak ada function publik khusus cek email registered di `convex/users.ts`.
- [x] Tidak ada `FunctionReference` string untuk cek email registered di client auth.

---

## Task 2 - Tambah Data Model Rate Limit Recovery

Target file:
- `convex/schema.ts`
- file baru `convex/authRecovery.ts`

Task:
- [x] Tambah tabel limiter, contoh: `authRecoveryAttempts` dengan field:
  - `keyHash`
  - `emailHash`
  - `ipHash`
  - `intent`
  - `attemptCount`
  - `windowStartAt`
  - `blockedUntil`
  - `createdAt`
  - `updatedAt`
- [x] Tambah index yang dibutuhkan untuk baca/tulis cepat.
- [x] Implement helper mutation/query internal:
  - cek blokir aktif,
  - increment attempt,
  - reset window,
  - hitung cooldown.
  - apply jitter timer metadata.

Acceptance:
- [x] Schema valid.
- [x] Logic limiter idempotent dan aman untuk concurrent request ringan.

---

## Task 3 - Endpoint Precheck Aman

Target file baru:
- `src/app/api/auth/email-recovery-precheck/route.ts`

Task:
- [x] Implement `POST` endpoint dengan payload:
  - `email`
  - `intent`
  - `captchaToken`
- [x] Validasi format payload.
- [x] Verifikasi token ke endpoint Cloudflare Turnstile:
  - `https://challenges.cloudflare.com/turnstile/v0/siteverify`
- [x] Ambil IP dari request header secara konsisten.
- [x] Hash email + IP sebelum dipakai untuk limiter.
- [x] Apply limiter + cooldown.
- [x] Jika lolos guard, cek email di BetterAuth adapter (server-side).
- [x] Return contract response:
  - `registered`
  - `EMAIL_NOT_REGISTERED`
  - `CAPTCHA_FAILED`
  - `RATE_LIMITED`
  - `SERVICE_UNAVAILABLE`
- [x] Terapkan fail-closed:
  - Turnstile timeout/unavailable -> `CAPTCHA_FAILED`
  - limiter error -> `CAPTCHA_FAILED`
  - precheck disabled / missing server key -> `SERVICE_UNAVAILABLE` (hard block)

Acceptance:
- [x] Endpoint tidak mengembalikan detail sensitif.
- [x] Error code konsisten dan bisa dipakai frontend.

---

## Task 4 - Integrasi Frontend Sign-In

Target file:
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx`

Task:
- [x] Render widget Turnstile dan ambil token saat submit.
- [x] Pada submit `Magic Link`, panggil precheck endpoint dulu.
- [x] Pada submit `Forgot Password`, panggil precheck endpoint dulu.
- [x] Jika `EMAIL_NOT_REGISTERED`, tampilkan pesan eksplisit UX.
- [x] Jika `registered`, lanjut kirim link seperti biasa.
- [x] Jika `RATE_LIMITED`/`CAPTCHA_FAILED`/`SERVICE_UNAVAILABLE`, tampilkan pesan sesuai code.
- [x] Jaga loading state agar tidak double-submit.

Acceptance:
- [x] Email salah menampilkan pesan eksplisit.
- [x] Email benar lanjut ke alur kirim link.
- [x] UI tidak menabrak style notif yang sudah disepakati.

---

## Task 5 - Update Dokumentasi Notifikasi

Target file:
- `docs/auth-page/notifications/auth-notifications-inventory.md`

Task:
- [x] Tambah entri notifikasi baru untuk:
  - `EMAIL_NOT_REGISTERED`
  - `RATE_LIMITED`
  - `CAPTCHA_FAILED`
  - `SERVICE_UNAVAILABLE`
- [x] Sinkronkan sumber file/line.
- [x] Pastikan pola styling masih tercatat benar.

Acceptance:
- [x] Dokumen notifikasi up-to-date.

---

## Task 6 - Verification Matrix

- [x] Case A: email valid + token Turnstile valid + tidak kena limit.
  - Expected: masuk flow kirim link.
- [x] Case B: email tidak terdaftar.
  - Expected: pesan eksplisit email salah.
- [ ] Case C: token Turnstile invalid/expired.
  - Expected: pesan verifikasi keamanan gagal.
- [ ] Case C2: Turnstile endpoint timeout/unavailable.
  - Expected: fail-closed, user mendapat pesan verifikasi keamanan gagal.
- [ ] Case D: brute force berulang.
  - Expected: response rate-limited + cooldown.
- [ ] Case E: setelah cooldown lewat.
  - Expected: request bisa diproses lagi.

Output bukti:
- Checklist pass/fail per case.
- Bukti uji manual (15 Februari 2026):
  - Screenshot `08.13.49` dan `08.14.11`: `EMAIL_NOT_REGISTERED` tampil sesuai ekspektasi.
  - Screenshot `08.15.32`: email terdaftar berhasil masuk state `Cek Email Kamu`.
  - Screenshot `08.16.15` + log Convex unauthorized: fail-closed `SERVICE_UNAVAILABLE` tampil saat `CONVEX_INTERNAL_KEY` mismatch.

---

## Task 7 - Quality Gate

- [ ] `npm run lint`
- [ ] `npm run build` (jika memungkinkan)
- [ ] Smoke test auth routes:
  - `/sign-in` mode normal
  - mode magic-link
  - mode forgot-password
- [x] `npx eslint` targeted files scope auth recovery.

Catatan:
- Jika ada kendala network/tooling, catat eksplisit di laporan hasil.
- Hasil implementasi ini:
  - `npm run lint` belum bisa full-pass karena error existing non-scope di `src/app/(onboarding)/get-started/page.tsx:54` (`react-hooks/set-state-in-effect`).
  - `npm run build` gagal di issue existing non-scope `/checkout/bpp` (`useSearchParams` belum dibungkus `Suspense`).

---

## Task 8 - Commit Plan

- [ ] Commit 1: remove insecure path + schema limiter
- [ ] Commit 2: precheck endpoint + guard
- [ ] Commit 3: frontend integration + UX message
- [ ] Commit 4: docs sync

Acceptance:
- [ ] Setiap commit mudah di-review dan rollback.
