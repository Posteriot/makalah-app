# VA Bank Visibility Design Plan

## 1. Tujuan
Memungkinkan admin/superadmin mengatur visibilitas setiap bank Virtual Account (VA) di dashboard payment provider, lalu menerapkan konfigurasi yang sama ke seluruh checkout (`/checkout/bpp` dan `/checkout/pro`).

Kebutuhan utama:
- Setiap bank VA bisa di-show/hide secara independen.
- Berlaku global untuk semua jenis checkout.
- Saat semua bank VA hidden, metode VA dianggap tidak tersedia di checkout.

## 2. Keputusan Utama (Final)
1. Sumber kebenaran visibilitas VA ada di `paymentProviderConfigs` (Convex).
2. UI checkout hanya merender bank yang termasuk `visibleVAChannels`.
3. Jika `visibleVAChannels` kosong, checkout memperlakukan `va` sebagai unavailable (disembunyikan dari daftar metode yang bisa dipilih).
4. Backend memvalidasi channel VA agar request manual tidak bisa bypass visibilitas.

Alasan:
- Konsistensi lintas BPP + Pro.
- Aman dari bypass frontend.
- Mudah dikelola admin tanpa redeploy.

## 3. Ruang Lingkup
In-scope:
- Model konfigurasi payment provider untuk visibilitas bank VA.
- Dashboard admin payment provider: kontrol show/hide per bank VA.
- Checkout BPP & Pro: filtering tampilan bank VA dan fallback method selection.
- Validasi API payment create untuk VA channel visibility.
- Test coverage untuk layer data, UI, dan API.

Out-of-scope:
- Perubahan provider payment selain Xendit.
- Per-channel e-wallet visibility.
- Segmentasi visibilitas per plan/user.

## 4. Desain Arsitektur
### 4.1 Data Model
Tambahan field baru pada `paymentProviderConfigs`:
- `visibleVAChannels: string[]`

Daftar nilai valid mengikuti master list dari `ACTIVE_VA_CHANNELS`:
- `BJB_VIRTUAL_ACCOUNT`
- `BNI_VIRTUAL_ACCOUNT`
- `BRI_VIRTUAL_ACCOUNT`
- `BSI_VIRTUAL_ACCOUNT`
- `CIMB_VIRTUAL_ACCOUNT`
- `MANDIRI_VIRTUAL_ACCOUNT`
- `PERMATA_VIRTUAL_ACCOUNT`

### 4.2 Query/Mutation Config
`getActiveConfig`:
- Jika belum ada config aktif, return default:
  - `enabledMethods` default existing
  - `visibleVAChannels` = semua channel VA aktif

`upsertConfig`:
- Terima payload `visibleVAChannels`.
- Simpan bersamaan dengan `enabledMethods`.
- Validasi format + whitelist channel.
- Role tetap `requireRole(..., "admin")` (superadmin tetap lolos karena role hierarchy).

### 4.3 Runtime Rules
Rule runtime checkout untuk method availability:
- `qris`: sesuai `enabledMethods`.
- `ewallet`: sesuai `enabledMethods`.
- `va`: tersedia hanya jika:
  - `VIRTUAL_ACCOUNT` ada di `enabledMethods`, dan
  - `visibleVAChannels.length > 0`

Jika VA tidak tersedia, `resolveCheckoutMethodSelection` fallback ke metode lain yang available.

### 4.4 Backend Guard
Tambahkan validasi server-side pada create payment:
- Saat `paymentMethod === "va"`, `vaChannel` harus:
  - termasuk daftar channel valid, dan
  - termasuk `visibleVAChannels` config aktif.

Jika tidak valid, return `400` dengan error domain yang jelas.

## 5. Perubahan UI
### 5.1 Dashboard `/dashboard/payment-provider`
Tambahan section baru: `Virtual Account Channels`.

Per item bank:
- Label short + nama bank.
- Toggle/checkbox show/hide.
- Status badge `Aktif` / `Nonaktif`.

Validasi UI sebelum save:
- Jika metode `Virtual Account` aktif dan semua bank hidden, tampilkan warning bahwa VA akan dianggap tidak tersedia di checkout.
- Save tetap diperbolehkan (sesuai keputusan final), karena requirement memang mengizinkan semua bank hidden.

### 5.2 Checkout BPP & Pro
- Render grid bank dari hasil filter `visibleVAChannels`.
- Jika selected VA channel tidak lagi visible, auto-switch ke channel visible pertama.
- Jika tidak ada channel visible:
  - metode `Virtual Account` tidak ditampilkan pada daftar metode,
  - user diarahkan memilih metode lain yang available.

## 6. Strategi Implementasi File
Target file utama:
- `convex/schema.ts`
- `convex/billing/paymentProviderConfigs.ts`
- `src/lib/payment/channel-options.ts`
- `src/lib/payment/runtime-settings.ts`
- `src/lib/payment/request-validation.ts`
- `src/components/admin/PaymentProviderManager.tsx`
- `src/components/admin/PaymentProviderManager.test.tsx`
- `src/app/(onboarding)/checkout/bpp/page.tsx`
- `src/app/(onboarding)/checkout/pro/page.tsx`
- test file terkait runtime/validation/checkout yang sudah ada

## 7. Testing Plan
### 7.1 Unit Test
- Validasi whitelist `visibleVAChannels`.
- Perhitungan availability method ketika VA enabled tapi channel kosong.
- Validator `assertVisibleVAChannel`.

### 7.2 Component Test
- `PaymentProviderManager`:
  - render daftar bank VA,
  - toggle bank,
  - payload save memuat `visibleVAChannels`.

### 7.3 Integration/API Test
- `/api/payments/topup` dan `/api/payments/subscribe`:
  - reject `vaChannel` hidden (400),
  - accept `vaChannel` visible.

### 7.4 Manual QA
1. Hide 1 bank -> bank hilang di BPP+Pro.
2. Hide beberapa bank -> hanya sisa visible yang muncul.
3. Hide semua bank dengan VA method tetap enabled -> VA method tidak muncul di checkout.
4. Re-show bank -> VA method dan bank muncul lagi tanpa restart.

## 8. Backward Compatibility & Rollout
- Config lama yang belum punya `visibleVAChannels` diperlakukan sebagai semua channel visible (safe default).
- Tidak ada perubahan pada data transaksi historis.
- Tidak membutuhkan downtime.

## 9. Risiko dan Mitigasi
Risiko:
- Inkonstistensi antara filter UI dan validasi API.
Mitigasi:
- Gunakan helper/validator shared untuk frontend/backend semantics.

Risiko:
- Admin meng-hide semua bank VA tanpa sadar efeknya.
Mitigasi:
- Tampilkan warning eksplisit di dashboard sebelum save.

Accepted Risk (disepakati produk):
- Skenario seluruh metode pembayaran nonaktif sekaligus (VA bank seluruhnya hidden + QRIS off + E-Wallet off) diperlakukan sebagai force majeure operasional, bukan target mitigasi fitur ini.
- Asumsi operasional normal: minimal satu metode pembayaran tetap aktif untuk checkout.

## 10. Kriteria Sukses
- Admin/superadmin bisa show/hide bank VA per-item dari dashboard.
- Daftar bank di checkout BPP+Pro konsisten dengan konfigurasi dashboard.
- Request VA ke channel hidden selalu ditolak backend.
- Saat semua bank VA hidden, metode VA tidak tersedia di checkout.
