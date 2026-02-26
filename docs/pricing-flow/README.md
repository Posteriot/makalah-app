# Pricing Flow Redesign

Status: Draft v0.2 (audited vs codebase)  
Owner: Product + Frontend  
Last Updated: 2026-02-26

## 1) Context dan Masalah

Masalah UX yang mau diselesaikan:

1. User yang klik paket dari halaman `/pricing` punya intent transaksi, tapi saat ini sering tidak mendarat ke checkout final.
2. Alur saat ini masih dipengaruhi `ctaHref` plan (data-driven), sehingga bisa mengarah ke route subscription management dulu.
3. Untuk tier gratis, `FreeLoginGate` global dapat mengalihkan ke `/get-started`, yang berpotensi memotong intent checkout jika tidak dieksklusikan.

Tujuan redesign: mengutamakan intent checkout dari entry pricing (conversion-first), tanpa merusak flow management subscription.

## 2) Verifikasi As-Is (Sesuai Kode Sekarang)

### 2.1 Routing CTA dari pricing card

1. CTA pricing mengambil tujuan dari `plan.ctaHref`.
2. Jika belum login: diarahkan ke `/sign-up?redirect_url=<ctaHref>`.
3. Jika sudah login: langsung ke `ctaHref`.

Sumber:

- `src/components/marketing/pricing/PricingCard.tsx`

### 2.2 Nilai `ctaHref` default plan dari migration

Data konten pricing terbaru menetapkan:

1. `gratis` -> `/chat`
2. `bpp` -> `/subscription/plans`
3. `pro` -> `/subscription/upgrade`

Sumber:

- `convex/migrations/seedPricingPlans.ts` (`updatePricingPageContent`)

### 2.3 Redirect berantai di area subscription

1. `/subscription/upgrade` redirect ke `/subscription/plans`.
2. `/subscription/plans` untuk tier `gratis`/`bpp` redirect ke `/subscription/overview`.
3. `/subscription/topup` redirect ke `/checkout/bpp`.

Sumber:

- `src/app/(dashboard)/subscription/upgrade/page.tsx`
- `src/app/(dashboard)/subscription/plans/page.tsx`
- `src/app/(dashboard)/subscription/topup/page.tsx`

### 2.4 Auth & redirect policy

1. Route privat tanpa cookie session diarahkan ke `/sign-in?redirect_url=<path aktif>`.
2. Redirect auth mengizinkan path `/checkout/bpp` dan `/checkout/pro`.

Sumber:

- `src/proxy.ts`
- `src/lib/utils/redirectAfterAuth.ts`

### 2.5 FreeLoginGate behavior saat ini

Untuk user tier gratis yang belum ditandai sesi gate-nya:

1. Jika bukan di `/get-started`, gate melakukan `router.replace("/get-started")`.
2. Saat ini belum ada pengecualian eksplisit untuk path checkout.

Sumber:

- `src/components/onboarding/FreeLoginGate.tsx`

### 2.6 Guard checkout Pro saat ini

1. Di UI checkout Pro, user tier `pro` dan `unlimited` sama-sama di-short-circuit (tidak lanjut flow pembayaran).
2. Di API subscribe, `subscriptionStatus === "pro"` ditolak di guard awal.

Sumber:

- `src/app/(onboarding)/checkout/pro/page.tsx`
- `src/app/api/payments/subscribe/route.ts`

### 2.7 Definisi "aktif" (wajib eksplisit)

1. **Subscription aktif**
   - Definisi operasional untuk guard pembayaran subscription: ada record subscription dengan `status: "active"`.
   - Ini yang dipakai untuk hard-stop transaksi subscribe Pro baru.
2. **Kapasitas aktif**
   - Definisi operasional untuk kemampuan lanjut pakai fitur: ditentukan oleh kuota + kredit yang tersedia saat ini.
   - Untuk tier Pro: kuota bulanan dipakai dulu, lalu fallback ke kredit BPP jika kuota habis.
3. Konsekuensi penting:
   - User bisa berada pada kondisi "subscription aktif" tetapi "kapasitas menurun/habis" (mis. kuota habis, kredit nol).
   - Pada kondisi tersebut, jalur top up BPP tetap harus tersedia.

## 3) Gap Terhadap Tujuan

1. Dari pricing, intent transaksi belum menjadi prioritas utama karena tergantung `ctaHref` data plan.
2. BPP/Pro bisa melewati halaman management dulu (`/subscription/plans` atau `/subscription/overview`) sebelum checkout.
3. FreeLoginGate berpotensi menambah friksi pada flow intent checkout untuk user gratis.
4. Saat ini user tier `pro` diblokir di checkout/API subscribe, padahal target bisnis terbaru: `pro` tetap boleh masuk checkout, hanya `unlimited` yang dikecualikan.

## 4) Goal dan Non-Goal

### Goal

1. Dari `/pricing`, user (kecuali `unlimited`) yang memilih BPP/Pro harus langsung ke checkout final.
2. Untuk guest, setelah auth langsung mendarat ke checkout target via `redirect_url`.
3. Menurunkan langkah dari pricing CTA ke payment initiation.

### Non-Goal

1. Mengubah mesin billing, webhook Xendit, quota, atau schema.
2. Redesign visual besar pricing page.
3. Menghapus flow management subscription (`overview/plans/history`).

## 5) Prinsip UX (Dari Kebutuhan Produk + Audit)

1. Intent-first navigation: CTA beli harus menghasilkan route beli.
2. Progressive disclosure: halaman management dipakai saat intent-nya manage, bukan saat intent-nya transaksi.
3. Friction minimization: hindari redirect berantai sebelum checkout.
4. Interaction hygiene:
   - CTA disabled saat loading async
   - focus state terlihat
   - target tap minimum 44x44

## 6) Target Flow (To-Be)

### 6.1 Entry dari `/pricing`

#### Guest

1. Klik BPP -> `/sign-up?redirect_url=/checkout/bpp?from=pricing`
2. Klik Pro -> `/sign-up?redirect_url=/checkout/pro?from=pricing`
3. Auth sukses -> langsung ke checkout target.

#### Signed-in

1. Klik BPP -> `/checkout/bpp?from=pricing`
2. Klik Pro (termasuk tier `pro`) -> `/checkout/pro?from=pricing`
3. Tidak transit lewat `/subscription/plans`/`/subscription/overview`.

#### Signed-in tier unlimited

1. Klik Pro tidak masuk ke checkout lagi.
2. Dialihkan ke halaman status/manage (`/subscription/plans`) karena user sudah aktif.

### 6.2 Checkout Pro untuk user `pro` (state-aware)

1. User `pro` tetap boleh masuk halaman `/checkout/pro`.
2. Jika **subscription aktif**:
   - tampilkan status aktif + CTA kelola langganan
   - tidak menampilkan aksi pembayaran baru
3. Jika status subscription non-aktif/pending cancel sesuai rule bisnis:
   - tampilkan aksi lanjutan yang relevan (reactivate atau pembayaran baru)
4. Kebutuhan terpisah untuk **kapasitas aktif** user Pro:
   - Jika kuota bulanan habis dan kredit nol: user tetap harus bisa top up BPP via `/checkout/bpp`.
   - Jika kuota bulanan habis tetapi masih ada kredit: proses tetap boleh lanjut via fallback kredit.

## 7) Decision Matrix (Target)

| Entry | Auth | Effective Tier | Plan Klik | Destination |
|---|---|---|---|---|
| `/pricing` | guest | gratis | bpp | `/sign-up?redirect_url=/checkout/bpp?from=pricing` |
| `/pricing` | guest | gratis | pro | `/sign-up?redirect_url=/checkout/pro?from=pricing` |
| `/pricing` | signed-in | gratis/bpp | bpp | `/checkout/bpp?from=pricing` |
| `/pricing` | signed-in | gratis/bpp/pro | pro | `/checkout/pro?from=pricing` |
| `/pricing` | signed-in | unlimited | pro | `/subscription/plans` |

## 8) Scope Perubahan Teknis

1. `src/components/marketing/pricing/PricingCard.tsx`
   - pisahkan rule routing CTA pricing dari `ctaHref` murni.
   - gunakan rule eksplisit berbasis `plan.slug`, auth state, dan tier.
   - tetap simpan `ctaHref` sebagai fallback safety jika slug tidak dikenali.
2. `src/components/onboarding/FreeLoginGate.tsx`
   - tambahkan pengecualian untuk path checkout agar intent transaksi tidak dioverride.
3. `src/app/(onboarding)/checkout/pro/page.tsx`
   - ubah guard UI: blokir hanya `unlimited`, jangan blokir `pro`.
   - tambahkan tampilan state-aware untuk user `pro` yang subscription-nya masih aktif (no new charge path).
4. `src/app/api/payments/subscribe/route.ts`
   - ubah guard API: blokir `unlimited` (dan admin/superadmin) saja; jangan menolak hanya karena `subscriptionStatus === "pro"`.
   - pertahankan guard active subscription agar transaksi baru tidak dibuat saat subscription masih aktif.
   - respons API untuk kasus active subscription harus eksplisit agar UI bisa render state-aware message.
5. `src/lib/utils/redirectAfterAuth.ts`
   - pastikan query path checkout (`?from=pricing`) tetap lolos sanitization.
6. `src/app/(onboarding)/checkout/bpp/page.tsx` + `src/app/api/payments/topup/route.ts`
   - pastikan jalur top up tetap tersedia untuk tier `pro` (termasuk saat subscription aktif).
   - pastikan paket paper BPP (baseline Rp80.000) tetap bisa diproses untuk user Pro.
7. Testing
   - unit logic routing CTA
   - E2E guest dan signed-in dari pricing ke checkout.

## 9) KPI dan Instrumentasi

Event minimal:

1. `pricing_cta_clicked`
   - `plan_slug`, `auth_state`, `effective_tier`
2. `pricing_checkout_landed`
   - `plan_slug`, `from`
3. `payment_initiated`
   - `plan_slug`, `payment_method`

KPI:

1. CTR pricing CTA -> checkout landing.
2. Drop-off checkout landing -> payment initiated.
3. Median time CTA click -> payment initiated.

## 10) Risiko dan Mitigasi

1. Risiko: FreeLoginGate tetap override checkout.
   - Mitigasi: skip gate untuk pathname `/checkout/*`.
2. Risiko: divergensi antara data CMS (`ctaHref`) dan routing code.
   - Mitigasi: buat routing contract khusus entry `/pricing`, dengan fallback terkontrol.
3. Risiko: user pro diarahkan ke checkout tetapi masih ditolak guard API lama.
   - Mitigasi: update guard UI + API subscribe secara konsisten (single rule: hanya `unlimited` dikecualikan).
4. Risiko: user pro melakukan pembayaran ganda saat subscription aktif.
   - Mitigasi: checkout Pro state-aware + guard active subscription tetap jadi hard-stop transaksi baru.

## 11) Test Plan

1. Guest:
   - `/pricing` -> BPP -> sign-up -> `/checkout/bpp?from=pricing`
   - `/pricing` -> Pro -> sign-up -> `/checkout/pro?from=pricing`
2. Signed-in gratis/bpp:
   - `/pricing` -> BPP -> `/checkout/bpp?from=pricing`
   - `/pricing` -> Pro -> `/checkout/pro?from=pricing`
3. Signed-in pro:
   - `/pricing` -> Pro -> `/checkout/pro?from=pricing`
4. Signed-in unlimited:
   - `/pricing` -> Pro -> `/subscription/plans` (bukan checkout)
5. Regression:
   - `/subscription/topup` tetap redirect ke `/checkout/bpp`
   - checkout BPP tetap hit `/api/payments/topup`
   - checkout Pro tetap hit `/api/payments/subscribe`
6. Pro capacity scenarios:
   - Pro + subscription aktif + kuota habis + kredit nol -> muncul jalur top up BPP.
   - Pro + subscription aktif + kuota habis + kredit tersedia -> tetap bisa lanjut via fallback kredit (tanpa wajib top up).

## 12) Rollout Plan

1. Phase 1: implement routing contract pricing + gate exception checkout.
2. Phase 2: monitor KPI minimal 3-7 hari.
3. Phase 3: rapikan dead-path/redirect yang tidak dipakai dari entry pricing.

## 13) Open Questions

1. Apakah `from=pricing` cukup untuk analitik, atau perlu parameter tambahan `intent=purchase`?

## 14) Final Decision (Approved)

1. Exception untuk direct-to-checkout hanya `unlimited`.
2. User `pro` tetap diarahkan ke `/checkout/pro` dari entry pricing.
3. Checkout Pro wajib state-aware:
   - subscription aktif: no new payment
   - subscription non-aktif/eligible: tampilkan aksi lanjutan sesuai status
4. API subscribe tidak boleh menolak hanya berdasarkan `subscriptionStatus === "pro"`, tetapi tetap mencegah transaksi baru jika subscription aktif.
