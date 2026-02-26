# Pricing Flow Redesign - Implementation Plan

Status: Draft v0.1 (execution-ready)  
Owner: Product + Frontend + Backend  
References: `docs/pricing-flow/README.md`, `docs/pricing-flow/design-doc.md`  
Last Updated: 2026-02-26

## 1) Tujuan Implementasi

Implementasi ini memastikan alur dari `/pricing` menjadi conversion-first:

1. User `gratis/bpp/pro` yang klik BPP/Pro langsung ke checkout target.
2. Hanya user tier `unlimited` yang dikecualikan dari direct checkout Pro.
3. User `pro` tetap bisa masuk `/checkout/pro`, namun checkout harus state-aware agar tidak membuat pembayaran baru saat subscription aktif.

## 1.1) Terminologi "Aktif" (Wajib Dipakai Konsisten)

1. **Subscription aktif**
   - Konteks recurring Pro.
   - Dipakai untuk guard subscribe Pro (mencegah create payment subscription baru saat masih aktif).
2. **Kapasitas aktif**
   - Konteks kemampuan lanjut pemakaian.
   - Ditentukan oleh kuota + kredit yang tersedia.
   - Untuk Pro: kuota bulanan dipakai dulu, lalu fallback ke kredit BPP.

## 2) Guardrail Wajib (Compliance)

1. Exception direct-to-checkout hanya untuk `unlimited` (plan Pro).
2. Jangan menolak request subscribe hanya karena `subscriptionStatus === "pro"`.
3. Guard active subscription tetap hard-stop pembuatan payment baru.
4. Flow management subscription (`/subscription/overview`, `/subscription/plans`, `/subscription/history`) tetap dipertahankan untuk use case manage, bukan entry beli dari pricing.
5. User `pro` tetap boleh top up BPP (`/checkout/bpp` -> `/api/payments/topup`) sebagai mekanisme kapasitas tambahan.

## 3) Ruang Lingkup Perubahan

In scope:

1. Routing CTA pricing (`PricingCard`) untuk intent purchase.
2. Exception `FreeLoginGate` pada checkout path.
3. Penyesuaian guard UI checkout Pro.
4. Penyesuaian guard API subscribe Pro.
5. Validasi redirect after auth untuk checkout path berquery.
6. Test coverage dan verifikasi regression.

Out of scope:

1. Perubahan billing engine/Xendit webhook/schema Convex.
2. Redesign visual besar pricing.
3. Perubahan behavior utama halaman management subscription di luar jalur entry pricing.

## 4) Rencana Implementasi per Workstream

## WS1 - Pricing CTA Routing Contract

Target file:

1. `src/components/marketing/pricing/PricingCard.tsx`

Tugas:

1. Tambah resolver destination eksplisit berbasis `plan.slug`, auth state, dan effective tier.
2. Rule target:
   - Guest + BPP -> `/sign-up?redirect_url=/checkout/bpp?from=pricing`
   - Guest + Pro -> `/sign-up?redirect_url=/checkout/pro?from=pricing`
   - Signed-in + BPP -> `/checkout/bpp?from=pricing`
   - Signed-in + Pro + tier `gratis/bpp/pro` -> `/checkout/pro?from=pricing`
   - Signed-in + Pro + tier `unlimited` -> `/subscription/plans`
3. `plan.ctaHref` tetap dipakai hanya sebagai fallback jika slug tidak dikenali.

Definition of done:

1. Tidak ada jalur `/pricing -> /subscription/plans` untuk user `gratis/bpp/pro` saat klik Pro.
2. Query `from=pricing` selalu ikut di semua target checkout dari pricing.

## WS2 - FreeLoginGate Exception untuk Checkout

Target file:

1. `src/components/onboarding/FreeLoginGate.tsx`

Tugas:

1. Tambahkan pengecualian route `/checkout/*` sebelum redirect ke `/get-started`.
2. Pastikan marker session gate tetap konsisten untuk route non-checkout.

Definition of done:

1. User gratis yang masuk checkout dari pricing tidak di-override ke `/get-started`.

## WS3 - Checkout Pro State-Aware UI

Target file:

1. `src/app/(onboarding)/checkout/pro/page.tsx`

Tugas:

1. Ubah guard page-level agar hard block hanya `unlimited`.
2. Biarkan user `pro` mengakses halaman.
3. Tambah state-aware rendering:
   - active subscription -> tampilkan status aktif + CTA manage
   - non-active/eligible -> tampilkan flow pembayaran normal

Definition of done:

1. User `pro` bisa membuka `/checkout/pro`.
2. User `pro` dengan subscription aktif tidak mendapat aksi pembayaran baru.

## WS4 - Subscribe API Guard Alignment

Target file:

1. `src/app/api/payments/subscribe/route.ts`

Tugas:

1. Ubah guard tier/role:
   - tetap reject `unlimited`, `admin`, `superadmin`
   - hapus reject khusus `subscriptionStatus === "pro"`
2. Pertahankan `getActiveSubscription` sebagai guard final create payment.
3. Rapikan payload error untuk kasus subscription aktif agar dapat dipakai UI state-aware.

Definition of done:

1. User `pro` non-active bisa lanjut create payment.
2. User `pro` active tetap tidak bisa create payment baru.

## WS5 - Redirect Sanitization Verification

Target file:

1. `src/lib/utils/redirectAfterAuth.ts`

Tugas:

1. Verifikasi path checkout dengan query (`/checkout/bpp?from=pricing`, `/checkout/pro?from=pricing`) tetap lolos sanitization.
2. Jika perlu, lakukan penyesuaian minimal tanpa memperluas attack surface.

Definition of done:

1. Redirect auth selalu valid ke checkout target dengan query tracking.

## WS5B - Pro Top Up Capacity Contract

Target file:

1. `src/app/(dashboard)/subscription/overview/page.tsx`
2. `src/app/(onboarding)/checkout/bpp/page.tsx`
3. `src/app/api/payments/topup/route.ts`
4. `convex/billing/quotas.ts`
5. `convex/billing/pricingHelpers.ts`

Tugas:

1. Pastikan jalur top up BPP tetap tersedia untuk user Pro.
2. Pastikan kondisi kapasitas Pro dipahami jelas:
   - Pro + kuota habis + kredit 0 -> action `topup`, route ke `/checkout/bpp`.
   - Pro + kuota habis + kredit > 0 -> lanjut via fallback kredit, top up opsional.
3. Pastikan package BPP paper untuk top up tetap diproses (baseline Rp80.000, data-driven dari pricing helper/DB).

Definition of done:

1. User `pro` dapat membuat transaksi di `/api/payments/topup`.
2. Top up sukses menambah kredit user Pro tanpa mengubah status subscription Pro aktif.
3. CTA/route top up untuk kasus kapasitas habis muncul konsisten.

## WS6 - Instrumentasi Funnel

Target lokasi (sesuai implementasi analytics saat ini):

1. Titik klik CTA pricing
2. Titik landing checkout
3. Titik inisiasi pembayaran

Event minimal:

1. `pricing_cta_clicked` (`plan_slug`, `auth_state`, `effective_tier`)
2. `pricing_checkout_landed` (`plan_slug`, `from`)
3. `payment_initiated` (`plan_slug`, `payment_method`)

Definition of done:

1. Ketiga event terkirim konsisten untuk jalur BPP dan Pro.

## WS7 - Testing dan Verifikasi

Unit/integration:

1. Resolver routing CTA pricing.
2. Guard logic subscribe API.
3. FreeLoginGate checkout exception.
4. Guard logic kapasitas Pro ke action `topup`.

E2E utama:

1. Guest:
   - `/pricing` -> BPP -> auth -> `/checkout/bpp?from=pricing`
   - `/pricing` -> Pro -> auth -> `/checkout/pro?from=pricing`
2. Signed-in `gratis/bpp`:
   - Pro -> `/checkout/pro?from=pricing`
3. Signed-in `pro`:
   - Pro -> `/checkout/pro?from=pricing` (state-aware, no new charge saat aktif)
4. Signed-in `unlimited`:
   - Pro -> `/subscription/plans`
5. Signed-in `pro` capacity:
   - Pro + kuota habis + kredit 0 -> diarahkan ke top up BPP (`/checkout/bpp`).
   - Pro + kuota habis + kredit tersedia -> tidak mandatory top up, lanjut via fallback kredit.

Regression:

1. `/subscription/topup` tetap redirect ke `/checkout/bpp`.
2. Checkout BPP tetap ke `/api/payments/topup`.
3. Checkout Pro tetap ke `/api/payments/subscribe`.
4. Harga paket top up paper tetap konsisten baseline Rp80.000 (atau nilai terbaru dari DB jika diubah admin).

## 5) Urutan Eksekusi (Disarankan)

1. WS1 (Pricing CTA routing).
2. WS2 (FreeLoginGate exception).
3. WS4 (API guard alignment).
4. WS3 (UI state-aware checkout Pro).
5. WS5 (redirect sanitization verification).
6. WS5B (Pro top up capacity contract).
7. WS6 (instrumentation).
8. WS7 (test + regression + final verification).

Alasan urutan:

1. Routing contract harus beres dulu agar jalur user sudah benar.
2. Guard backend diselaraskan sebelum finalisasi UI agar tidak mismatch.
3. Test dijalankan setelah kontrak flow end-to-end lengkap.

## 6) Risiko Implementasi + Mitigasi

1. Risiko mismatch antara routing code dan data `ctaHref`.
   - Mitigasi: rule pricing entry hardcoded by `slug` + fallback eksplisit.
2. Risiko gate onboarding tetap memotong intent checkout.
   - Mitigasi: exception `/checkout/*` + test regresi gate.
3. Risiko pembayaran ganda untuk user `pro` aktif.
   - Mitigasi: hard-stop active subscription di API + state-aware UI tanpa tombol bayar.

## 7) Acceptance Criteria Final

1. Dari `/pricing`, user `gratis/bpp/pro` klik Pro mendarat ke `/checkout/pro?from=pricing`.
2. Hanya `unlimited` yang diarahkan ke `/subscription/plans` saat klik Pro dari pricing.
3. `subscribe` API tidak menolak request hanya karena status `pro`.
4. Active subscription tetap mencegah create payment baru.
5. Tidak ada redirect berantai ke halaman management untuk intent beli dari pricing.
6. User `pro` tetap bisa top up BPP saat kapasitas habis, dengan jalur checkout BPP dan API topup yang tetap aktif.
