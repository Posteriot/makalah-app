# Desain Patch End-to-End 2FA Backup Code

## Ringkasan Masalah

Flow 2FA saat ini bercabang:

1. **Flow login (verify-2fa)** hanya mendukung OTP email 6 digit.
2. **Flow settings** menampilkan backup code hasil enable 2FA dari Better Auth.

Akibatnya backup code terlihat valid di UI settings, tetapi **tidak bisa dipakai** untuk menyelesaikan login 2FA.

## Bukti Teknis (Code Evidence)

1. OTP login hard-coded 6 digit:
   - `src/app/(auth)/verify-2fa/page.tsx` (`OTP_LENGTH = 6`, validasi `otpCode.length !== 6`)
2. Endpoint custom verifikasi login hanya OTP:
   - `src/lib/auth-2fa.ts` hanya punya `verifyOtp()`
   - `convex/http.ts` hanya mendaftarkan `/api/auth/2fa/send-otp` dan `/api/auth/2fa/verify-otp`
3. Settings menampilkan backup codes dari Better Auth response `twoFactor.enable`:
   - `src/components/settings/SecurityTab.tsx`
4. Backup code Better Auth memang format alfanumerik terpisah dari OTP 6 digit:
   - `node_modules/better-auth/dist/plugins/two-factor/backup-codes/index.mjs`

## Tujuan

1. User bisa login 2FA dengan **dua metode**:
   - OTP email 6 digit
   - backup code
2. Backup code yang ditampilkan setelah enable 2FA benar-benar usable di halaman verify-2fa.
3. Tetap mempertahankan bypass flow cross-domain yang sudah berjalan.

## Non-Tujuan

1. Tidak mengubah format OTP email (tetap 6 digit).
2. Tidak mengubah algoritma generator backup code Better Auth.
3. Tidak mengubah flow enable/disable 2FA di settings selain copy kecil jika dibutuhkan.

## Keputusan Arsitektur

### 1) Tambah endpoint custom baru untuk backup code

Tambahkan endpoint Convex HTTP:

- `POST /api/auth/2fa/verify-backup-code`

Endpoint ini bertugas:

1. Validasi input `email` dan `code`.
2. Cari user dari Better Auth adapter.
3. Ambil record `twoFactor` untuk user.
4. Dekripsi backup code tersimpan.
5. Verifikasi `code` ada di daftar backup code.
6. Hapus code yang sudah terpakai (one-time use).
7. Generate bypass token (sama seperti `verifyOtp`) untuk melanjutkan sign-in cross-domain.

### 2) Pertahankan satu jalur final sign-in

Baik OTP maupun backup code sama-sama menghasilkan `bypassToken`, lalu frontend tetap memanggil:

- `signIn.email(..., { onRequest: set X-2FA-Bypass-Token })`

Dengan begitu perubahan tetap DRY dan risiko regresi minimal.

### 3) Tambah mode input di halaman verify-2fa

Halaman `verify-2fa` ditingkatkan jadi dual-mode:

1. Mode OTP:
   - 6 kotak numeric (seperti sekarang)
2. Mode Backup code:
   - 1 input teks (alfanumerik + `-`)

Switch mode harus:

1. clear error
2. reset input mode sebelumnya
3. tidak melakukan auto-submit lintas mode

## Desain API Kontrak

### POST `/api/auth/2fa/verify-backup-code`

Request:

```json
{
  "email": "user@example.com",
  "code": "DX1va-73eL5"
}
```

Success response:

```json
{
  "status": true,
  "bypassToken": "2fa-bypass-..."
}
```

Failed response:

```json
{
  "status": false,
  "error": "Backup code tidak valid atau sudah terpakai."
}
```

Catatan:

1. `bypassToken` TTL tetap singkat (30 detik), konsisten dengan endpoint OTP.
2. Backup code yang sukses diverifikasi wajib dihapus dari daftar tersimpan.

## Perubahan UX

1. Di `verify-2fa`, tambahkan opsi metode verifikasi:
   - `Kode OTP`
   - `Backup code`
2. Copy instruksi diperjelas:
   - OTP: “Masukkan 6 digit dari email.”
   - Backup: “Masukkan backup code (contoh: XXXXX-XXXXX).”
3. Saat verifikasi gagal, error message spesifik mode.

## Dampak Keamanan

1. Backup code bersifat one-time use, wajib invalid setelah sukses.
2. Tidak ada sesi login final yang dibuat langsung di endpoint backup; tetap lewat jalur sign-in + bypass token.
3. Rate limiting mengikuti pola endpoint OTP existing (bisa reuse pattern mutation/guard).

## Risiko dan Mitigasi

1. **Risiko:** parsing/normalisasi backup code salah.
   - Mitigasi: gunakan `trim`, dukung paste, dan verifikasi exact match terhadap nilai tersimpan.
2. **Risiko:** endpoint custom mengungkapkan status user.
   - Mitigasi: gunakan pesan error generik pada kasus invalid.
3. **Risiko:** regresi flow OTP existing.
   - Mitigasi: test regression OTP tetap pass + tambahkan test mode backup.

## Kriteria Selesai

1. User bisa login pakai backup code dari settings.
2. Backup code terpakai tidak bisa dipakai ulang.
3. OTP 6 digit tetap berjalan tanpa perubahan behavior.
4. Build, lint, dan test targeted pass.
