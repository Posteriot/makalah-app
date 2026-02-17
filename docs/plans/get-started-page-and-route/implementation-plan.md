# Implementasi Get-Started Gate untuk User Gratis (Per Login)

## 1) Ringkasan
Dokumen ini mendefinisikan rencana implementasi untuk memastikan halaman `/get-started` **selalu tampil 1x setiap kali user gratis login**, tanpa mengganggu navigasi menu setelah user melewati halaman tersebut.

Tujuan utamanya:
- mendorong upgrade secara konsisten lewat interstitial `/get-started`,
- memperbaiki kelemahan route/redirect yang saat ini ada,
- menjaga UX tetap stabil (tidak loop, tidak spam redirect, tidak mengunci user saat pindah menu).

## 2) Objektif Produk
- Setiap user dengan `subscriptionStatus = "free"` wajib melihat `/get-started` setelah login berhasil.
- Gate hanya berjalan **sekali per sesi login**.
- Setelah gate terlewati, user bebas navigasi menu tanpa dipaksa balik ke `/get-started`.
- User non-free tidak boleh terdampak oleh gate ini.

## 3) Temuan Masalah Saat Ini (Baseline)
1. Redirect intent bisa ketimpa fallback ke `/get-started` karena allowlist tidak sinkron dengan route aktual.
2. Timeout auth di `/get-started` berpotensi false-redirect ke `/sign-in` saat sesi lambat stabil.
3. Returning user bisa mengalami hop yang tidak perlu karena default callback auth ke `/get-started`.
4. Beberapa mutasi onboarding dipanggil tanpa penanganan error yang memadai.
5. Aksi di `/get-started` saat ini bisa terblokir jika mutasi gagal.

## 4) Prinsip Arsitektur (Guide + Guardrails)
1. Sumber kebenaran eligibility gate: `subscriptionStatus` user dari Convex (`free` vs non-free).
2. Scope trigger gate: hanya saat state auth berubah menjadi signed-in (event login/sesi baru).
3. Frekuensi gate: sekali per sesi login (berbasis fingerprint sesi, bukan flag permanen onboarding).
4. Anti-loop wajib: route `/get-started` tidak boleh mentrigger redirect ke dirinya sendiri.
5. Gate tidak mengubah akses menu setelah dilalui pada sesi login yang sama.
6. Semua redirect harus lewat validasi path aman (whitelist + sanitasi).
7. Perubahan harus backward-compatible untuk flow checkout dan flow auth yang sudah ada.

## 5) Desain Solusi (Rekomendasi Final)
### 5.1 Komponen Gate Baru
Tambahkan komponen client-side global, contoh: `FreeLoginGate`, dipasang di tree provider agar berlaku lintas halaman.

Tanggung jawab komponen:
- deteksi sesi login baru,
- cek user + subscription tier,
- cek marker "sudah tampil di sesi login ini",
- redirect ke `/get-started` bila eligible,
- set marker agar tidak redirect ulang saat user pindah menu.

### 5.2 Marker Sekali Per Login
Gunakan marker berbasis fingerprint sesi login (bukan `hasCompletedOnboarding`).

Aturan:
- sesi login baru => marker baru => gate aktif,
- sesi login sama => gate tidak aktif lagi.

### 5.3 Penataan Ulang Redirect Auth
Default callback auth dipindah ke route netral (`/chat`) agar user non-free tidak transit ke `/get-started` tanpa alasan.

Kemudian gate yang memutuskan:
- free => wajib ke `/get-started` (sekali per login),
- non-free => lanjut ke intent awal atau default route.

### 5.4 Hardening Halaman `/get-started`
Perubahan perilaku:
- hilangkan hard timeout yang berisiko false-redirect,
- aksi utama (`Skip`, upgrade) tidak boleh deadlock hanya karena mutasi gagal,
- handling error eksplisit untuk mutasi async.

### 5.5 Sinkronisasi Allowlist Redirect
`redirectAfterAuth` wajib sinkron dengan route aktif yang dipakai pricing/subscription saat ini agar intent valid tidak jatuh ke fallback yang salah.

## 6) Cakupan File Implementasi
### 6.1 File yang akan ditambah
- `src/components/onboarding/FreeLoginGate.tsx` (baru)
- `src/lib/utils/freeLoginGate.ts` (baru, helper marker/fingerprint/sanitasi state)

### 6.2 File yang akan diubah
- `src/app/providers.tsx` (mount gate global)
- `src/app/(onboarding)/get-started/page.tsx` (hardening flow)
- `src/lib/utils/redirectAfterAuth.ts` (sinkronisasi allowlist)
- `src/app/(auth)/sign-in/[[...sign-in]]/page.tsx` (default callback)
- `src/app/(auth)/sign-up/[[...sign-up]]/page.tsx` (default callback)
- `src/app/(auth)/verify-2fa/page.tsx` (default callback)
- `src/app/(onboarding)/checkout/bpp/page.tsx` (error handling onboarding completion)
- `src/app/(onboarding)/checkout/pro/page.tsx` (error handling onboarding completion)

## 7) Rencana Eksekusi Step by Step
### Phase 0 — Baseline & Safety Net
1. Catat baseline flow auth + redirect saat ini.
2. Definisikan skenario QA wajib (free login, paid login, redirect intent, checkout intent).
3. Pastikan tidak ada perubahan behavior sebelum gate diaktifkan.

Deliverable:
- baseline behavior matrix terdokumentasi.

### Phase 1 — Implementasi Gate Inti
1. Buat helper marker/fingerprint sesi login.
2. Buat komponen `FreeLoginGate` dengan anti-loop guard.
3. Mount komponen di provider global.

Deliverable:
- free user selalu diarahkan ke `/get-started` 1x saat login.

### Phase 2 — Perbaikan Route & Redirect
1. Ubah default callback auth ke `/chat`.
2. Sinkronkan allowlist `redirectAfterAuth` dengan route valid aktual.
3. Pastikan redirect intent tetap aman dan tidak open redirect.

Deliverable:
- non-free tidak transit ke `/get-started`.
- free tetap melewati `/get-started` sekali per login.

### Phase 3 — Hardening `/get-started` dan Checkout
1. Hapus/ubah mekanisme timeout auth yang rentan false-redirect.
2. Ubah aksi tombol di `/get-started` agar fail-safe pada mutasi.
3. Tambahkan penanganan error untuk auto-complete onboarding di checkout.

Deliverable:
- tidak ada deadlock UX pada aksi CTA.
- tidak ada unhandled promise yang kritikal.

### Phase 4 — Validasi & Bukti
1. Jalankan lint dan test yang relevan.
2. Jalankan test manual berbasis matrix.
3. Kumpulkan bukti hasil (status pass/fail + catatan edge case).

Deliverable:
- checklist QA terisi lengkap,
- ringkasan hasil validasi siap review.

## 8) Acceptance Criteria
1. User free login dari route manapun pasti melihat `/get-started` satu kali.
2. Setelah `/get-started` dilewati, user free bisa pindah menu tanpa redirect paksa.
3. Login berikutnya (sesi baru) untuk user free memunculkan gate lagi.
4. User non-free tidak diarahkan ke `/get-started`.
5. Tidak ada redirect loop.
6. Tidak ada false-redirect ke `/sign-in` akibat timeout semu.
7. Tidak ada unhandled async error kritikal pada onboarding completion.

## 9) Risiko & Mitigasi
1. Risiko: fingerprint sesi tidak stabil.
Mitigasi: fallback key strategy + validasi pada skenario multi-login.

2. Risiko: bentrok dengan intent checkout/pricing.
Mitigasi: urutan prioritas redirect yang eksplisit + test matrix intent.

3. Risiko: regressi pada flow auth lintas provider (email, google, OTP).
Mitigasi: uji semua jalur auth di phase validasi.

## 10) Rollback Plan
1. Feature gate via branch rollback (revert commit range implementasi gate).
2. Kembalikan default callback auth ke kondisi sebelum perubahan.
3. Nonaktifkan mount `FreeLoginGate` jika ditemukan bug blocking production.

## 11) Definition of Done
- Semua acceptance criteria terpenuhi.
- Checklist task dan QA di dokumen task tercentang.
- Perubahan route/auth/get-started tervalidasi dengan bukti uji.
- Siap diajukan PR dari worktree branch `feature/free-login-gate-get-started`.
