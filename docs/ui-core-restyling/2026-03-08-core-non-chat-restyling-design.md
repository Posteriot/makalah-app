# Core Non-Chat UI Restyling Design Document

> Scope owner: Home page as pilot baseline for reusable non-chat styling
> Date: 2026-03-08
> Status: Approved for implementation

## 1. Goal, Scope, and Non-Goals

### Goal
Build a reusable **core non-chat styling system** that becomes the default visual standard for Home and future non-chat pages, while preserving strict isolation from Chat and Auth styling domains.

### Scope
- Introduce a global non-chat scope: `data-ui-scope="core"`.
- Define reusable core semantic tokens in `globals-new.css` under that scope.
- Use Home as the pilot migration route with strict section-by-section execution.
- Mandatory section order:
  1. GlobalHeader
  2. Hero
  3. Benefits
  4. Workflow Feature
  5. Refrasa Feature
  6. Pricing Teaser
  7. Footer

### Non-Goals
- No Chat token architecture changes.
- No Auth token architecture changes.
- No full-site non-chat migration in the first batch.
- No forced visual redesign outside each active section’s scoped adjustment.

---

## 2. Core Scope Architecture

### Primary Decision
Use a single reusable non-chat scope:
- Selector: `data-ui-scope="core"`
- Activation area: non-chat layout wrapper (marketing shell first)

### Rationale
- Reuses the successful scope-isolation pattern already proven in Chat.
- Prevents token collision with Chat (`data-chat-scope`) and Auth (`data-auth-scope`).
- Enables safe incremental migration page-by-page.

### Technical Model
Define core tokens in `globals-new.css` with two scoped blocks:
- `[data-ui-scope="core"]` for light mode
- `.dark [data-ui-scope="core"]` for dark mode

Inside the core scope, remap shared semantic variables:
- `--background: var(--core-background)`
- `--foreground: var(--core-foreground)`
- `--card: var(--core-card)`
- `--popover: var(--core-popover)`
- `--primary: var(--core-primary)`
- `--secondary: var(--core-secondary)`
- `--muted: var(--core-muted)`
- `--accent: var(--core-accent)`
- `--destructive: var(--core-destructive)`
- `--border: var(--core-border)`
- `--input: var(--core-input)`
- `--ring: var(--core-ring)`

---

## 3. Core Semantic Token Contract (`--core-*`)

### Principles
- Non-chat UI must consume semantic core tokens, not direct palette classes.
- Canonical neutral family for core intent is **slate**.
- State colors must be consistent across all non-chat pages.

### Token Set v1

#### Surface & Text
- `--core-background`
- `--core-foreground`
- `--core-card`
- `--core-card-foreground`
- `--core-popover`
- `--core-popover-foreground`
- `--core-muted`
- `--core-muted-foreground`
- `--core-accent`
- `--core-accent-foreground`
- `--core-secondary`
- `--core-secondary-foreground`

#### Border & Interaction
- `--core-border`
- `--core-input`
- `--core-ring`
- `--core-border-hairline`
- `--core-border-strong`

#### Brand & State
- `--core-primary`
- `--core-primary-foreground`
- `--core-success`
- `--core-success-foreground`
- `--core-warning`
- `--core-warning-foreground`
- `--core-destructive`
- `--core-destructive-foreground`
- `--core-info`
- `--core-info-foreground`

#### Optional Showcase Tokens (illustrative only)
- `--core-showcase-surface-*`
- `--core-showcase-border-*`
- `--core-showcase-shadow-*`

### Hard Rules
- No hardcoded color classes in migrated files.
- No `dark:*` for color/border/shadow in migrated files.
- Stone palette is forbidden for core intent tokens.
- If stone-like visual language is needed for illustrative mockups, it must be expressed through approved `--core-showcase-*` semantic tokens only.

---

## 4. Section-by-Section Migration Strategy

## Fixed Protocol for Every Section
1. Audit styling
2. If needed, perform visual/layout adjustment
3. Normalize styling consistency (tokens/Tailwind)
4. Run code quality review
5. Commit
6. Move to next section

### Section Order (Mandatory)
1. GlobalHeader
2. Hero
3. Benefits
4. Workflow Feature
5. Refrasa Feature
6. Pricing Teaser
7. Footer

### Section Work Profile

#### 1) GlobalHeader
- Audit: hardcoded palette usage, direct dark variants, duplicated utility patterns.
- Include baseline setup in this same section:
  - Add `data-ui-scope="core"` to the non-chat layout wrapper.
  - Add `--core-*` token blocks and semantic remap in `globals-new.css`.
- Visual adjustment: hierarchy, CTA emphasis, mobile menu clarity.
- Consistency normalization: migrate to core semantic tokens.
- Quality review: responsive + light/dark parity.
- Commit and gate pass before moving on.

#### 2) Hero
- Audit: heading/subheading/CTA/mockup surfaces and shadows.
- Visual adjustment: composition and readability when needed.
- Consistency normalization: remove hardcoded slate/stone/rgba usage.
- Quality review: desktop/mobile + dark/light parity.
- Commit and gate pass.

#### 3) Benefits
- Audit: badge, title, bento, accordion, docs CTA.
- Visual adjustment: spacing, hover behavior, readability density.
- Consistency normalization: state, surface, border, text via core tokens.
- Quality review: bento/accordion parity across breakpoints.
- Commit and gate pass.

#### 4) Workflow Feature
- Audit: section label, body text, image frame/shadow language.
- Visual adjustment: text-image balance and hierarchy.
- Consistency normalization: tokenized surfaces/borders/states.
- Quality review: responsive and theme parity.
- Commit and gate pass.

#### 5) Refrasa Feature
- Audit: same structure as workflow for parity enforcement.
- Visual adjustment: alignment with workflow section visual rhythm.
- Consistency normalization: token + Tailwind normalization.
- Quality review: dark/light and spacing consistency.
- Commit and gate pass.

#### 6) Pricing Teaser
- Audit: cards, badge, carousel, CTA, disabled state treatment.
- Visual adjustment: pricing hierarchy and highlight logic.
- Consistency normalization: tokenized borders/surfaces/states.
- Quality review: desktop grid + mobile carousel behavior.
- Commit and gate pass.

#### 7) Footer
- Audit: background, link hierarchy, interaction states.
- Visual adjustment: density and contrast balance.
- Consistency normalization: full semantic token usage.
- Quality review: shell parity with GlobalHeader.
- Commit and final gate pass.

---

## 5. Quality Gates (Per Section)

A section is **not allowed to commit** unless all gates pass.

### Mandatory Gates
1. Zero hardcoded color usage in that migrated section.
2. Zero `dark:*` usage for color/border/shadow in migrated section files.
3. All color/border/state semantics mapped to `--core-*` (or approved showcase tokens).
4. Readability and contrast hold in both light and dark mode.
5. Desktop and mobile layout remain stable with no breakage.

### Verification Checklist
- Scan for direct palette classes:
  - `slate-*`, `stone-*`, `amber-*`, `emerald-*`, `rose-*`, `sky-*`
- Scan for direct literals:
  - `rgba(...)`, `oklch(...)` in component classes/styles
- Scan for direct dark overrides:
  - `dark:bg-*`, `dark:text-*`, `dark:border-*`, `dark:shadow-*`
- Validate tokenized or semantic utility usage:
  - `bg-background`, `text-foreground`, `border-border`, etc.

### Failure Handling
- If any gate fails, fix within the same section before commit.
- No section handoff is allowed while the current section is failing.

---

## 6. Commit Strategy

### Commit Policy
- Exactly **one commit per section** after all section gates pass.
- Keep commit scope minimal and section-specific.

### Commit Message Convention
`feat(ui-core): restyle <section-name> with core non-chat tokens`

Examples:
- `feat(ui-core): restyle global-header with core non-chat tokens`
- `feat(ui-core): restyle hero with core non-chat tokens`
- `feat(ui-core): restyle benefits with core non-chat tokens`
- `feat(ui-core): restyle workflow-feature with core non-chat tokens`
- `feat(ui-core): restyle refrasa-feature with core non-chat tokens`
- `feat(ui-core): restyle pricing-teaser with core non-chat tokens`
- `feat(ui-core): restyle footer with core non-chat tokens`

### Commit Hygiene Rules
- Never include unrelated section changes in the active section commit.
- Never commit before gate pass.
- Shared helper changes must be attached to the first section that requires them and documented in commit notes.

---

## 7. Risks, Mitigation, and Rollback

### Risk 1: Cross-domain token collision (Core vs Chat/Auth)
- Mitigation: strict scope boundaries (`data-ui-scope="core"`, `data-chat-scope`, `data-auth-scope`).
- Rollback: revert only the affected section commit.

### Risk 2: Visual drift during hardcoded-to-token replacement
- Mitigation: strict section-based migration with in-section visual adjustment.
- Rollback: reset to the last passing section commit.

### Risk 3: Dark mode regressions
- Mitigation: define dark values in scoped token block; remove component-level dark color overrides.
- Rollback: revert section and re-apply with smaller patch set.

### Risk 4: Responsive regressions from Tailwind normalization
- Mitigation: mandatory desktop/mobile checks per section.
- Rollback: section-level revert and controlled rework.

### Risk 5: Scope creep
- Mitigation: hard boundary to approved section order and protocol.
- Rollback: reject non-scoped edits and restore boundary.

### Stop Conditions
Pause execution immediately if:
- Unexpected external file changes appear outside active section scope.
- Section gates fail repeatedly without clear root cause.
- Any side effect appears in Chat/Auth domains.

---

## 8. Acceptance Criteria (Final)

The design is considered successfully implemented when all criteria are met:

1. `data-ui-scope="core"` is active in the non-chat layout baseline.
2. `globals-new.css` contains complete core scoped token blocks (light + dark) and semantic remap.
3. All 7 target sections are migrated in mandatory order.
4. Each section passed all gates before commit.
5. Total section commits = 7 (one per section).
6. Home visual identity remains coherent, readable, and responsive after migration.
7. Chat and Auth visual behavior remain unaffected.
8. The resulting core token contract is reusable for the next non-chat pages without redefining style primitives.

---

## 9. Execution Contract Summary

This document is the single implementation design contract for:
- Core non-chat token scope architecture
- Section-by-section migration protocol
- Gate-driven quality control
- Section-isolated commit discipline

No implementation work should violate the protocol sequence or gate requirements defined here.
