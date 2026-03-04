# Inline Create Password + Universal 2FA — Design Doc

**Tanggal:** 2026-03-04  
**Scope:** `Settings > Security` untuk user OAuth (Google) dan ketersediaan UI 2FA di seluruh tier (`free`, `bpp`, `pro`, `unlimited`).

---

## 1) Konteks dan Fakta Terverifikasi

1. Kegagalan create password user Google sebelumnya terjadi karena frontend memanggil endpoint yang tidak terdaftar (`setPassword` tanpa path HTTP).
2. Di UI saat ini, section 2FA dirender hanya saat `hasPassword === true`:
   - `src/components/settings/SecurityTab.tsx`
   - Konsekuensi: user OAuth-only tidak melihat 2FA sama sekali.
3. Tidak ada pengecekan tier/role pada render 2FA di `SecurityTab`.
4. Jadi isu “gratis tidak dapat 2FA” bukan gate tier, melainkan gate kepemilikan credential/password.

---

## 2) Tujuan

1. User Google yang sudah login bisa membuat password langsung di Settings (tanpa email round-trip).
2. Endpoint create password resmi dan terdaftar, dengan validasi sesi aktif + validasi account credential.
3. UI 2FA tampil untuk semua tier user.
4. Setelah create password sukses, status `hasPassword` berubah realtime dan UI langsung pindah ke mode password normal.

---

## 3) Non-Tujuan

1. Tidak mengubah model pricing/tier.
2. Tidak mengubah flow sign-in utama selain kebutuhan set password di Settings.
3. Tidak mengubah arsitektur 2FA OTP lintas domain yang sudah ada.

---

## 4) Opsi Pendekatan

## Opsi A (Rekomendasi Terbaik): Custom endpoint `/create-password` + UI inline + 2FA universal

**Ringkasan**
1. Tambah Better Auth plugin endpoint `POST /create-password`.
2. Endpoint memvalidasi sesi aktif, memeriksa akun credential existing, hash password, lalu `linkAccount(providerId: "credential")`.
3. Frontend `SecurityTab` pakai form inline “Password baru + Konfirmasi” untuk memanggil endpoint ini.
4. 2FA section selalu tampil (tidak tergantung `hasPassword`), tapi aksi enable/disable diberi guard saat belum punya password.

**Kelebihan**
1. UX paling sesuai permintaan: tanpa cek email.
2. Route resmi dan stabil (bukan memanggil endpoint internal tanpa path).
3. Problem 2FA lintas tier ikut selesai di layer UI.

**Kekurangan**
1. Perlu penambahan endpoint auth custom dan test tambahan.

## Opsi B: Tetap reset-link email + tampilkan 2FA universal

**Kelebihan**
1. Implementasi backend lebih minim.

**Kekurangan**
1. Tidak sesuai kebutuhan UX lo (masih bolak-balik email).

### Rekomendasi Final

Pilih **Opsi A** karena paling pas dengan kebutuhan produk lo sekarang: login Google tapi set password langsung di Settings, plus 2FA visible untuk semua tier.

---

## 5) Desain Arsitektur

## 5.1 Backend: Endpoint create password custom

**File baru (rencana):**
1. `convex/createPasswordEndpoint.ts`

**Integrasi:**
1. `convex/auth.ts` menambahkan plugin baru di array `plugins`.

**API contract:**
1. Method: `POST`
2. Path: `/create-password`
3. Body: `{ newPassword: string }`
4. Auth: wajib sesi aktif (`sensitiveSessionMiddleware` direkomendasikan).

**Aturan endpoint:**
1. Validasi panjang password mengikuti config Better Auth (`minPasswordLength`, `maxPasswordLength`).
2. Cek apakah user sudah punya credential account.
3. Jika belum ada credential:
   - hash password
   - `linkAccount({ providerId: "credential", accountId: userId, password: hash })`
4. Jika sudah punya credential:
   - return error terstruktur (`"user already has a password"` / kode error yang setara).

## 5.2 Frontend: SecurityTab inline create password

**File:**
1. `src/components/settings/SecurityTab.tsx`

**Perubahan perilaku:**
1. Saat `hasPassword=false`, tampilkan form inline:
   - password baru
   - konfirmasi password
   - tombol `Buat Password`
2. Tombol memanggil endpoint custom `/create-password`.
3. Jika sukses:
   - `setHasPassword(true)`
   - reset field form
   - tampilkan toast sukses
4. Jika gagal:
   - tampilkan pesan error backend/fallback.

## 5.3 Universal 2FA UI untuk semua tier

**File:**
1. `src/components/settings/SecurityTab.tsx`

**Perubahan render:**
1. Hapus gate render `2FA` berbasis `hasPassword`.
2. 2FA card selalu tampil untuk semua user login.
3. Jika `hasPassword=false`:
   - tombol enable/disable dinonaktifkan
   - tampil info “Buat password dulu untuk mengaktifkan 2FA”.
4. Jika `hasPassword=true`:
   - flow enable/disable berjalan normal seperti sekarang.

---

## 6) Dampak ke Tier User

1. `free`, `bpp`, `pro`, `unlimited` semuanya melihat UI 2FA.
2. Perbedaan hanya pada kesiapan credential:
   - user credential-ready: bisa langsung enable 2FA.
   - user OAuth-only: perlu set password inline dulu (tanpa email) lalu bisa enable.

---

## 7) Error Handling

1. `create-password`:
   - password terlalu pendek/panjang -> toast validasi jelas.
   - akun sudah punya password -> toast informatif.
   - sesi invalid -> toast “silakan login ulang”.
2. `change-password`:
   - wajib cek payload `{ error }`, tidak boleh sukses palsu.
3. 2FA:
   - tanpa password -> guard message, bukan hidden section.

---

## 8) Test Strategy

## 8.1 Automated

1. Test frontend `SecurityTab`:
   - create-password success/error path.
   - 2FA card muncul meskipun `hasPassword=false`.
   - tombol 2FA disable saat belum punya password.
2. Test backend endpoint (minimal contract test/smoke):
   - unauthorized ditolak.
   - user tanpa credential bisa create password.
   - user dengan credential ditolak create ulang.

## 8.2 Manual QA Matrix

1. Tier `free` + OAuth-only
2. Tier `free` + credential
3. Tier `bpp/pro` + OAuth-only
4. Tier `superadmin/unlimited`

Setiap kombinasi validasi:
1. 2FA card tampil.
2. create-password inline sesuai kondisi.
3. enable/disable 2FA sesuai guard.

---

## 9) Risiko dan Mitigasi

1. Risiko: endpoint custom bentrok dengan path plugin lain.
   - Mitigasi: pilih path unik `/create-password` dan cek konflik endpoint saat startup.
2. Risiko: state UI race setelah create-password sukses.
   - Mitigasi: update `hasPassword` lokal + optional re-fetch `listAccounts`.
3. Risiko: salah persepsi “tier issue” berulang.
   - Mitigasi: copy UI jelas bahwa requirement 2FA adalah punya password, bukan tier.

---

## 10) Exit Criteria

1. Endpoint `POST /api/auth/create-password` aktif dan berhasil dipanggil dari Settings.
2. User Google bisa set password inline tanpa email.
3. 2FA card tampil di semua tier user.
4. Flow 2FA tetap aman: enable/disable hanya saat user punya password.
