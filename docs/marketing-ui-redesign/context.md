# Marketing UI Redesign — Context

**Status:** Research
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-09

## Purpose

Dokumen konteks ini disusun sebagai fondasi awal untuk task:

- migrasi styling system
- redesign visual total saat diminta

Fondasi ini difokuskan pada area:

- desain dan styling UI di `home`
- desain dan styling UI di `about`
- desain dan styling UI di `pricing`
- desain dan styling UI di `documentation`
- desain dan styling UI di `blog`

Standar desain yang dipakai sebagai acuan dalam konteks ini adalah:

- `home`
- halaman `chat` yang sudah memakai token mandiri di `globals-new.css`
- `global header` marketing yang pada branch ini sudah dibersihkan dari gap styling audit dan sudah memakai jalur token `globals-new.css`

Misi yang menjadi landasan dokumen konteks ini:

- menata styling agar compliant dengan Tailwind
- melepas seluruh ketergantungan dari `globals.css`
- migrasi ke `globals-new.css`

Dokumen ini sengaja diposisikan sebagai dokumen riset dan temuan, agar bisa dipakai ulang baik untuk fase migrasi styling system maupun untuk fase redesign visual total jika scope itu diaktifkan nanti.

## Background

Branch ini disiapkan untuk pekerjaan pada halaman marketing:

- `home`
- `about`
- `pricing`
- `documentation`
- `blog`

Fokus pekerjaan yang sudah ditetapkan saat ini adalah:

- migrasi styling system
- penyelarasan standar token ke pola `home` dan halaman `chat`
- penghapusan ketergantungan styling terhadap `globals.css`
- perpindahan ke `globals-new.css`

Catatan batasan konteks:

- `redesign visual total` belum menjadi scope aktif pada tahap ini
- dokumen ini hanya merangkum riset dan temuan kode
- dokumen ini sengaja tidak memuat rekomendasi implementasi

## Scope yang Diamati

Area kode utama yang diamati dalam riset ini:

- [`src/app/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/layout.tsx)
- [`src/app/globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css)
- [`src/app/globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)
- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- [`src/app/(marketing)/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/page.tsx)
- [`src/app/(marketing)/about/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/about/page.tsx)
- [`src/app/(marketing)/pricing/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/pricing/page.tsx)
- [`src/app/(marketing)/documentation/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/documentation/page.tsx)
- [`src/app/(marketing)/blog/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/blog/page.tsx)
- [`src/components/marketing/hero/HeroCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/hero/HeroCMS.tsx)
- [`src/components/chat/shell/TopBar.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/chat/shell/TopBar.tsx)
- [`src/components/layout/header/GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`src/components/layout/footer/Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/components/marketing/documentation/DocumentationPage.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/documentation/DocumentationPage.tsx)
- [`src/components/marketing/documentation/DocSidebar.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/documentation/DocSidebar.tsx)
- [`src/components/marketing/blog/BlogLandingPage.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogLandingPage.tsx)
- [`src/components/marketing/blog/BlogFiltersPanel.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogFiltersPanel.tsx)
- [`src/components/marketing/blog/BlogNewsletterSection.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogNewsletterSection.tsx)
- [`src/components/about/ManifestoSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/ManifestoSectionCMS.tsx)
- [`src/components/about/ProblemsSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/ProblemsSectionCMS.tsx)
- [`src/components/about/AgentsSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/AgentsSectionCMS.tsx)
- [`src/components/about/CareerContactSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/CareerContactSectionCMS.tsx)
- [`src/components/marketing/pricing/PricingCard.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/pricing/PricingCard.tsx)

## Current State

### Global CSS entrypoint

Root app saat ini masih memuat dua file global sekaligus:

- `./globals.css`
- `./globals-new.css`

Kondisi ini terlihat di [`src/app/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/layout.tsx).

### Scope token aktif

Ada dua scope token yang sudah terlihat jelas:

- `data-ui-scope="core"` untuk non-chat pages
- `data-chat-scope` untuk chat pages

Scope `core` dipakai pada [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx).
Scope `chat` dipakai pada [`src/app/chat/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/chat/layout.tsx) dan komponen chat lain yang render di area chat.

### Halaman source of truth yang diminta

Patokan token yang sudah dikonfirmasi:

- `home`
- `chat`

Dalam riset ini, `home` direpresentasikan terutama oleh [`HeroCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/hero/HeroCMS.tsx), marketing shell, dan helper background marketing.
`chat` direpresentasikan oleh token `--chat-*` di [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css) dan komponen seperti [`TopBar.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/chat/shell/TopBar.tsx).

## Temuan Utama

### 1. Utility semantik sudah punya padanan di `globals-new.css`

Class semantik yang banyak dipakai halaman marketing sudah ada definisinya di `globals-new.css` dalam scope `core`, antara lain:

- `global-main`
- `text-narrative`
- `text-interface`
- `text-signal`
- `rounded-shell`
- `rounded-action`
- `rounded-badge`
- `border-hairline`
- `border-main`
- `p-comfort`
- `p-dense`
- `p-airy`
- `gap-comfort`
- `gap-dense`

Temuan ini menunjukkan bahwa sebagian fondasi utility semantik sudah dipindahkan ke jalur styling baru.

### 2. Utility semantik yang sama masih juga ada di `globals.css`

Inventory CSS menunjukkan utility semantik di atas masih punya definisi legacy di `globals.css`.
Artinya, saat ini ada periode transisi di mana utility yang sama hidup di dua tempat.

### 3. Ada class legacy yang masih hanya hidup di `globals.css`

Temuan paling jelas adalah `blog-neutral-input`.
Class ini masih didefinisikan di [`src/app/globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css) dan dipakai oleh:

- [`src/components/marketing/blog/BlogFiltersPanel.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogFiltersPanel.tsx)
- [`src/components/marketing/blog/BlogNewsletterSection.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogNewsletterSection.tsx)
- [`src/components/marketing/documentation/DocSidebar.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/documentation/DocSidebar.tsx)

Secara faktual, tiga komponen ini masih punya ketergantungan langsung ke styling legacy.

### 4. Banyak komponen target masih memakai raw palette lama

Beberapa komponen target masih memakai raw CSS variables seperti:

- `--slate-*`
- `--amber-*`
- `--teal-*`
- `--rose-*`
- `--emerald-*`

Contoh yang terlihat di kode:

- [`src/components/about/ManifestoSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/ManifestoSectionCMS.tsx)
- [`src/components/about/ProblemsSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/ProblemsSectionCMS.tsx)
- [`src/components/about/AgentsSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/AgentsSectionCMS.tsx)
- [`src/components/about/CareerContactSectionCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/about/CareerContactSectionCMS.tsx)
- [`src/components/marketing/pricing/PricingCard.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/pricing/PricingCard.tsx)

Dalam riset ini, raw palette tersebut masih tampak aman karena `globals.css` masih ikut dimuat di root app.

### 5. `globals-new.css` berisi sistem token baru, bukan salinan penuh palette lama

`globals-new.css` berisi pemetaan token `core`, `chat`, dan utility semantik berbasis scope.
Namun dari pembacaan file dan pencarian pemakaian raw palette, file ini tidak berperan sebagai salinan penuh dari seluruh raw palette lama `--slate-*`, `--amber-*`, `--teal-*`, `--rose-*`, dan `--sky-*`.

Temuan ini penting karena menjelaskan kenapa beberapa komponen marketing target masih bergantung pada keberadaan `globals.css`.

### 6. Bahasa visual `home` dan marketing shell sudah konsisten

Pola yang konsisten di `home` dan shell marketing yang saat ini aktif:

- layout `max-w-7xl`
- grid 16 kolom
- tekstur `GridPattern`, `DottedPattern`, `DiagonalStripes`
- tipografi dual-role: `text-narrative` dan `text-interface`
- radius semantik `rounded-shell`, `rounded-action`, `rounded-badge`
- penggunaan spacing semantik seperti `gap-comfort`, `p-comfort`, `p-airy`

Pola ini terlihat di:

- [`src/components/marketing/hero/HeroCMS.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/hero/HeroCMS.tsx)
- [`src/components/layout/header/GlobalHeader.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/header/GlobalHeader.tsx)
- [`src/components/layout/footer/Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/components/marketing/documentation/DocumentationPage.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/documentation/DocumentationPage.tsx)
- [`src/components/marketing/blog/BlogLandingPage.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/blog/BlogLandingPage.tsx)

### 7. `GlobalHeader` menjadi contoh migrasi yang sudah tervalidasi

Pada branch ini, `GlobalHeader` dan `UserDropdown` sudah melalui audit, desain, implementation plan, patch cleanup, dan verifikasi test.

Temuan yang bisa dicatat secara faktual dari hasil tersebut:

- auth CTA desktop dan mobile sudah memakai komponen bersama [`src/components/ui/auth-button.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/ui/auth-button.tsx)
- hover stripes dan state auth header sudah memakai token `core` di [`src/app/globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)
- item dropdown default `UserDropdown` sudah memakai semantic token seperti `foreground`, `accent`, `destructive`, dan `success`
- dead import, dead code, dan palette raw yang sebelumnya tersisa di area header sudah dibersihkan

Karena itu, `GlobalHeader` pada branch ini dapat dibaca sebagai contoh nyata komponen marketing yang sudah lebih dekat ke target branch:

- Tailwind-compliant
- berbasis token `globals-new.css`
- tidak lagi mengandalkan class hover/warna dari jalur legacy untuk state utamanya

### 8. Background helper marketing sudah terenkapsulasi di komponen

Pattern visual utama untuk background halaman marketing berada di komponen:

- [`GridPattern.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/SectionBackground/GridPattern.tsx)
- [`DottedPattern.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/SectionBackground/DottedPattern.tsx)
- [`DiagonalStripes.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/SectionBackground/DiagonalStripes.tsx)

Ketiga helper ini memakai nilai visual yang sudah dibakukan di level komponen, bukan class global utilitas biasa.

### 9. Kontrak styling yang sudah tampak stabil di jalur baru

Dari pembacaan `home`, `chat`, shell marketing, dan header yang sudah dibersihkan, ada kontrak styling yang sudah terlihat stabil untuk dipakai sebagai acuan observasi pada komponen marketing lain:

- scope styling aktif memakai `data-ui-scope="core"` untuk marketing pages
- token warna utama bergerak lewat `core`, bukan raw palette per-komponen
- utility semantik tetap dipakai untuk menyatakan peran visual, misalnya `text-narrative`, `text-interface`, `rounded-shell`, `rounded-action`, `border-hairline`
- state hover, active, dan destructive yang penting sudah bisa dinyatakan lewat token semantik seperti `accent`, `foreground`, `destructive`, `success`
- pattern dekoratif seperti diagonal stripes diposisikan sebagai layer efek berbasis token, bukan warna hardcoded di komponen
- loading state penting sudah mulai memakai skeleton agar konsisten dengan kontrak UI yang sedang dibangun

Bagian ini bukan rekomendasi implementasi rinci, tetapi rangkuman atas pola yang sekarang sudah benar-benar terlihat di kode branch ini.

## Halaman Target per Kondisi Saat Ini

### Home

`home` berperan sebagai referensi visual utama.
Komponen hero dan section marketing utama sudah banyak memakai utility semantik dan shell `core`.

### About

`about` page wrapper tipis, sementara styling nyata berada di komponen CMS section.
Komponen target di area ini sudah memakai utility semantik, tetapi masih juga memakai raw palette lama.

### Pricing

`pricing` page memakai struktur shell marketing yang sama dengan `home`.
Namun card-level styling di [`PricingCard.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/marketing/pricing/PricingCard.tsx) masih menyimpan pemakaian raw palette lama.

### Documentation

`documentation` page sudah memakai shell marketing yang cukup konsisten.
Ketergantungan legacy paling jelas ada pada search input sidebar melalui `blog-neutral-input`.

### Blog

`blog` page juga sudah berada di shell marketing baru.
Ketergantungan legacy yang paling terlihat ada pada search/filter/newsletter input melalui `blog-neutral-input`.

## Nilai Acuan untuk Halaman atau Komponen Lain

Jika dokumen ini dipakai sebagai pijakan untuk audit komponen marketing lain di branch yang sama, ada tiga lapisan acuan yang saat ini paling kuat secara kode:

- `home` untuk bahasa visual marketing utama
- `chat` untuk pola token mandiri berbasis scope
- `global header` untuk contoh komponen lintas-breakpoint yang sudah dibersihkan dari gap auth state, state loading, dan styling legacy

Dengan kata lain, halaman atau komponen marketing lain dapat dibandingkan terhadap tiga acuan ini untuk melihat:

- apakah tokennya sudah bergerak lewat `globals-new.css`
- apakah state pentingnya sudah memakai semantic token alih-alih raw palette lama
- apakah utility semantik dan shell visualnya masih satu bahasa dengan marketing frontpage

## Dokumen dan Referensi Desain yang Terkait

Referensi tekstual yang dibaca dalam riset ini:

- [`docs/makalah-design-system/docs/bahasa-visual.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/makalah-design-system/docs/bahasa-visual.md)
- [`docs/makalah-design-system/migration-guide.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/makalah-design-system/migration-guide.md)

Dokumen tersebut membantu menjelaskan bahasa visual dan transisi dari styling lama ke standar Mechanical Grace, tetapi isi dokumen konteks ini tetap dibatasi pada kondisi yang terverifikasi di kode saat ini.

## Open Questions

Pertanyaan yang masih terbuka dari hasil riset kode saat ini:

- Apakah semua raw palette lama yang masih dipakai di target pages memang dimaksudkan untuk tetap hidup lewat jalur baru, atau hanya sisa fase transisi?
- Apakah `blog-neutral-input` akan tetap dipertahankan sebagai abstraction khusus, atau hanya placeholder transisi dari styling lama?
- Apakah target akhir untuk halaman marketing nanti akan mempertahankan utility semantik seperti `text-narrative` dan `rounded-shell`, atau seluruhnya akan diarahkan ke utility Tailwind yang lebih eksplisit?

Dokumen ini tidak menjawab pertanyaan tersebut; pertanyaan ini hanya dicatat sebagai bagian dari konteks kerja.
