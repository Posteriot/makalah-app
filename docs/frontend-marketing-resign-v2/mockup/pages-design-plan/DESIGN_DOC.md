# Design Doc: Multi-Page Marketing Mockup

Tanggal: 23 April 2026
Worktree: `/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`

## Tujuan

Fase ini menambah halaman marketing lain ke static mockup tanpa mengubah production source di `src/`. Mockup harus tetap berjalan sebagai static HTML melalui React UMD + Babel dan tetap previewable dengan:

```bash
npx serve "/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2/docs/frontend-marketing-resign-v2/mockup"
```

Target utamanya adalah membuat mockup halaman marketing yang meniru arsitektur dan pengalaman halaman production, sambil menambahkan halaman baru yang belum ada di production tetapi sudah muncul sebagai kebutuhan navigasi mockup.

## Batasan

- Jangan mengubah production app source di `src/`.
- Jangan menambah bundler, ES module import/export, TypeScript, Next.js API, Convex query, Tailwind runtime, atau path alias.
- Semua file runtime mockup tetap di bawah `docs/frontend-marketing-resign-v2/mockup/`.
- Routing harus compatible dengan static file server.
- Header, footer, background, token OKLCH, dan visual language home mockup tetap menjadi dasar desain.
- Browser testing tidak wajib kecuali diminta terpisah.

## Audit Source Of Truth

Production marketing route yang benar saat audit:

```text
src/app/(marketing)/page.tsx
src/app/(marketing)/about/page.tsx
src/app/(marketing)/blog/page.tsx
src/app/(marketing)/blog/[slug]/page.tsx
src/app/(marketing)/documentation/page.tsx
src/app/(marketing)/pricing/page.tsx
src/app/(marketing)/privacy/page.tsx
src/app/(marketing)/security/page.tsx
src/app/(marketing)/terms/page.tsx
src/app/(marketing)/layout.tsx
```

Production layout menyediakan `GlobalHeader`, `<main className="global-main">`, dan `Footer`. Karena itu mockup harus mempertahankan `MarketingLayoutMock` sebagai chrome global, bukan membuat header/footer per halaman.

Mockup runtime saat audit:

```text
mockup/MakalahAI.html
mockup/src/app/MarketingHomePage.jsx
mockup/src/app/MarketingLayoutMock.jsx
mockup/src/app/Tweaks.jsx
mockup/src/app/render.jsx
mockup/src/components/layout/header/GlobalHeaderMock.jsx
mockup/src/components/layout/footer/FooterMock.jsx
mockup/src/components/marketing/**/*
mockup/src/components/shared/Primitives.jsx
mockup/styles/tokens.css
mockup/styles/components.css
```

## Page Scope

### Production-Parity Pages

Halaman ini harus dibuat dulu karena ada referensi langsung di production:

| Mockup route | Production reference | Tujuan mockup |
| --- | --- | --- |
| `#/` | `src/app/(marketing)/page.tsx` | Sudah ada sebagai home. |
| `#/pricing` | `src/app/(marketing)/pricing/page.tsx` | Halaman pricing penuh, berbeda dari `PricingTeaser`. |
| `#/documentation` | `src/app/(marketing)/documentation/page.tsx` | Halaman docs dengan sidebar/search statis. |
| `#/blog` | `src/app/(marketing)/blog/page.tsx` | Landing blog dengan filter/feed statis. |
| `#/about` | `src/app/(marketing)/about/page.tsx` | Manifesto, problem, agents, career/contact. |
| `#/privacy` | `src/app/(marketing)/privacy/page.tsx` | Policy page memakai template legal statis. |
| `#/security` | `src/app/(marketing)/security/page.tsx` | Policy page memakai template legal statis. |
| `#/terms` | `src/app/(marketing)/terms/page.tsx` | Policy page memakai template legal statis. |

### Mockup-Only Pages

Halaman ini belum ada sebagai production route saat audit, tetapi dibutuhkan karena muncul di navigasi mockup:

| Mockup route | Sumber navigasi | Tujuan mockup |
| --- | --- | --- |
| `#/features` | Navigasi atas: Fitur | Ringkasan fitur utama, memakai section home sebagai dasar. |
| `#/faq` | Navigasi atas: FAQ | FAQ dedicated page dengan kategori dan daftar pertanyaan. |
| `#/roadmap` | Footer: Roadmap | Roadmap publik, progress, dan milestone. |
| `#/changelog` | Footer: Changelog | Catatan perubahan produk. |
| `#/status` | Footer: Status | Status layanan, uptime, dan incident history statis. |
| `#/partnership` | Footer: Kerja Sama | Halaman kerja sama kampus/lab/komunitas. |

## Recommended Architecture

Gunakan hash routing, bukan banyak HTML file.

Rute berbentuk:

```text
MakalahAI.html#/
MakalahAI.html#/pricing
MakalahAI.html#/documentation
MakalahAI.html#/features
```

Alasan:

- Static server tidak perlu rewrite.
- `MakalahAI.html` tetap satu entrypoint.
- Header/footer bisa menjaga active route lewat `window.location.hash`.
- Nanti mapping ke Next.js tetap jelas karena tiap page mockup punya file sendiri.

Target struktur file:

```text
mockup/src/app/
  MockRouter.jsx
  MarketingLayoutMock.jsx
  Tweaks.jsx
  render.jsx
  pages/
    MarketingHomePage.jsx
    PricingPage.jsx
    DocumentationPage.jsx
    BlogPage.jsx
    AboutPage.jsx
    PolicyPage.jsx
    FeaturesPage.jsx
    FAQPage.jsx
    RoadmapPage.jsx
    ChangelogPage.jsx
    StatusPage.jsx
    PartnershipPage.jsx
```

`MarketingLayoutMock` harus menerima children atau active page output dari `MockRouter`. `Tweaks` tetap di layout agar berlaku global.

## Design Priority Rules

### P0: Runtime Safety

Ini paling dulu. Semua perubahan harus menjaga:

- `MakalahAI.html` tetap entrypoint.
- Tidak ada module import/export.
- Script order eksplisit dan valid.
- `Object.assign(window, { ... })` tetap pola expose komponen.
- Halaman unknown route fallback ke home atau not-found sederhana.

### P1: Chrome Global

Header dan footer didahulukan sebelum page detail.

Header target:

- `Home`
- `Fitur`
- `Harga`
- `Dokumentasi`
- `Blog`
- `FAQ`
- `Tentang`

Footer target:

- Produk: `Fitur`, `Harga`, `Roadmap`, `Changelog`
- Sumber daya: `Dokumentasi`, `Blog`, `Status`, `Lapor Masalah`
- Perusahaan: `Tentang`, `Kerja Sama`, `Karier`, `Kontak`
- Legal: `Security`, `Terms`, `Privacy`

`Lapor Masalah`, `Karier`, dan `Kontak` boleh tetap anchor/mail placeholder kecuali diminta jadi page.

### P2: Production-Parity Pages

Urutan implementasi:

1. `PricingPage`
2. `DocumentationPage`
3. `BlogPage`
4. `AboutPage`
5. `PolicyPage` untuk privacy/security/terms

Alasan: pricing/docs/blog/about punya struktur production yang paling terlihat dan paling mungkin dipakai untuk integrasi. Legal pages bisa berbagi satu template sehingga lebih murah dikerjakan setelah pola halaman stabil.

### P3: Mockup-Only Pages

Urutan implementasi:

1. `FeaturesPage`
2. `FAQPage`
3. `RoadmapPage`
4. `ChangelogPage`
5. `StatusPage`
6. `PartnershipPage`

Alasan: `Features` dan `FAQ` ada di top nav sehingga paling sering terlihat. Footer-only pages boleh menyusul karena entry point-nya lebih rendah.

### P4: Visual Polish

Polish dilakukan setelah semua page minimal ada:

- Active nav state untuk desktop dan mobile.
- Route-aware mobile menu close behavior.
- Shared page hero pattern.
- Shared listing/card/table pattern.
- Mobile spacing dan typography.
- Empty state untuk blog/docs/status.

## Page Design Direction

### Shared Page Frame

Buat komponen shared ringan:

```text
PageShell
PageHero
SectionHeader
InfoPanel
ListRow
```

Komponen ini bukan abstraction berat. Gunakan hanya jika mengurangi duplikasi antar halaman.

Visual direction:

- Background tetap dark engineering grid + sky/brand accent yang sudah ada.
- Card radius tetap maksimal `8px` kecuali style existing memerlukan lebih.
- Hindari hero marketing baru yang terlalu besar. Untuk halaman operasional seperti docs/status/changelog, gunakan layout dense dan mudah discan.
- Gunakan warna sky untuk background depth, green untuk action/success/accent utama, orange hanya sebagai aksen hangat yang terbatas.

### Pricing

Meniru production pricing page, bukan pricing teaser home:

- Header page dengan badge, title, subtitle.
- Grid 3 paket desktop.
- Mobile bisa stack, tidak perlu carousel dulu.
- Gunakan data statis dari mockup pricing saat ini agar konsisten.

### Documentation

Meniru production docs:

- Sidebar desktop.
- Search input statis.
- Article content panel.
- Mobile nav button boleh non-modal dulu jika tidak ada browser testing, tetapi route/content selection harus terlihat.

### Blog

Meniru production blog landing:

- Filter sidebar desktop.
- Featured/headline article.
- Feed article rows.
- Newsletter band.
- Search/filter boleh static UI tanpa real filtering pada fase pertama, kecuali implementasi ringan tidak mengganggu.

### About

Meniru production about:

- Manifesto.
- Problems.
- Agents.
- Career/contact.

Desain harus tetap nyambung dengan manifesto home, tetapi page about boleh lebih editorial.

### Legal/Policy

Gunakan satu `PolicyPage` berbasis content map:

```text
privacy
security
terms
```

Layout: centered article, badge, title, sections, last updated label.

### Features

Dedicated features page:

- Overview fitur.
- Workflow.
- Refrasa.
- Research/source verification.
- Export/download.
- Human-in-the-loop controls.

Gunakan section home sebagai sumber visual agar tidak membuat bahasa visual baru.

### FAQ

Dedicated FAQ page:

- Hero kecil.
- Category tabs statis.
- Accordion list.
- CTA support.

FAQ section home tetap boleh ada, tetapi page FAQ harus lebih lengkap.

### Roadmap

Footer-only page:

- Now / Next / Later.
- Milestone timeline.
- Status badge per item.
- Hindari janji tanggal terlalu presisi kalau tidak ada data.

### Changelog

Footer-only page:

- Version/date rows.
- Category tags.
- Summary + bullet changes.

### Status

Footer-only page:

- Overall status.
- Service list.
- Incident history.
- Semua data statis dan jelas sebagai mockup.

### Partnership

Footer-only page:

- Target kerja sama kampus/lab/komunitas.
- Benefit.
- Process.
- Contact CTA.

## Data Strategy

Gunakan data statis plain JavaScript di file page masing-masing atau `src/app/pages/page-data.jsx` jika mulai terlalu panjang.

Jangan memakai:

- Convex.
- fetch.
- CMS query.
- JSON import.
- Next.js route API.

Untuk fase pertama, data filtering/search boleh berupa UI statis. Jika ingin interaktif, gunakan React state lokal sederhana.

## Implementation Plan Outline

Implementation plan setelah design doc sebaiknya dibagi begini:

1. Buat `MockRouter.jsx` dan pindahkan `MarketingHomePage.jsx` ke `src/app/pages/`.
2. Update `MarketingLayoutMock.jsx` agar render children/router.
3. Update header/footer links ke hash route dan active state.
4. Tambah shared page primitives bila perlu.
5. Implement production-parity pages.
6. Implement mockup-only pages.
7. Update `MakalahAI.html` script order.
8. Verifikasi: `git diff --check`, JSX parser, `rg` route/component checks.

## Audit Checklist Untuk Implementasi

Sebelum implementasi:

- Pastikan worktree branch benar: `frontend-marketing-resign-v2`.
- Pastikan production `src/` tidak masuk diff.
- Pastikan screenshot folder tidak distage.
- Pastikan page list sesuai audit source of truth di atas.

Saat implementasi:

- Setiap file baru tetap global-script friendly.
- Jangan memakai import/export.
- Jangan membuat route dengan natural-language regex.
- Jangan menambah dependency.
- Jangan mengubah design token OKLCH tanpa kebutuhan langsung.
- Jangan mengubah visual home kecuali perlu untuk route integration.

Sesudah implementasi:

```bash
git diff --check
rg -n "import |export |@/|Convex|next/|useQuery|fetch\\(" docs/frontend-marketing-resign-v2/mockup/src docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
rg -n "MockRouter|PricingPage|DocumentationPage|BlogPage|AboutPage|FeaturesPage|FAQPage|RoadmapPage|ChangelogPage|StatusPage|PartnershipPage" docs/frontend-marketing-resign-v2/mockup/src
git diff --name-only -- src
```

Optional parser check:

```bash
node -e 'const fs=require("fs"); const parser=require("@babel/parser"); const files=process.argv.slice(1); for (const f of files) parser.parse(fs.readFileSync(f,"utf8"), {sourceType:"script", plugins:["jsx"]}); console.log(`parsed ${files.length} jsx files`);' $(find docs/frontend-marketing-resign-v2/mockup/src -name "*.jsx" | sort)
```

## Open Decisions

1. Browser testing belum masuk scope sampai diminta.
2. `Lapor Masalah`, `Karier`, dan `Kontak` belum dibuat sebagai halaman khusus.
3. Blog article detail `#/blog/:slug` belum masuk fase pertama; cukup blog landing dulu.
4. Mobile drawer untuk docs/blog boleh dibuat static-simple dulu, lalu diperkuat kalau user meminta browser validation.
