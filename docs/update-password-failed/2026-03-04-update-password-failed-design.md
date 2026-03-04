# Update Password Failed — Design Doc

**Tanggal:** 2026-03-04  
**Scope:** Halaman `Settings > Security` untuk create password (user Google) dan change password (user email/password)

---

## 1) Konteks & Fakta Terverifikasi

### Fakta A — Flow create password user Google saat ini pasti gagal

- UI memanggil `authClient.setPassword(...)` di:
  - `src/components/settings/SecurityTab.tsx`
- Endpoint `setPassword` di Better Auth tidak punya `path` (path `undefined`), sehingga tidak terdaftar ke router HTTP:
  - `node_modules/better-auth/dist/api/routes/update-user.mjs`
  - `node_modules/better-call/dist/router.mjs`
- Verifikasi runtime yang sudah dijalankan:
  - `POST /api/auth/set-password` => `404`

### Fakta B — Flow change password user email/password saat ini handling UI salah

- UI memanggil `await authClient.changePassword(...)` tanpa cek `error` payload:
  - `src/components/settings/SecurityTab.tsx`
- Better Fetch return shape default adalah `{ data, error }`, bukan throw exception:
  - `node_modules/@better-fetch/fetch/dist/index.js`
- Dampak: request gagal bisa tetap dianggap sukses oleh UI (toast sukses/redirect), walau password sebenarnya tidak berubah.

### Fakta C — Endpoint change password memang ada tapi protected

- `POST /change-password` terdaftar dan memakai `sensitiveSessionMiddleware`.
- Verifikasi runtime yang sudah dijalankan:
  - `POST /api/auth/change-password` => `401` saat tanpa sesi valid (expected).

---

## 2) Problem Statement

1. User Google tidak bisa membuat password dari Settings karena endpoint yang dipanggil UI tidak tersedia via HTTP route.
2. User email/password bisa mendapat sinyal sukses palsu saat ubah password karena response error tidak diproses benar di UI.

---

## 3) Tujuan & Non-Tujuan

### Tujuan

1. User Google bisa membuat password dari Settings dengan flow yang valid dan stabil.
2. User email/password hanya melihat sukses jika backend benar-benar sukses.
3. Pesan error di UI konsisten dan informatif.

### Non-Tujuan

1. Tidak mengubah arsitektur auth global.
2. Tidak mengubah schema Convex atau provider OAuth.
3. Tidak redesign visual besar; fokus reliability logic.

---

## 4) Opsi Solusi (2-3 Pendekatan)

## Opsi 1 (Rekomendasi Terbaik): Kembalikan flow Google ke reset-link + perbaiki error handling changePassword

**Ringkasan**
- Untuk akun tanpa credential (`hasPassword=false`), tombol action mengirim `requestPasswordReset` ke email user.
- User set password lewat flow reset password existing (`/sign-in` reset mode).
- Untuk change password, ubah handler supaya cek `{ error }` dulu; sukses hanya saat `error === null`.

**Kelebihan**
- Paling aman karena pakai endpoint yang sudah jelas tersedia dan sudah dipakai di halaman sign-in.
- Perubahan kecil, blast radius rendah.
- Selaras dengan histori perbaikan sebelumnya (pernah dipakai dan didokumentasikan).

**Kekurangan**
- UX user Google butuh langkah via email, bukan inline langsung.

## Opsi 2: Tambah custom API route internal untuk set password

**Ringkasan**
- Buat endpoint server-side internal yang memanggil API internal Better Auth `setPassword`.

**Kelebihan**
- UX bisa tetap inline.

**Kekurangan**
- Risiko lebih tinggi (mengandalkan API internal non-public route).
- Biaya maintenance lebih berat.
- Lebih rentan regress saat upgrade Better Auth.

## Opsi 3: Ubah UX jadi “set password hanya lewat forgot/reset” untuk semua user

**Ringkasan**
- Nonaktifkan change password inline, semua diarahkan ke reset flow email.

**Kelebihan**
- Simpel dan satu jalur.

**Kekurangan**
- UX turun untuk user email/password yang sebenarnya bisa change langsung.

### Rekomendasi Final

**Pilih Opsi 1** karena paling stabil, paling kecil risiko, dan memperbaiki dua bug inti tanpa menambah dependensi arsitektural baru.

---

## 5) Desain Perubahan (Opsi 1)

## 5.1 Komponen yang diubah

1. `src/components/settings/SecurityTab.tsx`
   - Ganti `handleSetPassword` (inline `setPassword`) menjadi `handleSendResetLink` (`requestPasswordReset`).
   - Tambah state UI pengiriman link (`isSendingResetLink`, `resetLinkSent`) jika diperlukan.
   - Perbaiki `handleSave`:
     - ambil `{ error }` dari `authClient.changePassword(...)`
     - jika `error` ada => tampilkan toast error dan stop
     - hanya jalankan sukses/redirect saat `error` null

## 5.2 Data flow final

### A. User Google (tanpa credential)
1. Klik `Kirim Link Buat Password`.
2. Frontend panggil `requestPasswordReset({ email, redirectTo })`.
3. Jika sukses, tampilkan status “link terkirim”.
4. User buka email, set password via reset flow.
5. Setelah reset sukses, akun punya credential.

### B. User email/password (sudah credential)
1. Isi current/new/confirm.
2. Frontend panggil `changePassword`.
3. Jika backend error:
   - tampilkan error backend (mapped/fallback)
   - jangan tampilkan sukses
4. Jika backend sukses:
   - jalankan toast sukses
   - redirect hanya jika `signOutOthers=true`

## 5.3 Error handling

1. Prioritas pesan: `apiError.message` (jika ada).
2. Fallback umum:
   - create password: `Gagal mengirim link. Silakan coba lagi.`
   - change password: `Gagal memperbarui password.`
3. Tidak boleh ada “success toast” ketika `error` tidak null.

---

## 6) Test Strategy

## 6.1 Manual acceptance

1. Login Google-only, buka Settings > Security:
   - tampil tombol kirim link
   - klik -> sukses kirim link (atau error yang benar)
2. Login email/password, isi password salah:
   - harus error, tidak boleh sukses
3. Login email/password, isi data valid:
   - sukses sesuai opsi revoke session

## 6.2 Otomasi (target minimum)

1. Unit test handler logic `SecurityTab` (mock `authClient`):
   - `changePassword` return `{ error }` => assert toast error.
   - `changePassword` return `{ error: null }` => assert toast sukses.
2. Smoke integration route auth existing tidak rusak:
   - reset password flow di sign-in tetap jalan.

---

## 7) Risiko & Mitigasi

1. Risiko: notifikasi link terkirim tapi email deliverability lambat.
   - Mitigasi: copy UI jelas “cek spam/junk”.
2. Risiko: format pesan error backend tidak user-friendly.
   - Mitigasi: fallback message terstandar.
3. Risiko: regression di tab Security karena state lama.
   - Mitigasi: test manual dua persona (Google-only dan credential).

---

## 8) Exit Criteria

1. `set-password` tidak lagi dipanggil dari UI Settings.
2. User Google dapat membuat password via link reset.
3. User email/password tidak menerima success palsu saat backend error.
4. Skenario manual dua persona lulus.
