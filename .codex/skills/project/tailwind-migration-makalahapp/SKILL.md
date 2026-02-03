---
name: tailwind-migration-makalahapp
description: Migrate all frontend CSS in makalahapp to Tailwind CSS 4 with a clean design system, standardize class usage, and refactor globals.css into tokens/theme/components/effects layers.
---

# Tailwind Migration for Makalahapp

This skill guides a full migration from custom CSS to Tailwind CSS 4, while standardizing a design system and refactoring `globals.css` into layered files. It is repo-specific and must use the existing design system knowledge base.

## Scope & Non-Goals

- In scope: `src/app/globals.css`, `src/app/admin-styles.css`, and all component usages of custom CSS classes.
- Out of scope: visual redesign; only refactor styles without changing UI output.

## Sources of Truth

- Design system reference: `.development/knowledge-base/design-system.md`
- Current styling: `src/app/globals.css` and `src/app/admin-styles.css`

## Quick Start

1. Inventory custom CSS usage with the bundled script (see Scripts section).
2. Map CSS classes to Tailwind utilities or new component layer rules.
3. Refactor `globals.css` into `src/styles/` files and keep `globals.css` as imports only.
4. Replace custom class usage in components with Tailwind utilities, preserving visuals.
5. Verify via visual checks and lint if needed.

## Required Workflow (Do Not Skip)

### Step 1: Inventory

Run the script to list custom CSS classes and where they are used.
- Output includes class definitions (with @layer and pseudo selectors).
- Output includes a class → files usage map.
- This is the baseline to avoid missing any class.

### Step 2: Class Categorization

For each custom class:
- Utility replacement: If the class can be replaced by Tailwind utilities, do so.
- Component layer: If a pattern is repeated or complex, move to `@layer components`.
- Effects layer: For complex gradients/filters/masks, move to `effects.css`.

### Step 3: Design Tokens & Theme Mapping

Ensure tokens are complete and mapped:
- Tokens should live in `src/styles/tokens.css`.
- `@theme inline` mappings go in `src/styles/theme.css`.
- Only keep minimal overrides in `src/app/globals.css`.
- Preserve `@custom-variant dark` and dark-mode parity.

### Step 4: Refactor File Structure

Create and maintain:
```
src/styles/
  tokens.css
  theme.css
  base.css
  components.css
  effects.css

src/app/globals.css
```

`globals.css` should only import the files above and include minimal app-specific rules.

### Step 5: Replace Usage in Components

Replace class usage in:
- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/components/marketing/hero/*`
- any other files listed by the inventory script

### Step 6: Visual Verification

Verify no visual regressions:
- Header, hero, footer, admin tables.
- Dark/light mode parity.

## Rules & Heuristics

- Tailwind-first: default to utilities.
- Components layer: only for repeated or complex patterns.
- Effects layer: only for unique, complex visual effects.
- No magic numbers: prefer design tokens and spacing scale.
- No UI changes: refactor only.

## Known Hotspots

- `global-header`, `header-*` classes (Header)
- `hero-*` classes (Hero section)
- `footer-diagonal-stripes` (Footer background effect)
- `admin-styles.css` (Admin tables and badges)

## Scripts

### inventory-css-usage.sh

Generates reports of CSS class definitions and their usage in TS/TSX files.

Usage:
```
./.codex/skills/project/tailwind-migration-makalahapp/scripts/inventory-css-usage.sh
```

Output:
- `tmp/css-class-definitions.txt` (class, layer, file:line)
- `tmp/css-class-usage.txt` (raw className usage lines)
- `tmp/css-class-usage-map.txt` (class → files)

## Safety Notes

- Do not remove classes until replacements are confirmed.
- Keep a before/after list of replaced classes.
- If a class is used only once and is complex, move it to `effects.css`.

## When to Load Additional References

- For design tokens and architecture, open `.development/knowledge-base/design-system.md`.
- For existing mappings, inspect `src/app/globals.css`.
