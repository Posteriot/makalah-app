# Handoff Prompt: Multi-Page Marketing Mockup Implementation

You are working in this worktree:

```text
/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2
```

## Goal

Start a new implementation session for the multi-page static marketing mockup based on:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
```

This is the next phase after the home mockup structure was already modularized. The task is to implement additional mockup pages one by one, while preserving the static React UMD + Babel runtime.

## Current Git Context

Recent commits:

```text
48e1e9e6 Add marketing mockup pages implementation plan
7e83ceb2 Refactor marketing home mockup structure
b2873d2d Add marketing mockup adaptation handoff
```

Current known worktree status before this handoff update:

```text
 M docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
?? docs/frontend-marketing-resign-v2/screesnhots/
```

Notes:

- The `IMPLEMENTATION_PLAN.md` modification is intentional. It adds the per-page workflow and UI/content language rules.
- Do not stage or commit `docs/frontend-marketing-resign-v2/screesnhots/` unless explicitly requested.

## Primary Planning Docs

Read these first, in this order:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/DESIGN_DOC.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/AUDIT.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
```

The implementation plan is the operative document. The design doc and audit doc are source-of-truth guardrails.

## Strict Scope

Only edit files under:

```text
docs/frontend-marketing-resign-v2/mockup/
```

Do not edit production app source under:

```text
src/
```

Do not introduce:

- bundlers
- ES module `import` / `export`
- TypeScript
- Next.js APIs
- Tailwind runtime dependencies
- Convex queries
- `fetch`
- path aliases

The mockup must remain previewable with:

```bash
npx serve "/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2/docs/frontend-marketing-resign-v2/mockup"
```

Do not start browser testing or a Next.js dev server unless explicitly requested.

## Existing Mockup Runtime

The current mockup is static HTML using React UMD + Babel scripts:

```text
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
```

Current runtime files:

```text
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingHomePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/Tweaks.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/render.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/header/GlobalHeaderMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/footer/FooterMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/benefits/BenefitsSectionWrapper.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/demo/DemoSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/faq/FAQSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/features/RefrasaFeatureSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/features/WorkflowFeatureSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/hero/HeroSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/manifesto/ManifestoSection.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/marketing/pricing-teaser/PricingTeaser.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/shared/Primitives.jsx
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css
docs/frontend-marketing-resign-v2/mockup/styles/components.css
```

The existing home order is:

```text
MarketingLayoutMock
  GlobalHeaderMock
  main
    MarketingHomePage
      HeroSection
      BenefitsSectionWrapper
      WorkflowFeatureSection
      RefrasaFeatureSection
      ManifestoSection
      DemoSection
      PricingTeaser
      FAQSection
  FooterMock
  Tweaks
```

## Implementation Workflow

Follow the per-page process from `IMPLEMENTATION_PLAN.md`.

Mandatory workflow:

1. Implement one unit only.
2. Run relevant verification.
3. Stop and report for correction.
4. Revise until the unit is solid.
5. Commit only that unit.
6. Continue to the next unit after the previous unit is committed.

Do not implement multiple pages in one large batch.

Allowed first unit:

```text
Routing foundation
```

Routing foundation may include:

- `MockRouter.jsx`
- moving `MarketingHomePage.jsx` to `src/app/pages/MarketingHomePage.jsx` inside the mockup folder only
- `MarketingLayoutMock` children support
- header/footer hash route links
- `MakalahAI.html` script order updates
- active route state needed by navigation

Routing foundation must be verified and committed before starting individual page work.

Recommended page commit order after routing foundation:

1. `PricingPage`
2. `DocumentationPage`
3. `BlogPage`
4. `AboutPage`
5. `PolicyPage` for `privacy`, `security`, and `terms`
6. `FeaturesPage`
7. `FAQPage`
8. `RoadmapPage`
9. `ChangelogPage`
10. `StatusPage`
11. `PartnershipPage`

## Multiagents Orchestrator Workflow

Implementation must use a multiagents orchestrator workflow.

The main session acts as the orchestrator:

- owns the full context,
- chooses the next unit,
- defines agent scopes,
- integrates outputs,
- runs verification,
- stops for correction,
- commits only after the current unit is solid.

Dispatch specialized agents for specialized tasks:

- **Content agent**: writes UI copy and page content in semi-formal Indonesian with pronoun `Kamu`.
- **UI implementation agent**: builds JSX structure and styling for the current page or routing unit.
- **Navigation/routing agent**: handles hash routing, header/footer links, active state, and mobile menu behavior.
- **QA/audit agent**: audits compliance with design doc, implementation plan, static runtime constraints, language rules, and verification commands.

Hard rules:

- Dispatch agents only for clearly scoped tasks.
- Do not let two agents edit the same write scope at the same time.
- Do not batch multiple pages just because multiple agents are available.
- One page remains the main unit of work.
- QA/audit agents should report findings only and should not edit files.
- The orchestrator must inspect, integrate, and verify agent output before reporting success.
- Commit boundaries remain per checkpoint: routing foundation first, then one page at a time.

## Route Targets

Use hash routing only:

```text
MakalahAI.html#/
MakalahAI.html#/pricing
MakalahAI.html#/documentation
MakalahAI.html#/blog
MakalahAI.html#/about
MakalahAI.html#/privacy
MakalahAI.html#/security
MakalahAI.html#/terms
MakalahAI.html#/features
MakalahAI.html#/faq
MakalahAI.html#/roadmap
MakalahAI.html#/changelog
MakalahAI.html#/status
MakalahAI.html#/partnership
```

Production-parity pages:

```text
#/
#/pricing
#/documentation
#/blog
#/about
#/privacy
#/security
#/terms
```

Mockup-only pages:

```text
#/features
#/faq
#/roadmap
#/changelog
#/status
#/partnership
```

Unknown route should render a compact not-found state with a link back to `#/`.

## Navigation Targets

Header target:

```text
Home → #/
Fitur → #/features
Harga → #/pricing
Dokumentasi → #/documentation
Blog → #/blog
FAQ → #/faq
Tentang → #/about
```

Footer target:

```text
Produk: Fitur, Harga, Roadmap, Changelog
Sumber daya: Dokumentasi, Blog, Status, Lapor Masalah
Perusahaan: Tentang, Kerja Sama, Karier, Kontak
Legal: Security, Terms, Privacy
```

Footer route links:

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

`Lapor Masalah`, `Karier`, and `Kontak` can remain placeholders unless explicitly requested as pages.

## UI And Content Language Rules

All UI copy and page content in the mockup must use semi-formal Indonesian.

Rules:

- Use `Kamu` as the user-facing pronoun.
- Do not use `lo`, `gue`, `elu`, or Jakarta/slang variants in UI copy or page content.
- Do not use Jakarta accent in page copy.
- Match the language pattern already used in the finished home mockup: light, human, clear, and semi-formal.
- English technical terms are allowed when natural, for example `workflow`, `export`, `status`, `release`, `incident`, `paper`, and `dashboard`.
- Navigation labels, CTA, empty states, and body copy should explain the action or benefit directly.

Important distinction:

- User-facing UI/content must follow the semi-formal `Kamu` rule above.
- Code comments, AI model instructions, and prompt-like instruction layers should remain English, following the repository language policy.

## Design Priorities

1. Runtime safety.
2. Global chrome: header, footer, layout, routing.
3. Production-parity pages.
4. Mockup-only pages.
5. Visual polish.

Do not over-design operational pages (`documentation`, `status`, `changelog`). They should be dense, scannable, and practical, not hero-heavy marketing pages.

## Verification Commands

Run these after routing foundation and after each page checkpoint:

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

## Acceptance For The First New Session

The next implementation session should start with the routing foundation only.

Routing foundation acceptance:

1. `MakalahAI.html#/` still renders home.
2. Hash route registry exists and resolves known routes or a not-found fallback.
3. `MarketingLayoutMock` renders routed children inside `<main>`.
4. Header and footer links point to planned hash routes.
5. Mobile menu still opens and closes.
6. No production `src/` file is modified.
7. Screenshot folder is not staged.
8. `git diff --check` passes.
9. JSX parser check passes or a parser limitation is documented.
10. Stop for review before implementing `PricingPage`.

## Commit Guidance

Commit after each checkpoint is verified and approved.

Recommended first commit message:

```text
Add marketing mockup hash routing foundation
```

Do not include:

```text
docs/frontend-marketing-resign-v2/screesnhots/
```
