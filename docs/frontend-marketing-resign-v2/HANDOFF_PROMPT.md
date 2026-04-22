# Handoff Prompt: Marketing Home Mockup Adaptation

You are working in this worktree:

```text
/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2
```

## Goal

Adapt the static marketing mockup structure so it mirrors the production marketing home architecture before the real Next.js integration begins.

This is a planning-and-mockup-structure phase. Do not modify the production app source under:

```text
src/
```

Only edit files under:

```text
docs/frontend-marketing-resign-v2/mockup/
```

The mockup must remain previewable with:

```bash
npx serve "/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2/docs/frontend-marketing-resign-v2/mockup"
```

Do not introduce bundlers, module imports, TypeScript, Next.js APIs, Tailwind runtime dependencies, Convex queries, or path aliases into the mockup. The mockup currently runs as static HTML using React UMD + Babel scripts.

## Production Architecture Context

The production marketing home page currently lives at:

```text
src/app/(marketing)/page.tsx
```

Current production home order:

1. `HeroSection`
2. `BenefitsSectionWrapper`
3. `WorkflowFeatureSection`
4. `RefrasaFeatureSection`
5. `PricingTeaser`

The production marketing layout lives at:

```text
src/app/(marketing)/layout.tsx
```

The production layout provides:

- `GlobalHeader`
- `Footer`
- `<main className="global-main">`

Therefore, in the mockup, navigation and footer should be treated as layout chrome, not as home page sections.

## Target Mockup Architecture

Refactor the mockup into a static mirror of the target production architecture:

```text
MarketingLayoutMock
  GlobalHeaderMock / Navbar
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
  FooterMock / Footer
  Tweaks
```

Important: `ManifestoSection`, `DemoSection`, and `FAQSection` must remain in the default home mockup. They are part of the intended final home experience and will be implemented during integration, even though production `src/app/(marketing)/page.tsx` does not include them yet.

## Existing Mockup Files

Main mockup files:

```text
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
docs/frontend-marketing-resign-v2/mockup/src/primitives.jsx
docs/frontend-marketing-resign-v2/mockup/src/top.jsx
docs/frontend-marketing-resign-v2/mockup/src/sections.jsx
docs/frontend-marketing-resign-v2/mockup/src/app.jsx
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css
docs/frontend-marketing-resign-v2/mockup/styles/components.css
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
```

Current mockup root order is approximately:

```text
Navbar
main
  Hero
  Benefits
  WorkflowFeature
  RefrasaFeature
  Manifesto
  Demo
  Pricing
  FAQ
Footer
Tweaks
```

## Required Refactor

Rename or alias mockup components so their names match the target production concepts:

- `Navbar` can stay as the layout chrome, or be wrapped as `GlobalHeaderMock`.
- `Footer` can stay as the layout chrome, or be wrapped as `FooterMock`.
- `Hero` should become or be exposed as `HeroSection`.
- `Benefits` should become or be exposed as `BenefitsSectionWrapper`.
- `WorkflowFeature` should become or be exposed as `WorkflowFeatureSection`.
- `RefrasaFeature` should become or be exposed as `RefrasaFeatureSection`.
- `Manifesto` should become or be exposed as `ManifestoSection`.
- `Demo` should become or be exposed as `DemoSection`.
- `Pricing` should become or be exposed as `PricingTeaser`.
- `FAQ` should become or be exposed as `FAQSection`.

Create a clear `MarketingHomePage` component in the mockup that renders only the page sections in the intended home order.

Create a clear `MarketingLayoutMock` component in the mockup that renders:

- header chrome
- `<main>`
- `MarketingHomePage`
- footer chrome
- `Tweaks`

The mockup should remain global-script friendly. If components are split across files, continue using `Object.assign(window, { ... })` or the existing global style. Do not convert the mockup to ES modules unless the preview command is changed, which is not allowed in this task.

## Constraints

- Do not edit production `src/`.
- Do not start browser testing unless explicitly requested.
- Do not start a Next.js dev server for this task.
- Keep the static preview command valid.
- Preserve existing visual design unless a structural rename requires a minimal class adjustment.
- Preserve the OKLCH token system already established in the mockup.
- Preserve the orange readability rules from `design_system_reference.md`.
- Do not commit screenshot files under `docs/frontend-marketing-resign-v2/screesnhots/` unless explicitly requested.

## Acceptance Criteria

The next session should finish with:

1. The mockup still opens through `npx serve` using `MakalahAI.html`.
2. `src/app.jsx` contains an obvious `MarketingLayoutMock` and `MarketingHomePage`.
3. The default home mockup section order is:
   - `HeroSection`
   - `BenefitsSectionWrapper`
   - `WorkflowFeatureSection`
   - `RefrasaFeatureSection`
   - `ManifestoSection`
   - `DemoSection`
   - `PricingTeaser`
   - `FAQSection`
4. Header and footer are outside `MarketingHomePage`.
5. No production `src/` files are modified.
6. `git diff --check` passes.

## Recommended Implementation Steps

1. Inspect the current mockup files and production home structure.
2. Add aliases or rename functions in `src/top.jsx` and `src/sections.jsx`.
3. Refactor `src/app.jsx` to render `MarketingLayoutMock`.
4. Keep legacy names temporarily only if needed to avoid a risky large diff.
5. Run text checks:

```bash
git diff --check
rg -n "MarketingHomePage|MarketingLayoutMock|HeroSection|PricingTeaser|FAQSection" docs/frontend-marketing-resign-v2/mockup/src
```

6. Summarize changed files and any remaining integration notes.
