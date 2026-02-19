# Refrasa Popup Redesign

## Goal

Redesain popup "Tinjau Hasil Refrasa" supaya konsisten dengan visual vocabulary halaman chat dan artifact. Prioritas: hasil refrasa sebagai konten utama, issues dan teks asli sebagai secondary.

## Design Principles

1. **Result-first**: Hasil perbaikan = full width/height by default (seperti artifact content area)
2. **Icon-driven**: Gunakan icon buttons (bukan teks panjang) untuk secondary actions
3. **Progressive disclosure**: Teks asli dan issues di-toggle, bukan selalu visible
4. **Visual consistency**: Copy exact styling dari ArtifactToolbar, ArtifactViewer, FullsizeArtifactModal

## Visual Reference (from chat/artifact components)

### Surface Colors
- Dialog background: `bg-slate-100 dark:bg-slate-800` (same as FullsizeArtifactModal)
- Content container: `rounded-sm border border-slate-300/85 bg-slate-50 dark:border-slate-700/70 dark:bg-slate-900`
- Header border: `border-b border-slate-300/75 dark:border-slate-700/80`

### Typography
- Title: sans-serif semibold (same as artifact title)
- Labels: `text-[10px] font-mono font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-400`
- Body: `text-sm leading-relaxed text-slate-900 dark:text-slate-100`
- Buttons: `font-mono text-[11px]`

### Badges (from ArtifactToolbar chips)
- Neutral: `rounded-badge border border-slate-300/80 bg-slate-200/80 px-1.5 py-0.5 text-[10px] font-mono text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-100`
- Warning (issue count): `rounded-badge border border-amber-500/35 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-mono text-amber-700 dark:text-amber-300`

### Buttons
- Icon buttons: `h-8 w-8 rounded-action` (same as ArtifactToolbar)
- Text buttons: `h-7 px-2.5 font-mono text-[11px]` (same as FullsizeArtifactModal)
- Ghost cancel: `text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100`

### Issue Card Badges (severity)
- Warning: `rounded-badge border border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300`
- Critical: `rounded-badge border border-rose-500/35 bg-rose-500/10 text-rose-700 dark:text-rose-300`
- Info: `rounded-badge border border-slate-300/80 bg-slate-200/80 text-slate-700 dark:text-slate-100`

## Wireframe

### Desktop (default state: result-only)

```
┌──────────────────────────────────────────────┐
│ Tinjau Hasil Refrasa                         │
│ [⚠ 3]   <ViewColumns2> <DocSearch> <X>      │
│          [Batal] [✓ Terapkan]                │
├──────────────────────────────────────────────┤
│                                              │
│ HASIL PERBAIKAN (100% width, full height)    │
│ refrasad text, maximum readability           │
│ same container as artifact content area      │
│                                              │
└──────────────────────────────────────────────┘
```

### Desktop (after ViewColumns2 toggle: split view)

```
┌──────────────┬───────────────────────────────┐
│ TEKS ASLI    │ HASIL PERBAIKAN               │
│ 40% width    │ 60% width                     │
│ muted text   │ primary text                  │
│ scrollable   │ scrollable                    │
└──────────────┴───────────────────────────────┘
```

### DocMagnifyingGlass issues popover

```
┌────────────────────────┐
│ ▼ Naturalness (2)      │
│   [severity + message] │
│   [severity + message] │
│ ▼ Style (1)            │
│   [severity + message] │
└────────────────────────┘
```

### Mobile (< md breakpoint)

```
┌──────────────────────┐
│ Tinjau Hasil Refrasa │
│ [⚠ 3]  <DocSrch> <X>│
├──────────────────────┤
│ [Asli] [█Hasil█]    │  ← tabs, "Hasil" default
├──────────────────────┤
│                      │
│ tab content          │
│ full height          │
│                      │
├──────────────────────┤
│  [Batal] [Terapkan]  │
└──────────────────────┘
```

Mobile: no ViewColumns2 toggle (tabs handle comparison).

## Icon Mapping (Iconoir)

| Button | Icon | Purpose |
|--------|------|---------|
| Compare toggle | `ViewColumns2` | Show/hide teks asli (desktop only) |
| Issues inspect | `DocMagnifyingGlass` | Open issues popover |
| Issue count | `WarningTriangle` | Amber badge in header |
| Apply changes | `Check` | Inside "Terapkan" button |
| Close dialog | `Xmark` | Top-right corner |
| Collapse section | `NavArrowDown` / `NavArrowRight` | In issues popover |

## Components to Modify

| File | Change |
|------|--------|
| `src/components/refrasa/RefrasaConfirmDialog.tsx` | Full rewrite: new layout, icon buttons, split toggle, mobile tabs |
| `src/components/refrasa/RefrasaIssueItem.tsx` | Restyle badges to match artifact chip vocabulary |
| `src/components/refrasa/RefrasaLoadingIndicator.tsx` | Restyle to match artifact surface/font patterns |

## Components NOT Modified

- `src/lib/hooks/useRefrasa.ts` — no changes (logic stays same)
- `src/lib/refrasa/*` — no changes (types, schemas, prompt builder stay same)
- `src/app/api/refrasa/route.ts` — no changes (API stays same)
- `src/components/chat/ArtifactViewer.tsx` — no changes (integration stays same)
- `src/components/chat/FullsizeArtifactModal.tsx` — no changes (integration stays same)

## Behavior Details

1. **Default state**: Dialog opens with result-only view (full width)
2. **ViewColumns2 toggle**: Splits into 40/60 teks asli | hasil perbaikan
3. **DocMagnifyingGlass**: Opens Popover component below icon with issues list (max-h-[300px], scrollable)
4. **Mobile tabs**: "Hasil" tab active by default (result-first), "Asli" tab shows original
5. **Terapkan**: Same behavior as current (calls onApply, creates new artifact version)
6. **Batal/X**: Same behavior as current (closes dialog, resets refrasa state)
