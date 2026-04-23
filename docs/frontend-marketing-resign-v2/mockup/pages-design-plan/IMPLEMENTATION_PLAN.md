# Implementation Plan: Multi-Page Marketing Mockup

Tanggal: 23 April 2026
Worktree: `/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2`
Design source: `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/DESIGN_DOC.md`
Audit source: `docs/frontend-marketing-resign-v2/mockup/pages-design-plan/AUDIT.md`

## Tujuan Eksekusi

Implementasi ini menambahkan multi-page marketing mockup yang meniru halaman production marketing dan menambahkan halaman mockup-only dari kebutuhan navigasi baru. Semua perubahan runtime harus tetap berada di:

```text
docs/frontend-marketing-resign-v2/mockup/
```

Tidak boleh ada perubahan production source di:

```text
src/
```

Mockup tetap harus berjalan sebagai static HTML React UMD + Babel melalui:

```bash
npx serve "/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2/docs/frontend-marketing-resign-v2/mockup"
```

## Prinsip Eksekusi

1. **Runtime safety lebih penting daripada kelengkapan visual.** Jika ada konflik antara interaktivitas kompleks dan stabilitas static mockup, pilih static mockup yang stabil.
2. **Hash route adalah satu-satunya routing layer.** Jangan membuat multi-HTML route atau server rewrite.
3. **Global script pattern tetap dipakai.** Jangan memakai `import`, `export`, path alias, TypeScript, Next.js API, Convex, atau fetch.
4. **Production-parity tidak boleh dicampur dengan mockup-only.** Page yang belum ada di production harus tetap jelas sebagai page tambahan mockup.
5. **Jangan mengubah desain home kecuali dibutuhkan untuk route integration.**
6. **Jangan stage screenshot folder.**

## Workflow Per Page

Implementasi harus berjalan per page agar tertib dan mudah dikoreksi.

Urutan kerja wajib untuk setiap page:

1. Implement satu page saja sesuai urutan prioritas.
2. Jalankan verifikasi minimal untuk page itu.
3. Berhenti dan laporkan hasil untuk dikoreksi.
4. Revisi sampai page itu solid.
5. Commit hanya perubahan untuk page tersebut dan perubahan shared yang memang diperlukan oleh page itu.
6. Lanjut ke page berikutnya setelah commit page sebelumnya selesai.

Jangan mengerjakan beberapa page sekaligus dalam satu batch besar. Exception hanya boleh untuk fondasi routing awal (`MockRouter`, layout children, header/footer route links, dan script order), karena semua page bergantung pada fondasi itu. Fondasi routing harus selesai, diverifikasi, dan commit lebih dulu sebelum implementasi page individual dimulai.

Urutan commit yang direkomendasikan:

1. Routing foundation.
2. `PricingPage`.
3. `DocumentationPage`.
4. `BlogPage`.
5. `AboutPage`.
6. `PolicyPage` untuk `privacy`, `security`, dan `terms`.
7. `FeaturesPage`.
8. `FAQPage`.
9. `RoadmapPage`.
10. `ChangelogPage`.
11. `StatusPage`.
12. `PartnershipPage`.

Jika satu page membutuhkan shared primitive atau data shared, buat shared change itu di commit page pertama yang benar-benar membutuhkannya. Jangan membuat abstraction di awal hanya karena kemungkinan akan dipakai.

## Multiagents Orchestrator Workflow

Implementasi harus dijalankan dengan pola multiagents orchestrator.

Peran utama:

1. **Orchestrator utama** memegang konteks penuh, memilih unit kerja berikutnya, menetapkan scope, mengintegrasikan hasil, menjalankan verifikasi, dan menentukan kapan berhenti untuk koreksi.
2. **Content agent** menulis UI copy dan konten halaman sesuai aturan bahasa Indonesia semi-formal dengan pronoun `Kamu`.
3. **UI implementation agent** membuat struktur JSX dan styling halaman sesuai desain mockup, tanpa mengubah production `src/`.
4. **Navigation/routing agent** menangani hash routing, header/footer links, active state, dan mobile menu behavior.
5. **QA/audit agent** mengecek compliance terhadap design doc, implementation plan, runtime constraints, bahasa UI, dan verification commands.

Aturan dispatch:

- Dispatch agent hanya untuk task khusus yang scope-nya jelas.
- Jangan memberi dua agent write scope yang sama pada waktu bersamaan.
- Untuk workflow per-page, satu page tetap menjadi unit utama. Multiagents boleh bekerja di dalam unit page yang sama, tetapi orchestrator harus menggabungkan hasilnya sebelum checkpoint.
- Untuk routing foundation, agent boleh dipisah antara routing/navigation dan QA, tetapi commit tetap satu checkpoint foundation.
- Content agent tidak boleh mengubah struktur runtime kecuali diminta eksplisit oleh orchestrator.
- UI implementation agent tidak boleh mengubah isi copy besar tanpa koordinasi dengan content agent.
- QA/audit agent tidak boleh mengedit file; tugasnya memberi temuan dan rekomendasi.
- Orchestrator wajib membaca dan menilai hasil agent sebelum mengklaim page solid.

Contoh dispatch per page:

1. Content agent: susun copy page, CTA, empty state, dan label.
2. UI implementation agent: implement layout page dan integrasi komponen.
3. QA/audit agent: audit hasil terhadap plan, bahasa, static runtime, dan visual constraints.
4. Orchestrator: revisi integrasi, jalankan verifikasi, stop untuk koreksi user, lalu commit setelah approved.

## Aturan Bahasa UI Dan Konten

Semua UI copy dan konten halaman mockup harus memakai bahasa Indonesia semi-formal yang jelas, rapi, dan mudah dipahami.

Aturan wajib:

- Gunakan pronoun `Kamu` untuk menyapa user.
- Jangan memakai pronoun `lo`, `gue`, `elu`, atau variasi Jakarta/slang lain.
- Jangan memakai aksen Jakarta dalam UI copy dan konten page.
- Tiru pola bahasa home mockup yang sudah jadi: ringan, manusiawi, tetapi tetap semi-formal.
- Technical terms boleh tetap dalam English jika lebih natural atau tidak punya padanan Indonesia yang jelas, misalnya `workflow`, `export`, `status`, `release`, `incident`, `paper`, dan `dashboard`.
- Untuk label navigasi, CTA, empty state, dan body copy, prioritaskan kalimat yang langsung menjelaskan manfaat atau aksi.

## Target Route Registry

Route final di mockup:

| Hash route | Page component | Source status |
| --- | --- | --- |
| `#/` | `MarketingHomePage` | Existing production-parity home |
| `#/pricing` | `PricingPage` | Production-parity |
| `#/documentation` | `DocumentationPage` | Production-parity |
| `#/blog` | `BlogPage` | Production-parity landing only |
| `#/about` | `AboutPage` | Production-parity |
| `#/privacy` | `PolicyPage` with `privacy` content | Production-parity |
| `#/security` | `PolicyPage` with `security` content | Production-parity |
| `#/terms` | `PolicyPage` with `terms` content | Production-parity |
| `#/features` | `FeaturesPage` | Mockup-only |
| `#/faq` | `FAQPage` | Mockup-only |
| `#/roadmap` | `RoadmapPage` | Mockup-only |
| `#/changelog` | `ChangelogPage` | Mockup-only |
| `#/status` | `StatusPage` | Mockup-only |
| `#/partnership` | `PartnershipPage` | Mockup-only |

Unknown route should render a compact not-found state inside `MarketingLayoutMock`, with a link back to `#/`.

## File Plan

### Add

```text
mockup/src/app/MockRouter.jsx
mockup/src/app/pages/PricingPage.jsx
mockup/src/app/pages/DocumentationPage.jsx
mockup/src/app/pages/BlogPage.jsx
mockup/src/app/pages/AboutPage.jsx
mockup/src/app/pages/PolicyPage.jsx
mockup/src/app/pages/FeaturesPage.jsx
mockup/src/app/pages/FAQPage.jsx
mockup/src/app/pages/RoadmapPage.jsx
mockup/src/app/pages/ChangelogPage.jsx
mockup/src/app/pages/StatusPage.jsx
mockup/src/app/pages/PartnershipPage.jsx
```

Conditional additions, only if they reduce real duplication or prevent page files from becoming too long:

```text
mockup/src/app/pages/pageData.jsx
mockup/src/components/shared/PagePrimitives.jsx
```

### Move

```text
mockup/src/app/MarketingHomePage.jsx
→ mockup/src/app/pages/MarketingHomePage.jsx
```

### Modify

```text
mockup/MakalahAI.html
mockup/src/app/MarketingLayoutMock.jsx
mockup/src/app/render.jsx
mockup/src/components/layout/header/GlobalHeaderMock.jsx
mockup/src/components/layout/footer/FooterMock.jsx
mockup/styles/components.css
```

### Do Not Modify

```text
src/
docs/frontend-marketing-resign-v2/screesnhots/
```

## Execution Steps

### Step 1: Prepare App Routing

1. Move `docs/frontend-marketing-resign-v2/mockup/src/app/MarketingHomePage.jsx` into `docs/frontend-marketing-resign-v2/mockup/src/app/pages/MarketingHomePage.jsx`.
2. Create `MockRouter.jsx`.
3. In `MockRouter.jsx`, use `window.location.hash` and React state to resolve the active route.
4. Add `hashchange` listener and cleanup.
5. Normalize empty hash, `#`, and `#/` to `/`.
6. Avoid regex for route understanding; use exact route map object.

Expected shape:

```jsx
const ROUTES = {
  "/": MarketingHomePage,
  "/pricing": PricingPage,
  "/documentation": DocumentationPage,
};
```

### Step 2: Update Layout And Render Entry

1. Update `MarketingLayoutMock` so it receives `children`.
2. Keep grid/grain backgrounds, `GlobalHeaderMock`, `<main>`, `FooterMock`, and `Tweaks` inside layout.
3. Update `render.jsx` to render:

```jsx
<MarketingLayoutMock>
  <MockRouter />
</MarketingLayoutMock>
```

4. Keep `Object.assign(window, { ... })` for `MarketingLayoutMock`, `MockRouter`, and `App`.

### Step 3: Update Header Navigation

1. Replace top nav anchors with hash routes:

```text
Home → #/
Fitur → #/features
Harga → #/pricing
Dokumentasi → #/documentation
Blog → #/blog
FAQ → #/faq
Tentang → #/about
```

2. Add active state based on current hash.
3. Preserve mobile menu open/close behavior.
4. When mobile menu link is clicked, close the menu.
5. Login action can remain `#` unless a production auth mock route is explicitly requested later.

### Step 4: Update Footer Navigation

1. Replace footer links with hash routes:

```text
Produk: Fitur, Harga, Roadmap, Changelog
Sumber daya: Dokumentasi, Blog, Status, Lapor Masalah
Perusahaan: Tentang, Kerja Sama, Karier, Kontak
Legal: Security, Terms, Privacy
```

2. Route links:

```text
Fitur → #/features
Harga → #/pricing
Roadmap → #/roadmap
Changelog → #/changelog
Dokumentasi → #/documentation
Blog → #/blog
Status → #/status
Tentang → #/about
Kerja Sama → #/partnership
Security → #/security
Terms → #/terms
Privacy → #/privacy
```

3. Keep `Lapor Masalah`, `Karier`, and `Kontak` as placeholders unless a page is explicitly requested.

### Step 5: Add Shared Page Primitives

Create `PagePrimitives.jsx` only for patterns used by at least three pages.

Recommended components:

```text
PageShell
PageHero
SectionHeader
InfoPanel
ListRow
StatusBadge
```

Rules:

- Keep components small and static.
- Do not introduce a design system separate from existing `tokens.css` and `components.css`.
- Use existing classes where possible.

### Step 6: Add Static Data

Create `pageData.jsx` if page files become too long.

Allowed:

- Plain arrays and objects.
- Indonesian user-facing copy.
- Static labels and statuses.

Forbidden:

- `fetch`
- Convex
- CMS wrappers
- JSON imports
- Next.js APIs

### Step 7: Implement Production-Parity Pages

Implement in this order.

#### 7.1 PricingPage

Goal: full pricing page, not home teaser.

Required:

- Badge.
- H1/subtitle.
- 3 pricing plans.
- Desktop grid.
- Mobile stack.
- CTA buttons.

Source:

- Production: `src/app/(marketing)/pricing/page.tsx`
- Existing mockup pricing section: `PricingTeaser.jsx`

#### 7.2 DocumentationPage

Goal: static docs page matching production layout.

Required:

- Sidebar navigation desktop.
- Search input UI.
- Article panel.
- Previous/next or next-step cards.
- Mobile-accessible nav surface, simple version acceptable.

Source:

- Production: `src/components/marketing/documentation/DocumentationPage.tsx`

#### 7.3 BlogPage

Goal: static blog landing page.

Required:

- Filter sidebar desktop.
- Featured article.
- Feed rows.
- Newsletter band.
- Mobile filter button UI can be static/simple.

Source:

- Production: `src/components/marketing/blog/BlogLandingPage.tsx`

#### 7.4 AboutPage

Goal: static about page.

Required:

- Manifesto.
- Problems.
- Agents.
- Career/contact.

Source:

- Production: `src/app/(marketing)/about/page.tsx`
- Components under `src/components/about/`

#### 7.5 PolicyPage

Goal: shared legal/policy template.

Required:

- Content map for `privacy`, `security`, `terms`.
- Badge.
- Title.
- Article sections.
- Last updated label.

Source:

- Production: `src/components/marketing/SimplePolicyPage.tsx`
- Production pages: `privacy`, `security`, `terms`.

### Step 8: Implement Mockup-Only Pages

Implement after production-parity pages.

#### 8.1 FeaturesPage

Required:

- Overview feature grid.
- Workflow.
- Refrasa.
- Research/source verification.
- Export/download.
- Human-in-the-loop controls.

Reuse visual patterns from home feature sections.

#### 8.2 FAQPage

Required:

- Compact page hero.
- Category tabs or static category chips.
- Accordion list.
- Support CTA.

May reuse FAQ data from existing home FAQ section and add category grouping.

#### 8.3 RoadmapPage

Required:

- Now / Next / Later lanes.
- Milestone timeline.
- Status badge per item.
- No overly precise promise dates unless data exists.

#### 8.4 ChangelogPage

Required:

- Version/date rows.
- Category tags.
- Summary and bullet changes.

#### 8.5 StatusPage

Required:

- Overall status.
- Service list.
- Incident history.
- Clear static/mockup data presentation.

#### 8.6 PartnershipPage

Required:

- Audience: kampus, lab, komunitas, institution.
- Benefits.
- Process.
- Contact CTA.

### Step 9: Update CSS

Only add CSS needed for new page patterns.

Preferred CSS groups:

```text
/* ---------- Page shell ---------- */
/* ---------- Docs page ---------- */
/* ---------- Blog page ---------- */
/* ---------- Policy page ---------- */
/* ---------- Roadmap/status/changelog ---------- */
```

Rules:

- Preserve OKLCH tokens.
- Do not change existing home section styling unless route integration requires it.
- Keep cards at 8px radius or less unless existing mockup class already uses larger radius.
- Avoid one-note palettes. Use sky for background depth, green for action/success, orange sparingly.

### Step 10: Update MakalahAI.html Script Order

Script order must be explicit and dependency-safe.

Recommended order:

1. `Primitives.jsx`
2. `PagePrimitives.jsx`, only if created.
3. Layout components: header/footer.
4. Existing marketing section components.
5. Page data, only if `pageData.jsx` is created.
6. Page components.
7. `Tweaks.jsx`
8. `MockRouter.jsx`
9. `MarketingLayoutMock.jsx`
10. `render.jsx`

Never rely on import/export.

### Step 11: Verification

Run these checks for the routing foundation and after every page checkpoint:

```bash
git diff --check
git diff --name-only -- src
rg -n "import |export |@/|Convex|next/|useQuery|fetch\\(" docs/frontend-marketing-resign-v2/mockup/src docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
rg -n "MockRouter|PricingPage|DocumentationPage|BlogPage|AboutPage|FeaturesPage|FAQPage|RoadmapPage|ChangelogPage|StatusPage|PartnershipPage" docs/frontend-marketing-resign-v2/mockup/src
```

Run JSX parser check. If `@babel/parser` is not available, document the exact error and treat it as an explicit verification limitation:

```bash
node -e 'const fs=require("fs"); const parser=require("@babel/parser"); const files=process.argv.slice(1); for (const f of files) parser.parse(fs.readFileSync(f,"utf8"), {sourceType:"script", plugins:["jsx"]}); console.log(`parsed ${files.length} jsx files`);' $(find docs/frontend-marketing-resign-v2/mockup/src -name "*.jsx" | sort)
```

Manual static preview is optional unless requested:

```bash
npx serve "/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2/docs/frontend-marketing-resign-v2/mockup"
```

## Acceptance Criteria

Implementation is complete only when every page has passed its own checkpoint. Per-page checkpoint is complete only when:

1. The page route renders through `MakalahAI.html#/<route>`.
2. Header/footer navigation still works.
3. Mobile menu still opens and closes.
4. UI copy follows the semi-formal Indonesian rule with pronoun `Kamu` and no lo-gue/Jakarta slang.
5. Shared changes are limited to what the page actually needs.
6. Verification commands pass or any limitation is documented.
7. The page has been reviewed, corrected, and committed before moving to the next page.

Overall implementation is complete only when:

1. `MakalahAI.html#/` renders home.
2. `MakalahAI.html#/pricing`, `#/documentation`, `#/blog`, `#/about`, `#/privacy`, `#/security`, and `#/terms` render production-parity mockup pages.
3. `MakalahAI.html#/features`, `#/faq`, `#/roadmap`, `#/changelog`, `#/status`, and `#/partnership` render mockup-only pages.
4. Header and footer route links point to the correct hash routes.
5. Mobile menu still opens and closes.
6. Unknown route falls back to a clear not-found or home-safe state.
7. No production `src/` file is modified.
8. No screenshot files are staged.
9. `git diff --check` passes.
10. JSX parser check passes or any parser limitation is documented.

## Commit Guidance

Commit after each page checkpoint passes. Do not wait until all pages are implemented before committing.

Recommended commit message pattern:

```text
Add <page-name> marketing mockup page
```

For routing foundation:

Recommended commit message:

```text
Add marketing mockup hash routing foundation
```

Before commit, inspect:

```bash
git status --short
git diff --cached --name-status
```

Do not include:

```text
docs/frontend-marketing-resign-v2/screesnhots/
```
