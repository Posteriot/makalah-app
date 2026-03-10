# Footer Migration Design

**Status:** Proposed design
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-10

## Goal

Desain ini disusun untuk membersihkan kontrak footer non-chat berdasarkan findings audit yang sudah dicatat di [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md).

Tujuan utamanya:

- memastikan footer non-chat benar-benar terpusat lewat kontrak shell yang konsisten
- mengurangi ketergantungan footer pada fallback legacy dari `globals.css`
- menegakkan pemakaian semantic token di jalur `globals-new.css`
- memperjelas authority CMS versus override sistem di footer
- membersihkan fallback yang masih terlihat seperti state final
- menyiapkan footer untuk redesign visual berikutnya tanpa membawa kontrak lama yang kabur

## Scope

Scope utama desain ini:

- [`src/components/layout/footer/Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- [`src/app/(dashboard)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx)
- [`src/app/globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)
- kontrak CMS footer di [`convex/siteConfig.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/siteConfig.ts)
- admin editor footer di [`src/components/admin/cms/FooterConfigEditor.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx)

Scope perilaku yang harus dibersihkan:

- shell contract footer lintas marketing dan dashboard
- token dan utility yang dipakai footer
- kontrak injeksi `Lapor Masalah`
- fallback logo, social, dan bottom bar
- test coverage footer

Non-scope desain ini:

- redesign visual total footer
- perubahan struktur footer untuk shell `chat`
- ekspansi footer global ke route family non-chat lain yang saat ini memang memakai layout berbeda

## Architecture Decision

### Single non-chat shell contract for global footer

Keputusan desain utama:

- footer tetap satu komponen global
- shell yang merender footer harus tunduk pada kontrak token yang sama
- footer tidak boleh lagi “benar” di marketing tetapi hanya “kebetulan selamat” di dashboard

Makna keputusan ini:

- sentralisasi footer tidak cukup berhenti di level import komponen
- sentralisasi harus mencakup scope token dan utility yang menjadi dasar styling footer
- shell footer non-chat harus eksplisit, bukan implisit lewat legacy globals

### Footer should prefer semantic tokens over raw core variables

Keputusan desain untuk styling:

- footer boleh tetap memakai vocabulary `core`
- tetapi jalur render utamanya harus lewat alias semantik yang memang sudah disediakan
- akses langsung ke token mentah hanya boleh tersisa jika memang tidak ada alias yang relevan

Makna praktisnya:

- separator, border, dan state surface footer harus dinyatakan lewat semantic layer bila tersedia
- utility semantik footer harus bisa dibaca sebagai kontrak UI, bukan kumpulan akses token mentah

### CMS authority must be explicit

Keputusan desain untuk konten:

- sistem harus menentukan dengan jelas apakah `Lapor Masalah` adalah item CMS atau item sistem
- editor CMS tidak boleh memberi kesan bahwa semua item footer bebas dikontrol jika hasil akhirnya masih dioverride frontend

Makna keputusan ini:

- bila `Lapor Masalah` tetap sistem-driven, override itu harus dianggap bagian dari kontrak
- bila ingin CMS-driven, frontend tidak boleh lagi membentuk ulang struktur secara diam-diam

### Fallback state must not mimic final state

Keputusan desain untuk fallback:

- fallback footer boleh ada sebagai transisi operasional
- tetapi fallback tidak boleh memberi affordance interaktif palsu atau menyaru sebagai konten final

Makna praktisnya:

- placeholder social link tidak boleh tampil seperti link final jika URL belum ada
- fallback bottom bar harus jelas sebagai default minimum atau tidak dirender sama sekali

## Interaction and Content Contract

### Footer shell behavior

- footer tetap dipakai oleh marketing dan dashboard non-chat
- footer harus hidup di bawah shell token yang sama pada kedua family tersebut
- route family lain yang tidak memakai footer global tetap diperlakukan sebagai boundary context, bukan scope pembersihan otomatis

### `Lapor Masalah`

- `Lapor Masalah` tetap diperlakukan sebagai jalur support khusus dari footer non-chat
- signed-in user menuju `/support/technical-report?source=footer-link`
- signed-out user menuju `sign-in` dengan `redirect_url`
- keputusan apakah link ini diatur CMS atau sistem harus ditegaskan dan lalu dibuat konsisten end-to-end

### CMS footer sections

- struktur section yang dilihat admin harus sejalan dengan struktur render final
- jika ada item sistem yang diinjeksi otomatis, aturannya harus eksplisit di editor dan frontend
- footer tidak boleh memiliki dua sumber kebenaran yang bertabrakan

### Social links and bottom bar

- social links hanya boleh tampil interaktif ketika URL final tersedia
- bottom bar hanya boleh merender field yang memang valid
- fallback tidak boleh menipu user dengan state “lengkap” palsu

## Testing Strategy

Footer dianggap bersih hanya jika perilakunya dibuktikan lewat test dan QA minimum.

### Render-state tests

Test minimal yang dibutuhkan:

- footer render di marketing shell
- footer render di dashboard shell
- fallback footer tanpa config lengkap
- footer dengan config CMS lengkap

### Contract tests

Yang harus diverifikasi:

- shell footer membaca kontrak token yang sama
- `Lapor Masalah` mengikuti auth state
- structure footer yang dirender sesuai kontrak CMS/sistem yang disepakati
- social placeholder tidak tampil sebagai affordance final yang salah

### Regression targets

- footer tetap satu komponen global untuk shell non-chat yang memang memakainya
- dashboard footer tidak lagi bertopang pada kebetulan fallback styling
- perubahan CMS footer tidak menghasilkan struktur yang tidak dapat diprediksi

## Done Criteria

Desain ini dianggap terpenuhi jika:

- footer non-chat punya kontrak shell token yang eksplisit dan seragam
- footer tidak lagi bergantung diam-diam pada jalur legacy untuk utility utamanya
- token footer memakai semantic layer bila aliasnya tersedia
- authority CMS versus sistem untuk `Lapor Masalah` jelas
- fallback footer tidak lagi menampilkan placeholder interaktif palsu
- tersedia coverage test minimum untuk shell, fallback, dan auth redirect footer

## Related Docs

- [`readme-footer.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/readme-footer.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md)
- [`migration-checklist.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/migration-checklist.md)

