# Handoff Prompt: Continue Multi-Page Marketing Mockup Implementation

You are working in this worktree:

```text
/Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2
```

## Goal

Continue the static multi-page marketing mockup implementation under:

```text
docs/frontend-marketing-resign-v2/mockup/
```

The next session should continue from the current completed state, not restart earlier units.

## Current Git Context

Recent relevant commits:

```text
58157e2c Complete blog mockup listing and article page
6a6667a4 Refine about mockup layout and mobile accordions
7056f7b0 Add marketing mockup about page
a0acf1c7 Align blog metadata accent color
698ddab7 Expand blog feed examples
589981c0 Refine blog headline and feed layout
f0e0b99e Simplify blog headline metadata
2a7e10ca Remove blog hero section
0344065e Refine blog marketing layout
ac377318 Adapt blog mockup to marketing layout
07bee34c Add marketing mockup blog page
814dcaea Add marketing mockup documentation page
549fcd62 Add marketing mockup pricing page
71a3e968 Add marketing mockup hash routing foundation
```

Worktree status at handoff should be clean.

## Current Known Completed Checkpoints

Completed units:

```text
Home mockup structure
Routing foundation
PricingPage
DocumentationPage
BlogPage
BlogArticlePage
AboutPage
```

Important completion notes:

- `BlogPage` has local clickable pagination with 5 pages.
- Page 1 has 1 featured headline plus 6 cards.
- Pages 2-5 each show 6 cards and no featured headline.
- `BlogArticlePage` exists as a single editorial reading-page representation based on the featured blog article.
- Featured blog title now opens the article detail route.
- `AboutPage` has mobile accordion behavior for `Persoalan` and `AI Agents`.

## Primary Planning Docs

Read these first:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/DESIGN_DOC.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/AUDIT.md
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
```

The implementation plan is still the execution baseline, but this handoff file overrides outdated sequencing notes when they conflict with current completed work.

## Strict Scope

Only edit files under:

```text
docs/frontend-marketing-resign-v2/mockup/
docs/frontend-marketing-resign-v2/HANDOFF_PROMPT.md
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

The mockup must remain static React UMD + Babel.

## Runtime Constraints

The current mockup is previewed from:

```text
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
```

Do not convert the runtime away from the current script-loaded UMD model.

Do not start browser testing or a Next.js dev server unless explicitly requested.

## Existing Mockup Runtime

Current core runtime files:

```text
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/MarketingLayoutMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/Tweaks.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/render.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/MarketingHomePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PricingPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/DocumentationPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogArticlePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/AboutPage.jsx
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css
docs/frontend-marketing-resign-v2/mockup/styles/components.css
```

## Layout Rules

Two layout families are already established:

- **Marketing layout** for public marketing pages
- **Shell layout** for documentation and projected chat-like product surfaces

Rules already validated in this branch:

- `DocumentationPage` intentionally uses shell layout and must not be refactored into the marketing global chrome.
- `PricingPage`, `BlogPage`, `BlogArticlePage`, and `AboutPage` use the marketing family.
- Non-documentation public pages should follow the newer marketing direction established by `PricingPage`, not blindly copy production `src/` layouts.

## Existing Route Targets

Current hash routes:

```text
MakalahAI.html#/
MakalahAI.html#/pricing
MakalahAI.html#/documentation
MakalahAI.html#/blog
MakalahAI.html#/blog/workflow-bertahap-untuk-paper
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

## Language Rules

For mockup UI copy:

- Use semi-formal Indonesian
- Use pronoun `Kamu`

For implementation comments / prompt text / internal code instructions:

- Use English

## Implementation Workflow

Continue using the per-unit workflow:

1. Implement one unit only.
2. Run relevant verification.
3. Stop and report for correction.
4. Revise until the unit is solid.
5. Commit only that unit.
6. Continue to the next unit after the previous unit is committed.

Do not batch multiple new pages into one implementation checkpoint.

## Next Allowed Unit

The next recommended unit is:

```text
PolicyPage set for privacy, security, and terms
```

Reason:

- It is the next remaining production-parity checkpoint after `AboutPage`.
- It closes the legal/public-information gap in the existing route registry.
- It should be treated as one bounded unit with shared structure and three route targets:
  - `#/privacy`
  - `#/security`
  - `#/terms`

## Recommended Remaining Commit Order

```text
1. PolicyPage set for privacy / security / terms
2. FeaturesPage
3. FAQPage
4. RoadmapPage
5. ChangelogPage
6. StatusPage
7. PartnershipPage
```

## Verification Expectations

For each unit, run at least:

```bash
git diff --check
node -e 'const fs=require("fs"); const parser=require("@babel/parser"); const files=process.argv.slice(1); for (const f of files) parser.parse(fs.readFileSync(f,"utf8"), {sourceType:"script", plugins:["jsx"]}); console.log(`parsed ${files.length} jsx files`);' $(find docs/frontend-marketing-resign-v2/mockup/src -name "*.jsx" | sort)
```

If a unit changes routing or script loading, also verify:

- route is registered in `MockRouter.jsx`
- script include order is correct in `MakalahAI.html`
- no production `src/` files were touched

## Important Guardrails

- Do not re-open already accepted redesign debates unless the user explicitly asks.
- Do not revert `BlogPage`, `BlogArticlePage`, or `AboutPage` behavior that has already been approved.
- Do not stage or commit screenshot folders unless explicitly requested.
- Do not assume the next unit is blog-related anymore; blog is already completed for this checkpoint.

## Immediate Starting Point For The Next Session

Start by confirming the current state from code, then move into the `PolicyPage` unit.

Expected first read targets for the next session:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PricingPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogArticlePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/AboutPage.jsx
```
