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

The next session should focus on:
1. **Tailwind CSS v4 Migration**: Migrating all mockup pages and components from custom CSS (`components.css`) to Tailwind utility classes.
2. **Code Refactoring (Atomic Design)**: Breaking down monolithic page files into modular, reusable components (following the pattern established in the Home page).

The next session should continue from the current completed state, not restart earlier units.

## Current Git Context

Recent relevant commits:

```text
0984f6b6 Refine shell mockup documentation and support pages
885a70d1 Add marketing mockup policy pages
5dc2e4e1 Expand marketing mockup auth states
76b331e5 Complete marketing mockup auth pages
309e8b18 Add marketing mockup magic link page
629282b1 Add marketing mockup forgot password page
aa3c68f7 Add marketing mockup sign-up page
77409276 Add marketing mockup sign-in page
87561c55 Refresh marketing mockup handoff status
64ff0588 Add marketing mockup FAQ page
930fa470 Refine marketing mockup navigation chrome
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
PolicyPage set
FeaturesPage
FAQPage
ReportIssuePage
Auth page set
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
- `PolicyPage` is live as a shared template for:
  - `#/privacy`
  - `#/security`
  - `#/terms`
- `ReportIssuePage` is live as a shell-layout support page with route-addressable review states:
  - `#/report-issue`
  - `#/report-issue/new`
  - `#/report-issue/progress`
  - `#/report-issue/terkirim`
  - `#/report-issue` is the progress view
  - `#/report-issue/new` is the report form view
- `DocumentationPage` and `ReportIssuePage` now share a reusable shell footer component and shared shell-style footer rules.
- Shell muted text now uses centralized reusable token aliases in `tokens.css`; future shell/public work should reuse that system rather than introduce page-level muted color overrides.
- Main navigation no longer includes `Home`; the logo/brand is the return path to home.
- Mockup favicon now points to `docs/frontend-marketing-resign-v2/mockup/assets/favicon.ico`.
- The auth family is now completed as a dedicated auth-layout system with no `GlobalHeaderMock` and no `FooterMock` on auth routes.
- Auth mockup routes now include direct route coverage for primary pages and important visible states:
  - `#/sign-in`
  - `#/sign-in/required`
  - `#/sign-in/invalid-email`
  - `#/sign-in/email-not-found`
  - `#/sign-in/wrong-password`
  - `#/sign-in/rate-limit`
  - `#/sign-up`
  - `#/sign-up/required`
  - `#/sign-up/invalid-email`
  - `#/sign-up/email-too-short`
  - `#/sign-up/email-taken`
  - `#/sign-up/password-too-short`
  - `#/sign-up/success`
  - `#/verify-2fa`
  - `#/verify-2fa/required`
  - `#/verify-2fa/incomplete`
  - `#/verify-2fa/invalid`
  - `#/verify-2fa/rate-limit`
  - `#/forgot-password`
  - `#/forgot-password/required`
  - `#/forgot-password/invalid-email`
  - `#/forgot-password/email-not-found`
  - `#/forgot-password/send-failed`
  - `#/forgot-password/email-sent`
  - `#/magic-link`
  - `#/magic-link/required`
  - `#/magic-link/invalid-email`
  - `#/magic-link/email-not-found`
  - `#/magic-link/send-failed`
  - `#/magic-link/email-sent`
  - `#/magic-link/invalid`
  - `#/magic-link/expired`
  - `#/reset-password`
  - `#/reset-password/required`
  - `#/reset-password/password-too-short`
  - `#/reset-password/mismatch`
  - `#/reset-password/invalid`
  - `#/reset-password/expired`
  - `#/reset-password/save-failed`
  - `#/reset-password/success`
- Important auth behavior already accepted in this branch:
  - auth pages are focused standalone surfaces, not marketing pages with global navigation chrome
  - primary auth submit actions have loading states
  - `#/verify-2fa` disables the code inputs while verification is in progress
  - visible auth error/success states are route-addressable for mockup review
  - mobile auth text alignment and helper spacing have been corrected across the auth family

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

- **Tailwind CSS v4** is already installed via CDN in `MakalahAI.html` and configured with the brand theme in the `<style type="text/css">` block. Use `@theme` variables like `text-brand-green`, `bg-bg-1`, etc.
- **Component Pattern**: Follow the Home page structure. Move UI parts to `src/components/[category]/[component].jsx` and export them using `Object.assign(window, { ComponentName })`. Maintain global script registration in `MakalahAI.html`.

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
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PolicyPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FeaturesPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FAQPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ReportIssuePage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/SignInPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/SignUpPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/Verify2FAPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ForgotPasswordPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/MagicLinkPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/AuthEmailSentPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ResetPasswordPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/shared/ShellPageFooter.jsx
docs/frontend-marketing-resign-v2/mockup/styles/tokens.css
docs/frontend-marketing-resign-v2/mockup/styles/components.css
```

## Layout Rules

Two layout families are already established:

- **Marketing layout** for public marketing pages
- **Shell layout** for documentation and projected chat-like product surfaces

Rules already validated in this branch:

- `DocumentationPage` intentionally uses shell layout and must not be refactored into the marketing global chrome.
- `ReportIssuePage` intentionally uses shell layout and must not be refactored into the marketing global chrome.
- `PricingPage`, `BlogPage`, `BlogArticlePage`, `AboutPage`, `FeaturesPage`, and `FAQPage` use the marketing family.
- Non-documentation public pages should follow the newer marketing direction established by `PricingPage`, not blindly copy production `src/` layouts.

## Existing Route Targets

Current hash routes:

```text
MakalahAI.html#/
MakalahAI.html#/sign-in
MakalahAI.html#/sign-in/required
MakalahAI.html#/sign-in/invalid-email
MakalahAI.html#/sign-in/email-not-found
MakalahAI.html#/sign-in/wrong-password
MakalahAI.html#/sign-in/rate-limit
MakalahAI.html#/sign-up
MakalahAI.html#/sign-up/required
MakalahAI.html#/sign-up/invalid-email
MakalahAI.html#/sign-up/email-too-short
MakalahAI.html#/sign-up/email-taken
MakalahAI.html#/sign-up/password-too-short
MakalahAI.html#/sign-up/success
MakalahAI.html#/verify-2fa
MakalahAI.html#/verify-2fa/required
MakalahAI.html#/verify-2fa/incomplete
MakalahAI.html#/verify-2fa/invalid
MakalahAI.html#/verify-2fa/rate-limit
MakalahAI.html#/forgot-password
MakalahAI.html#/forgot-password/required
MakalahAI.html#/forgot-password/invalid-email
MakalahAI.html#/forgot-password/email-not-found
MakalahAI.html#/forgot-password/send-failed
MakalahAI.html#/forgot-password/email-sent
MakalahAI.html#/magic-link
MakalahAI.html#/magic-link/required
MakalahAI.html#/magic-link/invalid-email
MakalahAI.html#/magic-link/email-not-found
MakalahAI.html#/magic-link/send-failed
MakalahAI.html#/magic-link/email-sent
MakalahAI.html#/magic-link/invalid
MakalahAI.html#/magic-link/expired
MakalahAI.html#/reset-password
MakalahAI.html#/reset-password/required
MakalahAI.html#/reset-password/password-too-short
MakalahAI.html#/reset-password/mismatch
MakalahAI.html#/reset-password/invalid
MakalahAI.html#/reset-password/expired
MakalahAI.html#/reset-password/save-failed
MakalahAI.html#/reset-password/success
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
MakalahAI.html#/report-issue
MakalahAI.html#/report-issue/new
MakalahAI.html#/report-issue/progress
MakalahAI.html#/report-issue/terkirim
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
Tailwind Migration & Refactoring: Home Page
```

Reason:

- Tailwind v4 is installed and theme-ready.
- The Home page components (Hero, Benefits, etc.) need to be migrated to Tailwind utility classes.
- Monolithic pages (DocumentationPage, ReportIssuePage, BlogPage) must be split into modular components in `src/components/` while being migrated.
- Ensure all custom styling in `components.css` for the target page is translated to Tailwind utility classes or custom Tailwind theme variables.

## Recommended Remaining Commit Order

```text
1. Home Page (Tailwind Migration + Modularization)
2. Pricing Page (Tailwind Migration + Modularization)
3. Documentation Page (Tailwind Migration + Modularization)
4. Report Issue Page (Tailwind Migration + Modularization)
5. Remaining Operational Pages (Changelog, Roadmap, etc.)
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
- Do not re-open accepted `PolicyPage` or `ReportIssuePage` structure unless the user explicitly requests corrections.
- Do not re-open the completed auth family unless the user explicitly asks for auth revisions.
- Do not collapse the auth routes back into marketing global chrome; auth pages intentionally use dedicated auth chrome.
- Do not stage or commit screenshot folders unless explicitly requested.
- Do not assume the next unit is blog-related anymore; blog is already completed for this checkpoint.

## Immediate Starting Point For The Next Session

Start by confirming the current state from code, then move into **Home Page Tailwind Migration & Modularization** as the first step of the modernization phase.

Expected first read targets for the next session:

```text
docs/frontend-marketing-resign-v2/mockup/pages-design-plan/IMPLEMENTATION_PLAN.md
docs/frontend-marketing-resign-v2/mockup/design_system_reference.md
docs/frontend-marketing-resign-v2/mockup/src/app/MockRouter.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/header/GlobalHeaderMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/layout/footer/FooterMock.jsx
docs/frontend-marketing-resign-v2/mockup/src/components/shared/ShellPageFooter.jsx
docs/frontend-marketing-resign-v2/mockup/MakalahAI.html
docs/frontend-marketing-resign-v2/mockup/src/app/pages/PricingPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/FAQPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/AboutPage.jsx
docs/frontend-marketing-resign-v2/mockup/src/app/pages/ReportIssuePage.jsx
```
