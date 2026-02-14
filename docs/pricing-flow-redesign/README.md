# Pricing Flow Redesign

Dokumentasi brainstorming dan keputusan desain untuk mengatasi redundansi antara Homepage Pricing Section dan Halaman Pricing, serta merancang flow checkout yang unified.

**Status:** ✅ Brainstorming Complete - Ready for Implementation Planning
**Tanggal Mulai:** 2026-01-31
**Tanggal Selesai Brainstorming:** 2026-01-31

---

## Daftar Isi

1. [Latar Belakang Masalah](#latar-belakang-masalah)
2. [Keputusan Desain](#keputusan-desain)
3. [User Flow](#user-flow)
4. [Scope Pekerjaan](#scope-pekerjaan)
5. [Route Structure](#route-structure)
6. [Komponen yang Terlibat](#komponen-yang-terlibat)
7. [Catatan Diskusi](#catatan-diskusi)
8. [Detail Tier & Pricing](#detail-tier--pricing)
9. [Quick Summary](#quick-summary)

---

## Latar Belakang Masalah

### Masalah Utama
- **Redundansi**: Section "Pemakaian & Harga" di homepage (`PricingSection.tsx`) hampir identik dengan halaman pricing (`/pricing`)
- **UX Buruk**: Halaman pricing menampilkan `showCta={false}`, sehingga user bisa lihat harga tapi tidak bisa melakukan action
- **Flow Tidak Jelas**: Tidak ada path yang jelas dari "lihat harga" → "checkout"

### File yang Terlibat (Current State)
| File | Deskripsi |
|------|-----------|
| `src/app/(marketing)/page.tsx` | Homepage dengan PricingSection |
| `src/app/(marketing)/pricing/page.tsx` | Halaman pricing terpisah |
| `src/components/marketing/PricingSection.tsx` | Component pricing cards (reused) |
| `src/app/(dashboard)/subscription/topup/page.tsx` | Checkout untuk BPP (credit topup) |

---

## Keputusan Desain

### Pendekatan: Diferensiasi Konten (Opsi A)

**Dipilih karena:**
- Tidak redundant, tiap page punya purpose berbeda
- SEO benefit (dedicated `/pricing` URL bisa di-share untuk marketing)
- Progressive disclosure - tidak overwhelm homepage visitor

### First-Time User Detection

**Metode:** Database flag di table `users` Convex

```typescript
// convex/schema.ts - tambahan field
users: defineTable({
  // ... existing fields
  hasCompletedOnboarding: v.optional(v.boolean()), // default: false/undefined
})
```

**Dipilih karena:**
- Persistent across devices (tidak hilang kalau ganti browser/device)
- Tidak hilang kalau user clear browser cache
- Bisa di-query dari server untuk redirect logic

**Kapan `hasCompletedOnboarding` di-set `true`:**

| Trigger | Set `true`? | Keterangan |
|---------|-------------|------------|
| Klik "Skip" di welcome page | ✅ Ya | User sadar memilih gratis |
| Klik "Upgrade BPP" di welcome page | ✅ Ya | User memilih upgrade |
| Klik "Upgrade PRO" di welcome page | ✅ Ya | User memilih upgrade |
| Signup dengan `?redirect=/checkout/*` | ✅ Ya | Implicit choice dari pricing page |
| Baru signup tanpa redirect | ❌ Tidak | Perlu lihat welcome page dulu |

### Redirect Parameter untuk Intent Preservation

**Prinsip:** Jangan buang intent user. Kalau mereka sudah pilih tier di pricing page, langsung bawa ke checkout.

**Mekanisme:** Query parameter `?redirect=`

```
/pricing → "Beli Kredit" (belum login)
    ↓
/sign-up?redirect=/checkout/bpp
    ↓ (setelah signup berhasil)
/checkout/bpp (langsung, skip welcome page)
    ↓
hasCompletedOnboarding = true (set implicitly)
```

**Kenapa skip welcome page?** User sudah membuat keputusan di pricing page. Menampilkan welcome page dengan pertanyaan "mau upgrade?" adalah redundant dan mengganggu momentum pembelian.

### Homepage PricingSection (Teaser)
- 3 cards **simplified** (nama + harga + kredit)
- **Tidak ada** daftar fitur detail
- **Tidak ada** CTA per card

**Layout:**
- Desktop: Grid 3 kolom (seperti sekarang)
- Mobile: **Carousel horizontal** (swipe) - sama seperti `PricingSection.tsx` sekarang
- Alasan: Stack vertical tabrakan dengan kebiasaan swipe-up di mobile

**CTA:**
- Posisi: **Di bawah carousel/grid** (bukan di dalam card)
- Text: **"Lihat Detail Paket"**
- Link: → `/pricing`
- Tujuan: kasih gambaran harga, trigger curiosity untuk explore lebih lanjut

### Pricing Page (Full)
- Cards **lengkap** dengan semua features
- CTA per tier:
  - Gratis: "Mulai Gratis" → `/get-started`
  - BPP: "Beli Kredit" → `/checkout/bpp`
  - PRO: "Segera Hadir" (disabled) atau "Langganan" → `/checkout/pro`
- Tujuan: convince & convert

**Out of Scope (v1):**
- Comparison table (opsional, iterasi berikutnya)
- FAQ section (opsional, iterasi berikutnya)

---

## User Flow

### Flow Utama: Entry "Ayo Mulai!"

```
┌─────────────────────────────────────────────────────────────────┐
│                         ENTRY: "Ayo Mulai!"                     │
│                    (Hero CTA di Homepage)                       │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │   Sudah login?        │
                    └───────────────────────┘
                         │            │
                        Ya           Tidak
                         │            │
                         ▼            ▼
              ┌──────────────┐   ┌──────────────┐
              │ First-time?  │   │  /sign-up    │
              └──────────────┘   └──────────────┘
                  │       │            │
                 Ya      Tidak         │ (auto-login setelah signup)
                  │       │            │
                  ▼       ▼            ▼
           ┌──────────┐  ┌──────────┐
           │/get-     │  │  /chat   │◄─────────┘
           │ started  │  │ (direct) │
           └──────────┘  └──────────┘
                │
                ├── [Upgrade BPP] → /checkout/bpp
                ├── [Upgrade PRO] → /checkout/pro
                └── [Skip → Mulai Chat] → /chat
```

### Flow dari Pricing Page

```
┌─────────────────────────────────────────────────────────────────┐
│                      /pricing                                   │
│              (Full comparison + CTAs)                           │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
                ▼               ▼               ▼
         [Gratis]          [BPP]           [PRO]
         "Mulai            "Beli           "Langganan"
          Gratis"          Kredit"
                │               │               │
                ▼               ▼               ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │ Sudah login?  │  │ Sudah login?  │  │ Sudah login?  │
    └───────────────┘  └───────────────┘  └───────────────┘
          │                   │                   │
         Ya                  Ya                  Ya
          │                   │                   │
          ▼                   ▼                   ▼
    /get-started        /checkout/bpp      /checkout/pro

        Tidak                Tidak               Tidak
          │                   │                   │
          ▼                   ▼                   ▼
    /sign-up?            /sign-up?           /sign-up?
    redirect=            redirect=           redirect=
    /get-started         /checkout/bpp       /checkout/pro
          │                   │                   │
          │ (setelah signup, auto-redirect)      │
          ▼                   ▼                   ▼
    /get-started        /checkout/bpp      /checkout/pro
    (set onboarding     (set onboarding    (set onboarding
     = false, show       = true, skip       = true, skip
     welcome)            welcome)           welcome)
```

**Catatan Penting:**
- User yang klik BPP/PRO dari pricing → setelah signup langsung ke checkout, **skip welcome page**
- User yang klik Gratis dari pricing → setelah signup ke welcome page (untuk upsell opportunity)
- `hasCompletedOnboarding` di-set `true` saat signup dengan redirect intent ke checkout

### Upsell untuk Returning User

Returning user yang sudah skip welcome page punya upsell di:
- **Badge "Upgrade"** di chat page (`src/app/chat/page.tsx`)
- **Option upgrade** di "Atur Akun" modal (`src/components/settings/UserSettingsModal.tsx`)

**Flow upgrade dari chat/settings:**
```
/chat → badge "Upgrade" → /checkout/bpp (langsung)
        atau
Settings modal → "Upgrade" → /checkout/bpp (langsung)
```

**Tidak perlu** melewati `/get-started` karena:
- User sudah familiar dengan app
- `hasCompletedOnboarding` sudah `true`
- Intent jelas: upgrade

---

## Scope Pekerjaan

| # | Item | Status | Keterangan |
|---|------|--------|------------|
| 1 | Homepage PricingSection | **Redesign** | Jadi `PricingTeaser` (simplified cards + carousel mobile + CTA global) |
| 2 | Pricing Page | **Redesign** | Full comparison + direct CTAs per tier + redirect logic |
| 3 | Onboarding Layout | **New** | Minimal layout untuk route group `(onboarding)` |
| 4 | Welcome Page (`/get-started`) | **New** | First-time onboarding + upsell BPP/PRO |
| 5 | Checkout BPP (`/checkout/bpp`) | **Move/Redesign** | Pindah dari topup, logika sama, pakai OnboardingLayout |
| 6 | Checkout PRO (`/checkout/pro`) | **New (UI Only)** | Halaman ada, CTA "Segera Hadir", backend menyusul |
| 7 | Database: `hasCompletedOnboarding` | **New field** | Flag di table `users` untuk first-time detection |
| 8 | Redirect Logic | **New** | Handle `?redirect=` param di sign-up flow |

---

## Route Structure

### Current Routes
```
/                           → Homepage (marketing)
/pricing                    → Pricing page (marketing)
/dashboard/subscription/topup → BPP checkout (dashboard)
```

### Proposed Routes
```
/                           → Homepage (marketing) - teaser pricing
/pricing                    → Full pricing page (marketing)
/get-started                → Welcome/onboarding (first-time user)
/checkout/bpp               → BPP credit purchase
/checkout/pro               → PRO subscription
```

### Route Group Structure

```
src/app/
├── (marketing)/              ← Public, no auth required
│   ├── layout.tsx            ← Marketing layout (header + footer)
│   ├── page.tsx              ← Homepage
│   └── pricing/page.tsx      ← Full pricing page
│
├── (auth)/                   ← Clerk authentication pages
│   ├── sign-in/[[...sign-in]]/page.tsx
│   └── sign-up/[[...sign-up]]/page.tsx
│
├── (onboarding)/             ← NEW: Protected, minimal layout
│   ├── layout.tsx            ← Minimal header (logo + back), NO sidebar
│   ├── get-started/page.tsx  ← Welcome page untuk first-time user
│   └── checkout/
│       ├── bpp/page.tsx      ← BPP credit purchase
│       └── pro/page.tsx      ← PRO subscription (UI only, CTA disabled)
│
├── (dashboard)/              ← Full dashboard dengan sidebar
│   └── ...existing routes
│
└── chat/                     ← Main app (chat interface)
    └── ...existing routes
```

### Layout `(onboarding)`

**Karakteristik:**
- **Protected** - require authentication (redirect ke sign-in jika belum login)
- **Minimal header** - hanya logo + tombol back/close
- **Tanpa sidebar** - fokus penuh ke conversion
- **Tanpa footer** - clean, distraction-free
- **Centered content** - card-style layout untuk form/selection

**Close Button Behavior:**
- Dari `/get-started` → ke `/` (homepage) + **set `hasCompletedOnboarding = true`**
- Dari `/checkout/*` → ke `/pricing` (fixed destination, tidak support previous page)

**Prinsip:** Halaman checkout/onboarding butuh **fokus**, tanpa distraksi navigasi lengkap.

---

## Komponen yang Terlibat

### Perlu Dibuat Baru
| Komponen | Lokasi | Deskripsi |
|----------|--------|-----------|
| `PricingTeaser.tsx` | `src/components/marketing/` | Simplified pricing cards untuk homepage (dengan carousel + dots di mobile) |
| `OnboardingLayout` | `src/app/(onboarding)/layout.tsx` | Minimal layout untuk onboarding pages (logo + back, no sidebar) |
| `GetStartedPage` | `src/app/(onboarding)/get-started/page.tsx` | Welcome page untuk first-time user |
| `CheckoutBPPPage` | `src/app/(onboarding)/checkout/bpp/page.tsx` | BPP credit purchase (pindah dari topup) |
| `CheckoutPROPage` | `src/app/(onboarding)/checkout/pro/page.tsx` | PRO subscription (UI only, CTA disabled) |

### Perlu Dipindah & Redesign
| Komponen | Dari | Ke | Keterangan |
|----------|------|-----|------------|
| Checkout BPP | `src/app/(dashboard)/subscription/topup/page.tsx` | `src/app/(onboarding)/checkout/bpp/page.tsx` | **Logika & fungsi payment tetap sama**, pindah ke route group baru |

**Catatan Checkout BPP:**
- Semua logic pembayaran (QRIS, VA, E-Wallet) sudah berfungsi di topup page
- Yang perlu diubah: route, layout wrapper, dan styling agar match dengan onboarding flow
- Integrasi Xendit tetap dipertahankan
- Hapus dashboard-specific elements (breadcrumb, sidebar references)

### Perlu Dimodifikasi
| Komponen | Perubahan |
|----------|-----------|
| `src/app/(marketing)/page.tsx` | Ganti `PricingSection` dengan `PricingTeaser` |
| `src/app/(marketing)/pricing/page.tsx` | Redesign dengan full features + CTAs |
| `src/components/marketing/PricingSection.tsx` | Mungkin di-refactor atau deprecated |

### Mungkin Deprecated
| File | Alasan |
|------|--------|
| `src/app/(dashboard)/subscription/topup/page.tsx` | Dipindah ke `/checkout/bpp` |

---

## Catatan Diskusi

### 2026-01-31 - Initial Brainstorming

**Masalah yang Diidentifikasi:**
1. Redundansi PricingSection di homepage dan pricing page
2. Pricing page tidak punya CTA (`showCta={false}`)
3. Topup page hanya untuk BPP, tidak ada flow untuk PRO

**Keputusan:**
1. Pilih **Opsi A: Diferensiasi Konten** - homepage teaser, pricing page full
2. Welcome page hanya untuk **first-time user** (bukan setiap login)
3. Route welcome page: `/get-started`
4. Checkout routes: `/checkout/bpp` dan `/checkout/pro`

**Pertanyaan Terbuka:**
- [x] ~~Detail UI/UX untuk PricingTeaser (homepage)~~ → Lihat [wireframes.md](./wireframes.md)
- [x] ~~Detail UI/UX untuk Welcome Page~~ → Lihat [wireframes.md](./wireframes.md)
- [ ] PRO subscription: payment flow detail (recurring billing via Xendit)
- [x] ~~OnboardingLayout: exact design untuk minimal header~~ → Lihat [wireframes.md](./wireframes.md)

**Pertanyaan Terjawab:**
- [x] ~~First-time detection: pakai flag di database atau cookie?~~ → **Database flag `hasCompletedOnboarding`**
- [x] ~~Bagaimana handle redirect setelah login dari pricing page?~~ → **Query param `?redirect=`**
- [x] ~~Kapan set hasCompletedOnboarding = true?~~ → **Saat meninggalkan /get-started ATAU signup dengan redirect intent**
- [x] ~~Route group untuk onboarding pages?~~ → **`(onboarding)` dengan minimal layout**
- [x] ~~Flow upgrade dari chat/settings?~~ → **Langsung ke /checkout/*, skip welcome**
- [x] ~~Mobile layout PricingTeaser?~~ → **Carousel horizontal dengan dots (sama seperti PricingSection)**

---

## Detail Tier & Pricing

### Sistem Kredit
- **1 kredit = 1.000 tokens** (input + output)
- Kredit dibulatkan ke atas per 1.000 tokens
- Referensi: [tokens-to-credit.md](../tokens-to-credit/bpp/tokens-to-credit.md)

### Tier 1: GRATIS
| Aspek | Value |
|-------|-------|
| Harga | Rp 0 |
| Kredit | 100 kredit / bulan |
| Features | - Menggunakan 13 tahap workflow |
| | - Diskusi dan menyusun draft paper |

### Tier 2: BAYAR PER PAPER (BPP)
| Aspek | Value |
|-------|-------|
| Harga | Rp 80.000 |
| Kredit | 300 kredit (setara 15 halaman paper) |
| Features | - Bayar hanya ketika butuh menyusun paper |
| | - Full 13 tahap workflow |
| | - Draft hingga paper utuh |
| | - Diskusi sesuai konteks paper |
| | - Export Word & PDF |
| | - Tanpa limit bulanan/harian |

### Tier 3: PRO
| Aspek | Value |
|-------|-------|
| Harga | Rp 200.000 /bulan |
| Kredit | 5.000 kredit / bulan |
| Features | - Menyusun 5-6 paper (setara 75-90 halaman) |
| | - Full 13 tahap workflow |
| | - Draft hingga paper utuh |
| | - Diskusi tak terbatas |
| | - Export Word & PDF |
| | - Credit balance sebagai cadangan saat quota habis |

**Status PRO:** UI/halaman checkout dibuat sekarang, tapi CTA menampilkan **"Segera Hadir"** (disabled). Backend payment untuk recurring subscription digarap menyusul. Ini memudahkan implementasi lanjutan karena struktur halaman sudah siap.

---

## File Terkait

- [Design System Home](../visual-design/home/design-system.md)
- [File Index Home](../visual-design/home/file-index.md)
- [Tokens to Credit](../tokens-to-credit/bpp/tokens-to-credit.md)

---

## Quick Summary

### Keputusan Utama
1. **Diferensiasi Konten** - Homepage teaser, Pricing page full
2. **First-time detection** - Database flag `hasCompletedOnboarding`
3. **Redirect preservation** - Query param `?redirect=` untuk intent dari pricing
4. **Route group** - `(onboarding)` dengan minimal layout
5. **PRO status** - UI ready, CTA "Segera Hadir", backend menyusul

### Files to Create
- `src/app/(onboarding)/layout.tsx`
- `src/app/(onboarding)/get-started/page.tsx`
- `src/app/(onboarding)/checkout/bpp/page.tsx`
- `src/app/(onboarding)/checkout/pro/page.tsx`
- `src/components/marketing/PricingTeaser.tsx`

### Files to Modify
- `src/app/(marketing)/page.tsx` - ganti PricingSection → PricingTeaser
- `src/app/(marketing)/pricing/page.tsx` - redesign dengan CTAs
- `convex/schema.ts` - tambah field `hasCompletedOnboarding`

### Files to Deprecate
- `src/app/(dashboard)/subscription/topup/page.tsx` - dipindah ke `/checkout/bpp`
