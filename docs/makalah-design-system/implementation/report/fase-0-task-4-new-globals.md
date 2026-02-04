# Task Report: 0.4 - Create New globals.css

> **Fase**: FASE 0 - Foundation
> **Task**: 0.4 - Create New globals.css
> **Status**: ✅ Completed
> **Date**: 2026-02-04

## Summary

Updated globals.css with Makalah-Carbon tokens (OKLCH format) and added Mechanical Grace utility classes while preserving all existing component styles.

## Approach

Instead of completely overwriting globals.css (which would break existing styles), we used an **incremental approach**:

1. **Added** Master Color Palette (Section 1) - Slate, Amber, Emerald, Teal, Rose, Sky
2. **Updated** shadcn/ui token mappings (Sections 3-4) to use Makalah-Carbon values
3. **Added** Mechanical Grace utility classes (Section 5)
4. **Preserved** all existing component styles (@layer components)

## Changes Made

| Section | Action | Description |
|---------|--------|-------------|
| Master Color Palette | Added | Slate, Amber, Emerald, Teal, Rose, Sky (50-950 scale) in OKLCH |
| @theme inline | Updated | Added hybrid radius scale, AI colors, interaction states |
| :root (Light Mode) | Updated | Core tokens now use Makalah-Carbon palette references |
| .dark (Dark Mode) | Updated | Dark tokens use Slate 800/900/950 depth layers |
| @layer utilities | Added | Mechanical Grace utility classes |

## Token Categories Updated

### Core Semantic
- `--background`: Slate 50 (light) / Slate 900 (dark)
- `--primary`: Amber 500 (consistent)
- `--border`: Slate 200 (light) / 10% white (dark)

### Semantic Status
- `--success`: Teal 500
- `--warning`: Amber 400
- `--destructive`: Rose 500/600
- `--info`: Sky 500

### AI Identity
- `--ai-border`: Sky 500
- `--ai-bg-subtle`: Slate 950

### Business Tier
- `--segment-gratis`: Emerald 600
- `--segment-bpp`: Sky 600
- `--segment-pro`: Amber 500

### Chart Colors
- Unified: Sky, Emerald, Amber, Rose, Teal (500 level)

## Mechanical Grace Utilities Added

| Utility | Description |
|---------|-------------|
| `.text-narrative` | Sans font (Geist) |
| `.text-interface` | Mono font (Geist Mono) |
| `.text-signal` | Mono + uppercase + tracking |
| `.rounded-shell` | 16px radius (premium shell) |
| `.rounded-action` | 8px radius (action elements) |
| `.rounded-badge` | 6px radius (badges) |
| `.border-hairline` | 0.5px subtle border |
| `.border-ai` | Dashed Sky border |
| `.p-comfort` / `.p-dense` / `.p-airy` | Semantic padding |
| `.gap-comfort` / `.gap-dense` | Semantic gap |
| `.icon-micro` / `.icon-interface` / `.icon-display` | Icon sizes |
| `.hover-slash` | Diagonal stripe hover effect |
| `.active-nav` | Amber left border indicator |
| `.focus-ring` | Focus visible ring |

## Verification

- [x] `npm run build` - Sukses
- [x] `npm run lint` - Pass (0 errors, 4 warnings dari file external)
- [x] All existing component styles preserved
- [x] CSS variables properly reference Master Palette

## File Stats

- Original globals.css: 2746 lines
- Updated globals.css: ~2900 lines (added ~154 lines for new tokens & utilities)

## Notes

**Why incremental approach?**
The plan stated "overwrite" but the existing globals.css contains ~1500+ lines of component-specific styles (hero, header, pricing, admin, settings, etc.). Complete overwrite would cause significant visual regression.

This approach achieves the FASE 0 goal: "Setup infrastruktur styling Mechanical Grace TANPA mengubah tampilan existing."

## Next Task

Lanjut ke: **Task 0.5 - Create New tailwind.config.ts** (likely Skipped - Tailwind v4 CSS-first)
