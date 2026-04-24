# CSS File Split Mapping

## Purpose

This document defines the target CSS file structure for the static mockup under:

```text
docs/frontend-marketing-resign-v2/mockup/
```

The current `styles/components.css` has grown too large and mixes shared marketing styles, page-specific styles, shell-layout styles, auth styles, responsive overrides, and theme adjustments in one place. This document is the formal mapping reference for refactoring that file into smaller CSS files with clearer ownership.

This is a planning and migration document only. It does not mean every file must be created at once. The split should be executed incrementally in safe batches.

## Goals

- Reduce the maintenance burden of `styles/components.css`
- Give each major page/domain a clear CSS ownership boundary
- Keep selector scope understandable without introducing a build system
- Preserve the current static React UMD + Babel runtime
- Minimize regression risk during migration

## Non-Goals

- No migration to CSS Modules
- No migration to Tailwind-only styling
- No bundler or import-based CSS pipeline
- No redesign of accepted mockup pages
- No component-level micro-splitting as the first step

## Recommended Final File Structure

```text
docs/frontend-marketing-resign-v2/mockup/styles/
  tokens.css
  base.css
  layout.css
  marketing-shared.css
  docs.css
  support.css
  auth.css
  pricing.css
  policy.css
  features.css
  faq-page.css
  blog.css
  about.css
  responsive.css
```

## File Responsibilities

### `tokens.css`

Keep this file dedicated to design tokens only:

- colors
- spacing tokens
- radius tokens
- shadows
- font variables
- easing variables

Do not move page selectors into this file.

### `base.css`

Keep this file intentionally small. It should contain only global foundation rules that are not page-owned and not layout-heavy.

Allowed examples:

- lightweight global resets
- element defaults used across the mockup
- very small utility patterns that do not belong to a page/domain

Current expectation:

- this file may start small
- it may even remain nearly empty at first

That is acceptable.

### `layout.css`

This file owns top-level layout chrome and shell-level framing that is shared broadly:

- global navbar
- mobile menu shell
- footer
- shell footer
- shared container/layout helpers that are not page-specific

### `marketing-shared.css`

This file owns shared marketing sections and patterns reused across public marketing surfaces:

- home hero system
- stats strip
- shared section heads
- benefits tabs/showcase
- shared feature split blocks
- workflow and refrasa shared visuals
- demo section
- manifesto section
- generic pricing cards if reused outside the dedicated pricing page
- legacy generic FAQ accordion block
- tweaks panel
- shared brand-orange override layer for shared selectors

### `docs.css`

Owns all documentation shell page selectors.

### `support.css`

Owns all report/support page selectors.

### `auth.css`

Owns all auth route selectors and auth-specific layout surfaces.

### `pricing.css`

Owns dedicated pricing page selectors.

### `policy.css`

Owns dedicated policy page selectors.

### `features.css`

Owns dedicated features page selectors.

### `faq-page.css`

Owns the dedicated FAQ page selectors.

This is separate from the older generic `.faq*` accordion block that belongs in shared marketing styles.

### `blog.css`

Owns blog listing, blog marketing listing, and article page selectors.

### `about.css`

Owns about page selectors.

### `responsive.css`

Owns all media queries after the split.

Important constraint:

- keep media queries grouped by domain inside this file
- do not dump unrelated responsive rules into one mixed block without headings

## Selector Mapping

The lists below describe where each selector family should move.

### `layout.css`

Move these selectors:

- `.nav*`
- `.mobile-menu*`
- `.status-pill*` base layer only
- `.footer*`
- `.shell-page-footer`

Notes:

- `status-pill` also has brand-orange override rules later in the file
- keep the base rule in `layout.css`
- move the orange variant override into `marketing-shared.css`

### `marketing-shared.css`

Move these selectors:

- `.hero*`
- `.console*`
- `.stage-item*`
- `.chat-turn*`
- `.typing*`
- `.inspect-row*`
- `.cite-card*`
- `.marquee*`
- `.stats`
- `.stat*`
- `.sec-*`
- `.benefits-*`
- `.b-*`
- `.feature*`
- `.wf-*`
- `.refrasa-*`
- `.demo*`
- `.manifesto*`
- `.p-card*`
- `.pricing-grid` if still used as a shared section instead of pricing-page-only ownership
- `.faq`
- `.faq-*` generic accordion block
- `.tweaks*`
- `.tw-*`

Also move these shared brand-orange override rules:

- `.status-pill*` override layer
- `.hero-*` override layer
- `.stage-item.done*`
- `.chat-turn .body .cite`
- `.demo-paper .cite`
- `.demo-side .ref .meta .acc`
- `.wf-step.done`
- `.wf-row .val.ok`
- `.refrasa-meta*` override layer
- `.p-card*` orange featured-state layer
- `.stats .stat:nth-child(...)`
- `.manifesto h2 em`
- `.inspect-row*` orange/readability adjustments
- `.feature-bullets .tok`
- `.hero-badge .tag-dot*`
- `.cite-card b::first-line`

### `docs.css`

Move these selectors:

- `.docs-*`
- `.docs-panel-label`

### `support.css`

Move these selectors:

- `.support-*`

### `auth.css`

Move these selectors:

- `.auth-*`
- `.auth-route-main`

### `pricing.css`

Move these selectors:

- `.pricing-page-*`
- `.page-split-*`

Do not move `.p-card*` here if those cards are still reused by shared marketing sections.

### `policy.css`

Move these selectors:

- `.policy-page-*`

### `features.css`

Move these selectors:

- `.features-page-*`
- `.features-intro-*`
- `.features-pillar-*`
- `.features-visual-*`
- `.features-shell-*`
- `.features-stage-*`
- `.features-artifact-*`
- `.features-choice-*`
- `.features-refrasa-*`
- `.features-paper-*`

### `faq-page.css`

Move these selectors:

- `.faq-page-*`

### `blog.css`

Move these selectors:

- `.blog-*`

This includes:

- blog marketing listing
- blog cards
- blog pagination
- blog newsletter band
- blog article page

### `about.css`

Move these selectors:

- `.about-*`

### `base.css`

Keep only truly global non-domain selectors here.

Current expectation:

- there may be very little to move into `base.css`
- do not force selectors into `base.css` just to make the file look useful

## High-Risk Selectors To Move Carefully

These selectors need extra care during migration:

### `.status-pill*`

Why it is risky:

- base rules and orange override rules are separate
- if split badly, visual behavior changes silently

Rule:

- keep the base layer in `layout.css`
- keep the orange override layer in `marketing-shared.css`
- preserve source order

### `.p-card*`

Why it is risky:

- appears pricing-related
- but may still be reused by shared marketing sections

Rule:

- keep in `marketing-shared.css` unless usage is proven to be pricing-page-only

### `.faq` vs `.faq-page-*`

Why it is risky:

- they are two different systems
- one is a generic accordion block
- the other is the dedicated FAQ page

Rule:

- generic `.faq*` stays in `marketing-shared.css`
- `.faq-page-*` moves to `faq-page.css`

### `.hero*`

Why it is risky:

- looks like it could belong to one page
- actually it is shared marketing infrastructure

Rule:

- keep it in `marketing-shared.css`
- do not assign it to a single page file unless usage is reduced later

## Proposed Include Order In `MakalahAI.html`

When the split is implemented, keep the CSS include order deterministic.

Recommended order:

```html
<link rel="stylesheet" href="styles/tokens.css" />
<link rel="stylesheet" href="styles/base.css" />
<link rel="stylesheet" href="styles/layout.css" />
<link rel="stylesheet" href="styles/marketing-shared.css" />
<link rel="stylesheet" href="styles/docs.css" />
<link rel="stylesheet" href="styles/support.css" />
<link rel="stylesheet" href="styles/auth.css" />
<link rel="stylesheet" href="styles/pricing.css" />
<link rel="stylesheet" href="styles/policy.css" />
<link rel="stylesheet" href="styles/features.css" />
<link rel="stylesheet" href="styles/faq-page.css" />
<link rel="stylesheet" href="styles/blog.css" />
<link rel="stylesheet" href="styles/about.css" />
<link rel="stylesheet" href="styles/responsive.css" />
```

Reasoning:

- tokens first
- global foundations next
- shared layouts before page files
- page files before responsive overrides
- responsive file last so mobile adjustments remain predictable

## Recommended Refactor Order

The safest migration order is:

1. `support.css`
2. `docs.css`
3. `auth.css`
4. `policy.css`
5. `features.css`
6. `faq-page.css`
7. `blog.css`
8. `about.css`
9. `pricing.css`
10. `layout.css` and `marketing-shared.css`
11. `responsive.css`

Why this order is best:

- early batches use clean selector prefixes
- shell/support/auth/page families are easy to isolate
- the most entangled shared rules are deferred until later
- responsive extraction is last because it depends on the final file ownership

## Migration Rules

Apply these rules during execution:

- every new selector family must keep clear domain ownership
- do not mix unrelated page domains in the same file
- do not split by tiny presentational component first
- preserve selector order within the moved block unless there is a proven reason not to
- preserve cascade-sensitive override order
- keep comments that explain domain boundaries
- do not rewrite accepted visuals while moving CSS

## File Size Heuristics

Target size guidance:

- ideal: `150–500` lines
- above `600` lines: review whether another split is needed
- above `700` lines: split again unless there is a very strong reason not to

This is guidance, not a rigid law. Clarity of ownership matters more than hitting an exact line count.

## Recommended First Execution Unit

Start with `support.css`.

Why this is the best first unit:

- `support-*` selectors are cleanly prefixed
- the scope is isolated to one shell page family
- route behavior has already been stabilized recently
- this makes a good template for later page-domain splits

## Expected Deliverables For The First Refactor Unit

When implementing the first split, the minimum expected changes are:

- create `styles/support.css`
- move all `support-*` rules out of `components.css`
- update stylesheet include order in `MakalahAI.html`
- verify no visual regression in support page routing states
- keep `components.css` temporarily for remaining unmigrated selector families

## Verification Checklist For Each Split Batch

For every migration batch:

1. Confirm the moved selectors all belong to one domain
2. Confirm the new CSS file is linked in `MakalahAI.html`
3. Confirm the old selectors were removed from `components.css`
4. Confirm no duplicate selector definitions remain unless intentional
5. Run `git diff --check`
6. Verify the target routes still render correctly
7. Confirm no unrelated page changed visually because of source-order breakage

## Final Recommendation

Use domain-first splitting, not component-micro-splitting.

This gives the best tradeoff for the current mockup runtime:

- less risk
- clearer ownership
- easier review
- manageable file sizes
- no need for a bundler or CSS module system

The recommended first implementation target remains:

```text
styles/support.css
```
