# Footer Migration Implementation Plan

**Status:** Planned
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-10

## Objective

Menurunkan desain di [`design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/design.md) menjadi langkah implementasi yang bisa dieksekusi untuk membersihkan kontrak footer non-chat sebelum redesign visual dilakukan.

## Scope

Target implementasi:

- [`src/components/layout/footer/Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- [`src/app/(dashboard)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx)
- [`src/app/globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)
- [`convex/siteConfig.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/siteConfig.ts)
- [`convex/schema.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/schema.ts) bila perubahan contract CMS membutuhkannya
- [`src/components/admin/cms/FooterConfigEditor.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx)
- test baru untuk footer shell, fallback, dan auth redirect

## Phase 1: Unify Footer Shell Contract

Tujuan fase:

- membuat footer non-chat hidup di bawah kontrak shell token yang sama

Task:

1. Audit ulang semua layout yang saat ini merender `Footer`.
2. Samakan kontrak shell untuk marketing dan dashboard pada jalur token non-chat.
3. Pastikan footer tidak lagi mengandalkan utility yang hanya kebetulan tersedia dari `globals.css`.
4. Verifikasi route family di luar shell footer tetap diperlakukan sebagai boundary yang disengaja.

Checkpoint:

- footer marketing dan dashboard berjalan lewat kontrak shell yang sama
- tidak ada ambiguity lagi apakah dashboard footer berada di migration state atau legacy fallback state

## Phase 2: Normalize Semantic Token Usage

Tujuan fase:

- membersihkan akses token footer yang masih menembus semantic layer

Task:

1. Inventaris token footer yang masih langsung mengakses jalur `core`.
2. Ganti akses yang seharusnya memakai alias semantik seperti `--border-hairline`.
3. Rapikan separator dan elemen structural footer ke vocabulary token yang konsisten.
4. Verifikasi utility semantik footer tetap stabil di shell marketing dan dashboard.

Checkpoint:

- footer tidak lagi menyentuh token mentah tanpa alasan eksplisit
- vocabulary styling footer lebih dekat ke target migration state

## Phase 3: Clarify CMS vs System Authority

Tujuan fase:

- menjadikan kontrak footer dapat diprediksi dari CMS dan frontend

Task:

1. Putuskan kontrak final untuk `Lapor Masalah`.
2. Selaraskan render footer, contract CMS, dan editor CMS berdasarkan kontrak itu.
3. Jika override sistem dipertahankan, buat aturannya eksplisit di editor, docs internal, atau contract config yang relevan.
4. Pastikan struktur final footer tidak lagi berubah secara diam-diam dari yang admin edit.

Checkpoint:

- authority footer tidak lagi campuran secara implisit
- admin bisa memprediksi hasil render footer dengan lebih akurat

## Phase 4: Remove Misleading Fallbacks

Tujuan fase:

- membersihkan fallback yang tampak final tetapi masih placeholder

Task:

1. Audit ulang semua fallback footer yang masih interaktif tanpa data final.
2. Rapikan social fallback agar tidak lagi memakai affordance palsu `#`.
3. Putuskan default bottom bar minimum yang aman.
4. Verifikasi logo dan content fallback tidak misleading di mode CMS kosong atau parsial.

Checkpoint:

- fallback footer tidak tampak seperti state final yang utuh
- tidak ada link placeholder yang masih terlihat “valid”

## Phase 5: Add Footer Safety Net

Tujuan fase:

- memastikan cleanup footer terlindungi oleh pembuktian otomatis

Task:

1. Tambah render test untuk marketing dan dashboard footer.
2. Tambah test auth redirect `Lapor Masalah`.
3. Tambah test fallback CMS, render dengan config CMS lengkap, dan social behavior.
4. Tambah regression test untuk shell contract footer yang disepakati dan untuk memastikan struktur footer mengikuti kontrak CMS/sistem yang sudah dipilih.
5. Siapkan QA manual minimum untuk desktop/mobile marketing dan dashboard.

Checkpoint:

- footer migration state punya safety net test minimum
- perubahan footer tidak lagi hanya dibuktikan lewat inspeksi visual

## Verification

Verifikasi minimum setelah implementasi:

1. Jalankan test footer yang baru.
2. Jalankan test suite relevan untuk layout non-chat bila ada.
3. Verifikasi manual pada:
   - marketing desktop
   - marketing mobile
   - dashboard desktop
   - dashboard mobile
   - signed-in footer support link
   - signed-out footer support link
   - fallback footer saat config parsial

## Deliverables

Deliverable yang diharapkan dari plan ini:

- footer shell contract yang seragam di non-chat shell yang memakainya
- footer styling yang lebih disiplin ke semantic token layer
- kontrak CMS/footer yang lebih jelas
- fallback footer yang tidak misleading
- test coverage baru untuk footer migration state

## Related Docs

- [`readme-footer.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/readme-footer.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md)
- [`migration-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/migration-checklist.md)
- [`design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/design.md)
