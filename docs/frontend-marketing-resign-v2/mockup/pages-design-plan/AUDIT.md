# Audit: Multi-Page Marketing Mockup Plan

Tanggal: 23 April 2026
Scope: audit pra-implementation plan untuk `docs/frontend-marketing-resign-v2/mockup/`.

## Ringkasan

Design doc sudah selaras dengan struktur production marketing yang ada saat audit. Tidak ada production route untuk `features`, `faq`, `roadmap`, `changelog`, `status`, dan `partnership`; halaman tersebut harus diperlakukan sebagai mockup-only pages sampai production route dibuat.

Rekomendasi terbaik tetap hash routing, karena mockup berjalan dari satu `MakalahAI.html` dengan static server tanpa rewrite.

## Bukti Audit

Production marketing route yang ditemukan:

```text
src/app/(marketing)/about/page.tsx
src/app/(marketing)/blog/[slug]/page.tsx
src/app/(marketing)/blog/page.tsx
src/app/(marketing)/documentation/page.tsx
src/app/(marketing)/layout.tsx
src/app/(marketing)/page.tsx
src/app/(marketing)/pricing/page.tsx
src/app/(marketing)/privacy/page.tsx
src/app/(marketing)/security/page.tsx
src/app/(marketing)/terms/page.tsx
```

Mockup runtime yang ditemukan:

```text
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingHomePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/Tweaks.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/render.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/footer/FooterMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/header/GlobalHeaderMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/**/*
docs/frontend-marketing-resign-v2/mockup/src/components/shared/Primitives.jsx
```

## Production Mapping

| Production route | Mockup target | Status |
| --- | --- | --- |
| `/` | `#/` | Existing home mockup. |
| `/pricing` | `#/pricing` | Needs full page mockup. |
| `/documentation` | `#/documentation` | Needs docs page mockup. |
| `/blog` | `#/blog` | Needs blog landing mockup. |
| `/blog/[slug]` | Deferred | Do not implement in phase one unless requested. |
| `/about` | `#/about` | Needs about page mockup. |
| `/privacy` | `#/privacy` | Use shared policy template. |
| `/security` | `#/security` | Use shared policy template. |
| `/terms` | `#/terms` | Use shared policy template. |

## Mockup-Only Mapping

| Route | Why included | Priority |
| --- | --- | --- |
| `#/features` | Top navigation includes Fitur. | High |
| `#/faq` | Top navigation includes FAQ. | High |
| `#/roadmap` | Footer includes Roadmap. | Medium |
| `#/changelog` | Footer includes Changelog. | Medium |
| `#/status` | Footer includes Status. | Medium |
| `#/partnership` | Footer includes Kerja Sama. | Medium |

## Accuracy Risks

1. **Route mismatch risk**
   Production has no `features`, `faq`, `roadmap`, `changelog`, `status`, or `partnership` routes. Implementation must label these as mockup-only and not imply production parity.

2. **Runtime risk**
   Adding many page files can break `MakalahAI.html` if script order is wrong. Implementation must load shared components, page components, router, layout, then render entry.

3. **Over-design risk**
   Pages like status, changelog, and docs are operational surfaces. They should stay dense and scannable, not become landing-page hero layouts.

4. **Data realism risk**
   Blog/docs/pricing production use Convex/CMS. Mockup must use static data only, and avoid pretending data is live.

5. **Navigation state risk**
   Header/footer links currently use anchors. Implementation must migrate links to hash routes and preserve mobile menu close behavior.

## Implementation Guardrails

- Keep all runtime changes under `docs/frontend-marketing-resign-v2/mockup/`.
- Do not stage `docs/frontend-marketing-resign-v2/screesnhots/`.
- Do not edit production `src/`.
- Do not add import/export.
- Do not add fetch, Convex, Next.js APIs, or dependency imports.
- Do not change OKLCH tokens unless the implementation requires a specific correction.
- Keep `MarketingLayoutMock` as the only chrome owner.

## Verification Commands

Run before committing implementation:

```bash
git diff --check
git diff --name-only -- src
rg -n "import |export |@/|Convex|next/|useQuery|fetch\\(" docs/frontend-marketing-resign-v2/mockup/src docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
rg -n "MockRouter|PricingPage|DocumentationPage|BlogPage|AboutPage|FeaturesPage|FAQPage|RoadmapPage|ChangelogPage|StatusPage|PartnershipPage" docs/frontend-marketing-resign-v2/mockup/src
```

Optional JSX parser check:

```bash
node -e 'const fs=require("fs"); const parser=require("@babel/parser"); const files=process.argv.slice(1); for (const f of files) parser.parse(fs.readFileSync(f,"utf8"), {sourceType:"script", plugins:["jsx"]}); console.log(`parsed ${files.length} jsx files`);' $(find docs/frontend-marketing-resign-v2/mockup/src -name "*.jsx" | sort)
```
