# Sources Right Sheet Design

## Summary

Redesign the sources/rujukan UI from an inline collapsible dropdown to a right sidebar sheet, matching the existing "Proses" (reasoning) panel pattern.

## Decisions

- **Mutual exclusive**: Only one sheet open at a time (Sources or Proses). Opening one auto-closes the other.
- **Enriched content**: Favicon, clean domain name, published date — all derived from existing data, zero backend changes.
- **Trigger visual unchanged**: Keep "MENEMUKAN X RUJUKAN" with checkmark, remove chevron (no longer collapsible).

## Trigger (in message bubble)

- Visual: "MENEMUKAN X RUJUKAN" with checkmark icon, monospace uppercase
- Remove chevron — no more inline expand/collapse
- Behavior: Click = open Sources sheet. If Proses sheet is open, close it first.

## Sheet Panel

- Desktop: Right sheet, `w-[420px] max-w-[90vw]` — same as Proses
- Mobile: Bottom sheet, `h-[80vh]` — same as Proses
- Animation: Reuse existing Sheet component animations (slide-in-from-right desktop, slide-in-from-bottom mobile)
- Overlay: `bg-black/50` backdrop, same as Proses
- Close: X button top-right

## Sheet Header

- Title: **"Rujukan"** (bold, top-left)
- Subtitle: **"X sumber ditemukan"** (muted, below title)

## Source Card (per item)

```
[favicon 16x16]  Domain Name              Published Date
                 Source Title (bold, clickable → open URL)
```

- Favicon: from `google.com/s2/favicons?domain=xxx`
- Domain: extracted from URL, muted text, small font
- Title: bold, clickable (open in new tab), foreground color
- Published date: if `publishedAt` exists, format relative ("2 hari lalu") or absolute. If null, hide.
- Separator: subtle divider between items
- Scroll: Sheet content scrollable, no "+X more" truncation needed

## State Management

- Single shared state: `activeSheet: 'proses' | 'sources' | null`
- Opening one closes the other (mutual exclusive)
- State lifted to parent that renders both sheets

## Scope of Changes

| File | Change |
|---|---|
| `SourcesIndicator.tsx` | Remove Collapsible, change to button calling `onOpenSources()` callback |
| **New**: `SourcesPanel.tsx` | New Sheet component, mirrors `ReasoningActivityPanel` pattern |
| `MessageBubble.tsx` | Pass `onOpenSources` callback to SourcesIndicator |
| Parent component | State management for `activeSheet`, render both panels |
