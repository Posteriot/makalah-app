# BPP Subscription Overview Layout Redesign

**Date:** 2026-02-17
**Scope:** Layout/visual only — no information changes
**Target user:** BPP (Bayar Per Paper) tier

## Problem

Halaman `/subscription/overview` untuk user BPP menampilkan 2 card full-width yang masing-masing minim konten, menghasilkan layout yang boros ruang vertikal dan terasa kosong. Halaman `/subscription/plans` untuk BPP cuma menampilkan 1 card Pro (min-height 280px) — terlalu sedikit konten untuk subpage sendiri.

## Decision

Konsep "Compact Single-Page":
- Merge tier info + credit meter jadi 1 card dengan 2-column internal layout + `border-hairline` divider
- Absorb Pro upgrade pitch dari `/plans` ke overview sebagai inline card
- Kurangi sidebar BPP dari 3 item ke 2 item

## Wireframe

```
┌──────────────────┐  ┌───────────────────────────────────────────────────────┐
│ SUBSCRIPTION     │  │                                                       │
│                  │  │  Subskripsi                                            │
│ * Overview     > │  │  Kelola langganan dan pantau penggunaan Anda          │
│   Riwayat        │  │                                                       │
│   Pembayaran     │  │  +------------------------+---------------------------+│
│                  │  │  | TIER SAAT INI          |  SALDO KREDIT             |│
│                  │  │  | [BPP]                  |                           |│
│                  │  │  | Bayar Per Paper         |  ==.................... |│
│                  │  │  |                         |  5 / 300 KREDIT          |│
│                  │  │  | [Top Up Kredit]         |                           |│
│                  │  │  |                         |  Kredit hampir habis?    |│
│                  │  │  |                         |  [Top Up]                |│
│                  │  │  +------------------------+---------------------------+│
│                  │  │                                                       │
│                  │  │  +---------------------------------------------------+│
│                  │  │  | * LELUASA DENGAN PRO               Rp200.000/bl   |│
│                  │  │  |                                                    |│
│                  │  │  | 5.000 kredit/bulan untuk menyusun 5-6 paper       |│
│                  │  │  | Sisa 295 kredit BPP tetap tersimpan.              |│
│                  │  │  |                                                    |│
│                  │  │  |                       [Lanjut ke Checkout Pro]     |│
│                  │  │  +---------------------------------------------------+│
│                  │  │                                                       │
└──────────────────┘  └───────────────────────────────────────────────────────┘
```

## Changes Per File

### 1. `src/app/(dashboard)/subscription/layout.tsx`

- `getSidebarItems()`: hapus item "Upgrade ke Pro" (slug `bpp`) untuk tier BPP
- Sidebar BPP jadi 2 item: Overview + Riwayat Pembayaran

### 2. `src/app/(dashboard)/subscription/overview/page.tsx`

Refactor `RegularOverviewView`:

**Card 1 — Merged Tier + Saldo (2-column internal):**
- Kiri: tier badge + deskripsi + tombol "Top Up Kredit" (link ke `/checkout/bpp?from=overview`)
- Kanan: progress bar + `used / total KREDIT` + warning/depleted state
- Divider: `border-hairline` vertikal antara kiri dan kanan
- Responsive: stack vertikal di mobile (`md:grid-cols-2`)

**Card 2 — Pro Pitch (full width, BPP only):**
- Data dari `useQuery(api.pricingPlans.getPlanBySlug, { slug: "pro" })`
- Layout horizontal: judul + harga di baris atas, deskripsi di tengah, tombol checkout di kanan bawah
- Catatan sisa kredit BPP muncul jika `currentCredits > 0`
- Tombol link ke `/checkout/pro?from=overview`
- Hanya render untuk tier BPP (bukan Pro, Gratis, atau Unlimited)

### 3. `src/app/(dashboard)/subscription/plans/page.tsx`

- Tambah early redirect: jika `currentTier === "bpp"`, redirect ke `/subscription/overview`
- Gratis user tetap bisa akses `/plans` normal (lihat BPP + Pro cards)

## What Does NOT Change

- `history/page.tsx` — tidak disentuh
- `AdminOverviewView` — tidak disentuh
- Warna, font, border, icon — semua tetap Mechanical Grace
- Gratis user flow di `/plans` — tetap bisa lihat BPP + Pro
- Mobile: card stack vertikal via `grid-cols-1`
