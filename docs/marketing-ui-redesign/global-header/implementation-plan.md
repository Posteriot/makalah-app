# Global Header Implementation Plan

**Status:** Planned
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-09

## Objective

Menurunkan desain di [`design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md) menjadi langkah implementasi yang bisa dieksekusi untuk memperbaiki `GlobalHeader` dan `UserDropdown`.

## Scope

Target implementasi:

- [`src/components/layout/header/GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`src/components/layout/header/UserDropdown.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/UserDropdown.tsx)
- [`src/lib/hooks/useCurrentUser.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/hooks/useCurrentUser.ts)
- test baru untuk header dan dropdown

## Phase 1: Stabilize Header Auth Contract

Tujuan fase:

- membuat satu kontrak auth render untuk header
- menghentikan keputusan render auth yang tersebar

Task:

1. Petakan input state auth yang benar-benar dibutuhkan header.
2. Bentuk kontrak render eksplisit untuk:
   - `loading`
   - `authenticated`
   - `unauthenticated`
   - `signingOut`
3. Hapus latch authenticated permanen yang tidak punya reset path.
4. Pastikan `GlobalHeader` menjadi satu-satunya penentu render auth CTA, dropdown, mobile auth section, dan kontrak visibilitas theme toggle.
5. Putuskan secara eksplisit hubungan antara kontrak auth header dan cache `lastKnownUser` di `useCurrentUser`.

Checkpoint:

- header punya satu sumber keputusan render auth
- tidak ada lagi kombinasi state auth yang kontradiktif di parent header
- tidak ada cache user yang bisa mempertahankan signed-in UI secara implisit

## Phase 2: Simplify `UserDropdown`

Tujuan fase:

- menjadikan `UserDropdown` komponen menu, bukan pengambil keputusan auth final

Task:

1. Kurangi ketergantungan `UserDropdown` pada session cache internal untuk keputusan render utama.
2. Pastikan dropdown hanya menerima data yang sudah valid dari parent header.
3. Pertahankan hanya state lokal yang memang milik dropdown:
   - `isOpen`
   - `isSigningOut` jika masih diperlukan secara lokal
4. Pastikan close behavior tetap aman untuk:
   - click-outside
   - `Escape`
   - menu action click
5. Pastikan dropdown tidak mengandalkan session cache lama untuk tetap tampil setelah auth final berubah.

Checkpoint:

- dropdown tidak lagi menentukan sendiri apakah user masih authenticated
- dropdown dapat force-close dari parent auth transition

## Phase 3: Harden Sign-out Flow

Tujuan fase:

- memastikan sign-out menjadi satu transisi global yang deterministik

Task:

1. Satukan aturan sign-out antara desktop dropdown dan mobile auth menu.
2. Pastikan semua menu auth ditutup saat sign-out dimulai.
3. Bekukan trigger dan action auth selama state `signingOut`.
4. Audit ulang apakah cookie clear manual, `signOut()`, dan hard redirect masih perlu tetap dipakai dalam bentuk sekarang atau perlu disusun ulang.
5. Pastikan theme toggle tidak menampilkan state auth yang tertinggal selama transisi logout.

Checkpoint:

- sign-out tidak meninggalkan stale menu
- tidak ada action auth yang masih aktif saat logout berjalan

## Phase 4: Preserve Redirect Context

Tujuan fase:

- memastikan CTA login tidak membuang context halaman

Task:

1. Ganti penyusunan `redirect_url` agar tidak hanya memakai `pathname`.
2. Sertakan query string dan hash yang relevan.
3. Terapkan konsisten pada desktop CTA dan mobile CTA.

Checkpoint:

- login redirect mengembalikan user ke context URL yang sama

## Phase 5: Refine Visual Contract

Tujuan fase:

- merapikan affordance visual header setelah perilaku state dibersihkan

Task:

1. Audit active nav state.
2. Selaraskan treatment visual antara:
   - theme toggle
   - auth CTA
   - dropdown trigger
3. Rapikan hierarchy mobile auth section agar satu keluarga dengan shell marketing.
4. Tetapkan kontrak visibilitas theme toggle yang sama antara desktop dan mobile.
5. Jaga semua styling tetap di token `core` dan utility yang sudah sejalan dengan `globals-new.css`.

Checkpoint:

- visual header lebih konsisten tanpa memperluas redesign di luar scope

## Phase 6: Add Test Coverage

Tujuan fase:

- membangun safety net untuk bug yang ditemukan audit

Task:

1. Tambah test render state untuk:
   - `loading`
   - `authenticated`
   - `unauthenticated`
   - `signingOut`
2. Tambah interaction test untuk:
   - open/close dropdown
   - open/close mobile menu
   - click-outside
   - `Escape`
3. Tambah auth transition test untuk:
   - revalidation singkat
   - sign-out
   - redirect preservation
4. Tambah test untuk memastikan cache user tidak membuat header tetap signed-in setelah auth final berubah.
5. Tambah test untuk memastikan visibilitas theme toggle konsisten di desktop dan mobile.
6. Pastikan tidak ada kombinasi UI auth yang saling bertabrakan di desktop dan mobile.

Checkpoint:

- ada coverage otomatis untuk area yang sebelumnya belum terlindungi

## Verification

Verifikasi minimum setelah implementasi:

1. Jalankan test header/dropdown yang baru.
2. Jalankan test suite yang relevan untuk auth UI jika ada.
3. Verifikasi manual pada:
   - desktop logged-in
   - desktop logged-out
   - mobile menu logged-in
   - mobile menu logged-out
   - sign-out flow
   - login redirect dengan query string atau hash
   - theme toggle desktop vs mobile pada state auth yang sama

## Deliverables

Deliverable yang diharapkan dari plan ini:

- header auth contract yang tersentral
- dropdown yang lebih sederhana dan deterministik
- sign-out flow yang lebih aman
- redirect login yang menjaga context URL
- test coverage baru untuk header auth behavior

## Related Docs

- [`readme-header.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/readme-header.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/audit-findings.md)
- [`design.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/global-header/design.md)
