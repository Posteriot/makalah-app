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
64ff0588 Add marketing mockup FAQ page
930fa470 Refine marketing mockup navigation chrome
33386e57 Polish marketing mockup feature visuals
2ca6111c Add marketing mockup features page
c6d1e356 Refresh marketing mockup handoff prompt
58157e2c Complete blog mockup listing and article page
6a6667a4 Refine about mockup layout and mobile accordions
7056f7b0 Add marketing mockup about page
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
FeaturesPage
FAQPage
```

Important completion notes:

- `BlogPage` has local clickable pagination with 5 pages.
- Page 1 has 1 featured headline plus 6 cards.
- Pages 2-5 each show 6 cards and no featured headline.
- `BlogArticlePage` exists as a single editorial reading-page representation based on the featured blog article.
- Featured blog title now opens the article detail route.
- `AboutPage` has mobile accordion behavior for `Persoalan` and `AI Agents`.
- `FeaturesPage` is live at `#/features` with the approved positioning direction: Makalah AI as an assistant for paper writing, not a generic chatbot.
- `FeaturesPage` uses final illustration assets for all five feature sections and shares the accepted background treatment used across public marketing pages.
- `FAQPage` is live at `#/faq` with grouped accordion content, revised hero/CTA structure, and mobile carousel behavior for the four primary category cards.
- Main navigation no longer includes `Home`; the logo/brand is the return path to home.
- Mockup favicon now points to `docs/frontend-marketing-resign-v2/mockup/assets/favicon.ico`.

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
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FeaturesPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FAQPage.jsx
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css
docs/frontend-marketing-resign-v2/mockup/styles/components.css
```

## Layout Rules

Two layout families are already established:

- **Marketing layout** for public marketing pages
- **Shell layout** for documentation and projected chat-like product surfaces

Rules already validated in this branch:

- `DocumentationPage` intentionally uses shell layout and must not be refactored into the marketing global chrome.
- `PricingPage`, `BlogPage`, `BlogArticlePage`, `AboutPage`, `FeaturesPage`, and `FAQPage` use the marketing family.
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
Auth page set
```

Reason:

- The user has explicitly redirected the next session target to all auth-related pages.
- This is now the highest-priority unfinished product surface after the completed marketing identity pages.
- The next session should first audit what auth-related mockup surfaces are needed, then implement them as a coherent auth family rather than mixing them with legal or operational pages.
- If auth routes are not yet registered in `MockRouter.jsx`, extend the route registry during that unit instead of forcing auth into existing placeholder legal routes.

## Recommended Remaining Commit Order

```text
1. Auth page set
2. PolicyPage set for privacy / security / terms
3. RoadmapPage
4. ChangelogPage
5. StatusPage
6. PartnershipPage
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
- Do not revert accepted `FeaturesPage` or `FAQPage` structure, copy direction, or mobile behavior unless the user explicitly requests corrections.
- Do not stage or commit screenshot folders unless explicitly requested.
- Do not assume the next unit is blog-related anymore; blog is already completed for this checkpoint.

## Immediate Starting Point For The Next Session

Start by confirming the current state from code, then move into the auth-page design unit.

Expected first read targets for the next session:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PricingPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/BlogArticlePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FeaturesPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FAQPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/header/GlobalHeaderMock.jsx
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
docs/frontend-marketing-resign-v2/mockup/src/app/pages/AboutPage.jsx
```
