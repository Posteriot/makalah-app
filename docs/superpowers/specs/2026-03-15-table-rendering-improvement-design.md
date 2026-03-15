# Table Rendering Improvement in Chat MarkdownRenderer

**Date:** 2026-03-15
**Branch:** chat-page-ux-design-enforcement
**Status:** Approved

## Problem

Tables rendered in the chat bubble by `MarkdownRenderer.tsx` have multiple visual issues:

1. **Font mismatch**: All table content uses `font-mono` (Geist Mono), making dense data hard to read — especially long text cells like citations and descriptions.
2. **URL overflow**: URL columns break layout with `break-all` word wrapping, creating ugly fragmented text.
3. **No column separation**: Missing vertical dividers make it hard to visually scan columns in data-heavy tables.
4. **No responsive fallback**: Wide tables (5+ columns) overflow or compress badly on mobile/narrow containers.
5. **No per-table copy**: Users cannot copy table data independently from the full response.

**Evidence:** Screenshot at `screenshots/Screen Shot 2026-03-15 at 20.11.54.png` shows a 5-column reference table with broken URL wrapping and cramped mono-font layout.

## Scope

**In scope:** Table block rendering in `MarkdownRenderer.tsx` only.

**Out of scope:** Mermaid diagrams (rendered in artifact panel), code blocks, other markdown blocks (headings, lists, blockquotes, etc.).

## Design

### 1. Font Standardization

| Element | Before | After |
|---------|--------|-------|
| Table headers | `font-mono text-[10px] font-bold uppercase tracking-widest` | `text-[11px] font-semibold uppercase tracking-wide` (Geist Sans) |
| Table cells | `font-mono text-sm` | `text-[13px]` (Geist Sans, inherits from parent) |
| URL/link content in cells | Same as cells | `font-mono text-[11px]` with truncation + hover expand |

**Rule:** Geist Sans for all table content. Geist Mono only for URLs/links — these are detected by existing `renderInline()` link rendering which already applies the `linkClassName` with appropriate styling.

### 2. Table Structure Changes

**Border model:**
- Keep `border-collapse` on the table itself.
- Wrap table in a container with `rounded-action overflow-hidden` — the wrapper's `overflow-hidden` clips the corners, so the table does not need `border-separate`.

**Vertical dividers:**
- All `th` and `td` elements get `border-right: 1px solid var(--chat-border)` except `:last-child`.
- Header border-right uses a slightly more visible tone than body cells for visual hierarchy.

**Cell padding:**
- Increase from `px-3 py-2` to `px-3.5 py-2.5` for better breathing room.

**Row separators:**
- Body rows use a softer border color (lower opacity variant of `--chat-border`).
- Last row has no bottom border.

### 3. Copy Buttons

A small toolbar appears below each rendered table with two actions:

**"Copy" (primary):**
- Copies table as tab-separated plain text.
- Format: header row + data rows, columns separated by `\t`, rows by `\n`.
- Directly paste-able into Excel/Google Sheets.

**"Copy Markdown" (secondary):**
- Copies the original markdown table source (reconstructed from the parsed `Block` data).
- Format: `| col1 | col2 |` with separator row.

**Implementation:**
- Extract a `TableCopyToolbar` component (or inline within the table case).
- The toolbar receives `headers: string[]` and `rows: string[][]` to generate both formats.
- Style: `font-mono text-[10px]` buttons, same visual pattern as `QuickActions.tsx` copy button.
- Feedback: button text changes to "Copied" with `--chat-success` color for 2 seconds (matches existing `QuickActions.tsx` pattern).

**Data flow for copy:**
- Tab-separated: `[headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n')`
- Markdown: reconstruct `| ${cells.join(' | ')} |` format with separator row `| --- | --- |`.

**Plain text stripping:** The `headers` and `rows` values from the parsed `Block` type contain raw markdown inline syntax (e.g., `**bold**`, `[link](url)`). Before generating tab-separated output, strip inline markdown formatting to produce clean plain text. A simple `stripInlineMarkdown(text)` helper removes `**`, `*`, `` ` ``, and converts `[label](url)` to just `label`.

### 4. Responsive Card Fallback

**Trigger conditions (both must be true):**
- Container width < 480px.
- Table has 4 or more columns.

Tables with ≤3 columns always render as a standard table since they fit fine in narrow containers.

**Card layout:**
- Each table row becomes a card.
- First column value → card title (bold, `font-semibold text-[13px]`).
- Remaining columns → key-value grid with:
  - Label (from header): `text-[11px] font-semibold` muted color, right-padded.
  - Vertical divider: `border-right: 1px solid var(--chat-border)` between label and value.
  - Value: `text-[13px]` normal color.
- URL values: `font-mono text-[11px]` with truncation.
- Card styling: `rounded-action` border, subtle background (`--chat-muted` with low opacity), 8px gap between cards.

**Responsive detection:**
- Use `useRef` + `ResizeObserver` to measure container width and set a `isNarrow` state.
- Default to `false` (table mode) on initial render to avoid layout shift — tables are the common case since chat is typically viewed on desktop.
- When `isNarrow` is `true` AND column count ≥ 4, render card layout instead of table.
- This approach conditionally renders only one layout (not both), keeping DOM clean.

### 5. URL Handling in Table Cells

URLs within table cells get special treatment:

- Display with `font-mono text-[11px]` (consistent with existing `linkClassName`).
- Truncated with `text-overflow: ellipsis; overflow: hidden; white-space: nowrap; max-width: 200px`.
- On hover: expand to show full URL (`white-space: normal; overflow-wrap: anywhere`).
- The `title` attribute contains the full URL for tooltip on hover.

This does NOT change the `renderInline()` function — it uses the existing link rendering. The truncation is applied via CSS on the table cell container.

## File Changes

| File | Change |
|------|--------|
| `src/components/chat/MarkdownRenderer.tsx` | Modify `case "table"` block: new styling, copy toolbar, responsive card fallback |

No new files needed. The copy toolbar and card layout logic are small enough to live within `MarkdownRenderer.tsx` as internal components.

## Testing

- Render a table with 5+ columns containing long URLs → verify truncation and hover expand.
- Render a table with 2-3 columns → verify it stays as table on all screen sizes.
- Resize browser to < 480px with a 5-column table → verify card layout triggers.
- Click "Copy" → paste into spreadsheet → verify tab-separated format.
- Click "Copy Markdown" → paste into text editor → verify valid markdown table.
- Verify vertical dividers appear between all columns.
- Verify Geist Sans is used for all content except URL links.
- Verify light mode and dark mode both render correctly (all colors use `--chat-*` variables).
