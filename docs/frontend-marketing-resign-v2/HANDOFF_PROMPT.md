# Handoff Prompt: Continue Multi-Page Marketing Mockup Implementation

You are working in this worktree:

```text
/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2
```

## Goal

Start a new implementation session to continue the multi-page static marketing mockup based on:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
```

The home mockup, hash routing foundation, pricing page, and documentation page have already been implemented. Continue with the remaining pages one by one, while preserving the static React UMD + Babel runtime.

## Current Git Context

Recent commits:

```text
814dcaea Add marketing mockup documentation page
549fcd62 Add marketing mockup pricing page
71a3e968 Add marketing mockup hash routing foundation
7456ba2f Update marketing mockup implementation handoff
48e1e9e6 Add marketing mockup pages implementation plan
```

Current known completed checkpoints:

```text
Home mockup structure
Routing foundation
PricingPage
DocumentationPage
```

Notes:

- Continue from `BlogPage` as the next implementation unit.
- `DocumentationPage` intentionally uses a shell layout instead of the marketing global chrome.
- `design_system_reference.md` now documents the distinction between marketing layout and shell layout.
- Do not stage or commit screenshot folders unless explicitly requested.

## Primary Planning Docs

Read these first, in this order:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/DESIGN_DOC.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/AUDIT.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
```

The implementation plan is the operative document. The design doc and audit doc are source-of-truth guardrails.

Also read:

```text
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
```

This file records the current design system direction, including the two layout families:

- **Marketing layout** for public marketing pages.
- **Shell layout** for documentation and the projected chat-style layout.

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
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/Tweaks.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/render.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/MarketingHomePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PricingPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/DocumentationPage.jsx
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
docs/frontend-marketing-resign-v2/mockup/src/components/shared/PagePrimitives.jsx
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

Completed units:

```text
Routing foundation
PricingPage
DocumentationPage
```

Next allowed unit:

```text
BlogPage
```

Recommended remaining page commit order:

1. `BlogPage`
2. `AboutPage`
3. `PolicyPage` for `privacy`, `security`, and `terms`
4. `FeaturesPage`
5. `FAQPage`
6. `RoadmapPage`
7. `ChangelogPage`
8. `StatusPage`
9. `PartnershipPage`

## Multiagents Orchestrator Workflow

Implementation must use an agents-team / multiagents orchestrator workflow. Do not work as a single undifferentiated implementer for substantial page work.

The main session acts as the orchestrator:

- owns the full context,
- chooses the next unit,
- defines agent scopes,
- dispatches specialist agents for bounded tasks,
- integrates outputs,
- runs verification,
- stops for correction,
- commits only after the current unit is solid.

Dispatch specialized agents for specialized tasks:

- **Content agent**: writes UI copy and page content in semi-formal Indonesian with pronoun `Kamu`.
- **UI implementation agent**: builds JSX structure and styling for the current page or routing unit.
- **Navigation/routing agent**: handles hash routing, header/footer links, active state, and mobile menu behavior.
- **Design system agent**: checks whether the page should use marketing layout or shell layout, and whether reusable patterns like the marketing 2-column split are appropriate.
- **Reviewer + auditor agent**: mandatory for every implemented unit. This agent audits the result against the user's stated intent, design doc, implementation plan, design system reference, static runtime constraints, language rules, responsive behavior, and verification commands.

Reviewer + auditor requirements:

- Dispatch this agent after implementation and before reporting success.
- It must be read-only and must not edit files.
- It must explicitly check whether the output matches the user's intent, not only whether the code parses.
- It must identify mismatches, regressions, unclear assumptions, missing responsive states, and runtime risks.
- The orchestrator must address or consciously document every reviewer/auditor finding before asking for approval or committing.
- A checkpoint is not solid until reviewer/auditor findings are resolved or explicitly accepted by the user.

Hard rules:

- Dispatch agents only for clearly scoped tasks.
- Do not let two agents edit the same write scope at the same time.
- Do not batch multiple pages just because multiple agents are available.
- One page remains the main unit of work.
- Reviewer/auditor agents should report findings only and should not edit files.
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
2. Correct layout family: marketing chrome or shell chrome.
3. Production-parity pages.
4. Mockup-only pages.
5. Visual polish.

Design direction:

- Marketing pages use the public marketing header/footer unless there is a clear reason not to.
- Marketing pages may reuse the 2-column section pattern documented in `design_system_reference.md`: narrative content on the left, supporting or functional content on the right.
- Shell pages do not have to use global marketing header/footer.
- `DocumentationPage` is the current shell reference: sidebar-based navigation, docs-specific mobile header, and content-side footer.
- Chat is projected to use a shell-like layout later.
- Do not over-design operational pages (`documentation`, `status`, `changelog`). They should be dense, scannable, and practical, not hero-heavy marketing pages.

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

## Acceptance For The Next New Session

The next implementation session should start with `BlogPage` only.

`BlogPage` acceptance:

1. `MakalahAI.html#/blog` renders a real `BlogPage`, not the placeholder route state.
2. `BlogPage` uses the marketing layout family unless a specific shell requirement is introduced later.
3. Blog layout should not copy pricing directly if a blog/feed structure is more appropriate.
4. Header and footer marketing chrome continue to work on `#/`, `#/pricing`, and `#/blog`.
5. `#/documentation` keeps its shell layout and must not regress back to the global marketing header/footer.
6. Mobile menu still opens and closes on marketing pages.
7. Documentation mobile shell menu still opens and closes.
8. No production `src/` file is modified.
9. Screenshot folders are not staged.
10. `git diff --check` passes.
11. JSX parser check passes or a parser limitation is documented.
12. Stop for review before implementing `AboutPage`.

## Commit Guidance

Commit after each checkpoint is verified and approved.

Recommended next commit message:

```text
Add marketing mockup blog page
```

Do not include:

```text
docs/frontend-marketing-resign-v2/screesnhots/
docs/frontend-marketing-resign-v2/screenshots/
docs/frontend-marketing-resign-v2/mockup/Screen Shot*.png
```
