# Marketing UI Redesign — Progress Log

**Branch:** `marketing-pages-ui-design`
**Updated:** 2026-03-10
**Purpose:** catatan perkembangan kerja yang sudah terjadi di branch ini, agar sesi baru bisa cepat memahami progress tanpa menebak dari commit satu per satu.

## Ringkasan

Progress branch ini saat ini paling maju di area `global header` dan `footer` non-chat.

Yang sudah terjadi:

- worktree branch khusus sudah dibuat dan dipakai sebagai ruang kerja terisolasi
- fondasi dokumentasi `marketing-ui-redesign` sudah dibangun
- `GlobalHeader` dan `UserDropdown` sudah diaudit, didesain ulang secara terbatas, diimplementasikan, diverifikasi, lalu dibersihkan dari gap styling audit
- `Footer` non-chat sudah diaudit, diturunkan ke migration checklist, didesain untuk cleanup migration, diimplementasikan, direview ulang, lalu diverifikasi
- baseline docs sudah diperbarui agar bisa dipakai sebagai acuan styling untuk halaman atau komponen marketing lain
- build issue Next.js terkait `useSearchParams()` tanpa `Suspense` sudah diperbaiki
- PR branch ini sudah merged dan preview Vercel sudah hijau

## Timeline Ringkas

### 1. Setup branch dan docs awal

- worktree baru dibuat di `.worktrees/marketing-pages-ui-design`
- `.env.local` dicopy ke worktree
- dependency `npm install` sudah dijalankan
- folder docs `docs/marketing-ui-redesign` dibuat

Dokumen awal yang dibuat:

- `README.md`
- `context.md`

### 2. Fondasi audit global header

Subfolder `global-header` dibuat untuk fokus audit header.

Dokumen yang dibuat:

- `global-header/readme-header.md`
- `global-header/audit-findings.md`
- `global-header/design.md`
- `global-header/implementation-plan.md`
- `global-header/qa-checklist.md`

### 3. Implementasi dan refinement global header

Perubahan utama yang sudah terjadi:

- kontrak auth header dirapikan agar state penting bergerak lewat alur tunggal
- stale authenticated UI dan stale session render dibersihkan
- redirect login dipertahankan lengkap dengan `pathname + query + hash`
- CTA `Chat` untuk signed-out user diarahkan ke `sign-in`, bukan `sign-up`
- skeleton loading ditambahkan untuk brand/logo dan main nav
- komponen baru `AuthButton` dibuat untuk menyatukan styling auth CTA
- `AuthButton` diterapkan ke tombol `Masuk` dan default desktop `UserDropdown`
- mobile menu dan mobile auth panel direfine beberapa putaran: ikon, spacing, density, tipografi, dan hierarchy
- cleanup audit dilakukan untuk menghapus dead code/import dan palette raw yang tertinggal di area header

### 4. Build fix sebelum merge

Vercel sempat gagal build karena `useSearchParams()` dipakai tanpa `Suspense` boundary.

Perbaikan yang dilakukan:

- `AiOpsContainer` dibungkus `Suspense` di route `/ai-ops`
- `GlobalHeader` dibungkus `Suspense` di layout marketing dan dashboard

Setelah patch itu:

- `npm run build` lulus penuh
- Vercel preview kembali hijau

### 5. Integrasi branch

- branch sudah dipush ke `origin/marketing-pages-ui-design`
- PR sudah dibuat dan merged ke `main`

### 6. Audit, migrasi, dan verifikasi footer non-chat

Subfolder `footer` dibuat untuk fokus audit dan migrasi footer non-chat lintas marketing/dashboard.

Dokumen yang dibuat:

- `footer/readme-footer.md`
- `footer/audit-findings.md`
- `footer/migration-checklist.md`
- `footer/design.md`
- `footer/implementation-plan.md`

Perubahan utama yang sudah terjadi:

- kontrak shell footer diseragamkan untuk non-chat lewat `data-ui-scope="core"` pada shell yang memakainya
- styling footer dipindahkan ke vocabulary footer-spesifik di `globals-new.css`
- ketergantungan footer pada utility legacy `globals.css` dibersihkan dari implementasi utamanya
- kontrak CMS dan link sistem `Lapor Masalah` dipertegas antara frontend dan editor CMS
- fallback social placeholder dibersihkan dan loading state footer dirapikan lewat skeleton internal
- regression tests footer dipindahkan ke lokasi tracked di source tree agar tidak hilang karena rule `.gitignore`
- review findings akhir ditutup dengan menghapus dead `Suspense` footer dan memperbaiki loading state custom social icon

## Commit Penting

- `619dfc0` `Refine global header auth contract`
- `52d0389` `Polish auth button styling`
- `d61ad10` `Refine mobile header account panel`
- `7327f33` `Refine mobile menu typography and spacing`
- `374cd38` `Clean up global header styling audit gaps`
- `08b59bc` `Refresh marketing redesign baseline docs`
- `ad428ce` `Add session handoff to marketing context`
- `aedd0c2` `Wrap search param routes in suspense`
- `5fb93e3` `Migrate non-chat footer to core scoped contract`
- `084f498` `Fix footer review findings`

## Baseline yang Sudah Tervalidasi

Tiga baseline yang sekarang paling aman dijadikan acuan:

- `home`
- `chat`
- `global header`
- `footer` non-chat

Makna praktisnya:

- `home` dipakai sebagai acuan bahasa visual marketing utama
- `chat` dipakai sebagai acuan pola token mandiri berbasis scope
- `global header` dipakai sebagai contoh komponen lintas-breakpoint yang sudah lebih dekat ke target migration state
- `footer` non-chat dipakai sebagai contoh komponen lintas-shell yang sudah dibersihkan dari kontrak legacy dan sudah punya regression tests tracked

## Yang Sudah Tervalidasi Secara Teknis

- `GlobalHeader` dan `UserDropdown` sudah bergerak lewat token `globals-new.css` untuk state utamanya
- `Footer` non-chat sudah bergerak lewat class footer-spesifik di `globals-new.css`
- auth CTA desktop dan mobile sudah disatukan lewat `AuthButton`
- state auth penting `loading`, `authenticated`, `unauthenticated`, `signingOut` sudah dipakai sebagai kontrak implementasi
- test khusus header, dropdown, hook user state, dan footer contract sudah tersedia
- `npm run typecheck` dan `npm run build` sudah sempat lulus di branch ini

## Area yang Masih Belum Digarap

Progress branch ini belum berarti seluruh marketing frontpage sudah selesai.

Area yang masih perlu kerja lanjutan:

- `about`
- `pricing`
- `documentation`
- `blog`
- dependency legacy yang masih hidup di `globals.css`
- raw palette lama yang masih tertinggal di komponen marketing target

## Dokumen yang Paling Penting untuk Dilanjutkan

Kalau sesi baru mau lanjut kerja, urutan baca paling efektif:

1. `context.md`
2. `progress-log.md`
3. paket dokumen `global-header/` bila butuh memahami pola kerja header yang sudah selesai
4. paket dokumen `footer/` bila butuh memahami pola audit-to-implementation yang sama untuk komponen non-chat berikutnya

## Status Saat Catatan Ini Dibuat

- branch kerja: `marketing-pages-ui-design`
- worktree: `.worktrees/marketing-pages-ui-design`
- PR branch ini: sudah merged
- preview Vercel: hijau
- fokus berikutnya yang paling masuk akal: audit dan migrasi halaman marketing lain dengan baseline `home`, `chat`, `global header`, dan `footer`
