# Table Rendering Improvement Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix table rendering in chat MarkdownRenderer — proper fonts, vertical dividers, responsive card fallback, and per-table copy buttons.

**Architecture:** All changes are in `MarkdownRenderer.tsx`. The table `case` block is replaced with a new `ChatTable` component that handles styling, copy toolbar, and responsive card fallback. A `stripInlineMarkdown()` utility is added for clean plain-text copy. No new files — everything lives in `MarkdownRenderer.tsx` as internal (non-exported) components.

**Tech Stack:** React 19, Tailwind CSS v4, Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-03-15-table-rendering-improvement-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/chat/MarkdownRenderer.tsx` | Modify | Replace `case "table"` with `ChatTable` component, add `stripInlineMarkdown()`, add `TableCopyToolbar` |
| `src/components/chat/MarkdownRenderer.table.test.tsx` | Modify | Add tests for new table features |
| `src/app/globals-new.css` | Modify | Add URL truncation CSS for table cells within `[data-chat-scope]` |

---

## Chunk 1: stripInlineMarkdown utility + tests

### Task 1: Add stripInlineMarkdown utility with tests

**Files:**
- Modify: `src/components/chat/MarkdownRenderer.table.test.tsx`
- Modify: `src/components/chat/MarkdownRenderer.tsx`

- [ ] **Step 1: Write failing tests for stripInlineMarkdown**

Add to `MarkdownRenderer.table.test.tsx` — a new `describe` block at the end of the file:

```tsx
// At the top, add the import:
import { stripInlineMarkdown } from "./MarkdownRenderer"

describe("stripInlineMarkdown", () => {
  it("strips bold markers", () => {
    expect(stripInlineMarkdown("**bold text**")).toBe("bold text")
  })

  it("strips italic markers", () => {
    expect(stripInlineMarkdown("*italic*")).toBe("italic")
    expect(stripInlineMarkdown("_italic_")).toBe("italic")
  })

  it("strips backtick code", () => {
    expect(stripInlineMarkdown("`code`")).toBe("code")
  })

  it("converts markdown links to label only", () => {
    expect(stripInlineMarkdown("[Google](https://google.com)")).toBe("Google")
  })

  it("handles nested bold + link", () => {
    expect(stripInlineMarkdown("**[link](https://x.com)**")).toBe("link")
  })

  it("leaves plain text unchanged", () => {
    expect(stripInlineMarkdown("hello world")).toBe("hello world")
  })

  it("handles empty string", () => {
    expect(stripInlineMarkdown("")).toBe("")
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: FAIL — `stripInlineMarkdown` is not exported from `./MarkdownRenderer`

- [ ] **Step 3: Implement stripInlineMarkdown in MarkdownRenderer.tsx**

Add this function near the top of `MarkdownRenderer.tsx` (after the type definitions, before `isHeading`), and export it:

```tsx
/** Strip inline markdown formatting for plain-text copy output. */
export function stripInlineMarkdown(text: string): string {
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // [label](url) → label
    .replace(/\*\*(.+?)\*\*/g, "$1")          // **bold** → bold
    .replace(/__(.+?)__/g, "$1")               // __bold__ → bold
    .replace(/\*(.+?)\*/g, "$1")               // *italic* → italic
    .replace(/_(.+?)_/g, "$1")                 // _italic_ → italic
    .replace(/`(.+?)`/g, "$1")                 // `code` → code
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MarkdownRenderer.tsx src/components/chat/MarkdownRenderer.table.test.tsx
git commit -m "feat: add stripInlineMarkdown utility for table copy"
```

---

## Chunk 2: Table styling + vertical dividers

### Task 2: Update table styling in MarkdownRenderer.tsx

**Files:**
- Modify: `src/components/chat/MarkdownRenderer.tsx:895-930`
- Modify: `src/components/chat/MarkdownRenderer.table.test.tsx`

- [ ] **Step 1: Write test for new table structure**

Add to the existing `describe("MarkdownRenderer table rendering")` block in `MarkdownRenderer.table.test.tsx`:

```tsx
it("renders table with vertical dividers between columns", () => {
  const md = [
    "| A | B | C |",
    "|---|---|---|",
    "| 1 | 2 | 3 |",
  ].join("\n")

  const { container } = render(<MarkdownRenderer markdown={md} />)
  const ths = container.querySelectorAll("th")
  // First and middle th should have border-right class, last should not
  expect(ths.length).toBe(3)
  // Check the wrapper has overflow-hidden for rounded corners
  const wrapper = container.querySelector("table")?.parentElement
  expect(wrapper?.className).toContain("overflow-hidden")
})

it("renders table headers with sans-serif font (not mono)", () => {
  const md = [
    "| Header1 | Header2 |",
    "|---|---|",
    "| cell1 | cell2 |",
  ].join("\n")

  const { container } = render(<MarkdownRenderer markdown={md} />)
  const th = container.querySelector("th")
  // Should NOT contain font-mono class
  expect(th?.className).not.toContain("font-mono")
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: FAIL — current th has `font-mono`, no `overflow-hidden` wrapper

- [ ] **Step 3: Add cn import and replace the table case block**

First, add the `cn` import at the top of `MarkdownRenderer.tsx` (after the existing imports, `cn` is NOT currently imported in this file):

```tsx
import { cn } from "@/lib/utils"
```

Then replace the entire `case "table":` block (lines 895-930) with:

```tsx
      case "table":
        return (
          <div key={k} className="my-3 overflow-x-auto">
            <div className="overflow-hidden rounded-action border border-[color:var(--chat-border)]">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr className="bg-[var(--chat-muted)]">
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={`${k}-th-${hIdx}`}
                        className={cn(
                          "border-b border-[color:var(--chat-border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]",
                          hIdx < block.headers.length - 1 && "border-r border-r-[color:var(--chat-border)]"
                        )}
                        style={{ textAlign: block.alignments[hIdx] ?? "left" }}
                      >
                        {renderInline(header, `${k}-th-${hIdx}`, sources, context)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rIdx) => (
                    <tr key={`${k}-tr-${rIdx}`} className="border-b border-[color:var(--chat-border)]/50 last:border-b-0">
                      {row.map((cell, cIdx) => (
                        <td
                          key={`${k}-td-${rIdx}-${cIdx}`}
                          className={cn(
                            "px-3.5 py-2.5 text-[13px] text-[var(--chat-foreground)] leading-relaxed",
                            cIdx < row.length - 1 && "border-r border-r-[color:var(--chat-border)]/30"
                          )}
                          style={{ textAlign: block.alignments[cIdx] ?? "left" }}
                        >
                          {renderInline(cell, `${k}-td-${rIdx}-${cIdx}`, sources, context)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
          </div>
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: ALL PASS (both new tests and all existing tests)

- [ ] **Step 5: Commit**

```bash
git add src/components/chat/MarkdownRenderer.tsx src/components/chat/MarkdownRenderer.table.test.tsx
git commit -m "feat: improve table styling — sans-serif fonts, vertical dividers, rounded corners"
```

---

## Chunk 3: Table copy toolbar

### Task 3: Add TableCopyToolbar component

**Files:**
- Modify: `src/components/chat/MarkdownRenderer.tsx`
- Modify: `src/components/chat/MarkdownRenderer.table.test.tsx`

- [ ] **Step 1: Write tests for copy toolbar**

Add to `MarkdownRenderer.table.test.tsx`. First, update the imports at the top of the file:

```tsx
// Update vitest import to include vi:
import { describe, expect, it, beforeAll, vi } from "vitest"
// Update testing-library import to include fireEvent and waitFor:
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
```

Then add the clipboard mock inside the EXISTING `beforeAll` callback, after the `matchMedia` mock (add the following lines before the closing `})`):

```tsx
  Object.defineProperty(navigator, "clipboard", {
    writable: true,
    value: {
      writeText: vi.fn().mockResolvedValue(undefined),
    },
  })
```

describe("Table copy toolbar", () => {
  it("renders Copy and Copy Markdown buttons below table", () => {
    const md = [
      "| A | B |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    expect(screen.getByText("Copy")).toBeTruthy()
    expect(screen.getByText("Copy Markdown")).toBeTruthy()
  })

  it("copies tab-separated plain text on Copy click", async () => {
    const md = [
      "| Name | Value |",
      "|---|---|",
      "| **alpha** | 1 |",
      "| beta | 2 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    fireEvent.click(screen.getByText("Copy"))

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        "Name\tValue\nalpha\t1\nbeta\t2"
      )
    })
  })

  it("copies markdown source on Copy Markdown click", async () => {
    const md = [
      "| Name | Value |",
      "|---|---|",
      "| alpha | 1 |",
    ].join("\n")

    render(<MarkdownRenderer markdown={md} />)
    fireEvent.click(screen.getByText("Copy Markdown"))

    await waitFor(() => {
      const call = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[0] as string
      expect(call).toContain("| Name | Value |")
      expect(call).toContain("| --- | --- |")
      expect(call).toContain("| alpha | 1 |")
    })
  })
})
```

Note: Add `vi` import if not already available — vitest globals should provide it.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: FAIL — "Copy" and "Copy Markdown" buttons not found

- [ ] **Step 3: Implement TableCopyToolbar in MarkdownRenderer.tsx**

Add this component above the `renderBlocks` function in `MarkdownRenderer.tsx`:

```tsx
function TableCopyToolbar({ headers, rows }: { headers: string[]; rows: string[][] }) {
  const [copiedKey, setCopiedKey] = useState<"plain" | "markdown" | null>(null)

  const copyPlain = async () => {
    const headerRow = headers.map(stripInlineMarkdown).join("\t")
    const dataRows = rows.map((r) => r.map(stripInlineMarkdown).join("\t"))
    const text = [headerRow, ...dataRows].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey("plain")
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert("Failed to copy to clipboard")
    }
  }

  const copyMarkdown = async () => {
    const headerRow = `| ${headers.join(" | ")} |`
    const separator = `| ${headers.map(() => "---").join(" | ")} |`
    const dataRows = rows.map((r) => `| ${r.join(" | ")} |`)
    const text = [headerRow, separator, ...dataRows].join("\n")
    try {
      await navigator.clipboard.writeText(text)
      setCopiedKey("markdown")
      setTimeout(() => setCopiedKey(null), 2000)
    } catch {
      alert("Failed to copy to clipboard")
    }
  }

  const btnClass = (key: "plain" | "markdown") =>
    cn(
      "flex items-center gap-1 text-[10px] font-mono transition-colors px-2 py-1 rounded-action",
      copiedKey === key
        ? "text-[var(--chat-success)]"
        : "text-[var(--chat-muted-foreground)] hover:text-[var(--chat-foreground)] hover:bg-[var(--chat-muted)]"
    )

  return (
    <div className="flex justify-end gap-1 mt-1.5">
      <button onClick={copyPlain} className={btnClass("plain")}>
        {copiedKey === "plain" ? "Copied" : "Copy"}
      </button>
      <button onClick={copyMarkdown} className={btnClass("markdown")}>
        {copiedKey === "markdown" ? "Copied" : "Copy Markdown"}
      </button>
    </div>
  )
}
```

Add `useState` to the React import at line 3 (currently `import { Fragment, type ReactNode } from "react"`):

```tsx
import { Fragment, type ReactNode, useState } from "react"
```

- [ ] **Step 4: Wire TableCopyToolbar into the table case block**

In the `case "table"` block, add the toolbar after the `</div>` wrapper that contains the table, before the fallbackChip:

```tsx
case "table":
  return (
    <div key={k} className="my-3 overflow-x-auto">
      <div className="overflow-hidden rounded-action border border-[color:var(--chat-border)]">
        <table className="w-full border-collapse text-[13px]">
          {/* ... thead and tbody unchanged ... */}
        </table>
      </div>
      <TableCopyToolbar headers={block.headers} rows={block.rows} />
      {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
    </div>
  )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: ALL PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/chat/MarkdownRenderer.tsx src/components/chat/MarkdownRenderer.table.test.tsx
git commit -m "feat: add per-table copy toolbar (plain text + markdown)"
```

---

## Chunk 4: Responsive card fallback

### Task 4: Add responsive card layout for narrow containers

**Files:**
- Modify: `src/components/chat/MarkdownRenderer.tsx`
- Modify: `src/components/chat/MarkdownRenderer.table.test.tsx`
- Modify: `src/app/globals-new.css`

- [ ] **Step 1: Write tests for responsive card layout**

Add to `MarkdownRenderer.table.test.tsx`:

```tsx
describe("Table responsive card fallback", () => {
  it("renders table normally when columns <= 3 regardless of container width", () => {
    const md = [
      "| A | B | C |",
      "|---|---|---|",
      "| 1 | 2 | 3 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    // Should always be a table, never cards
    expect(container.querySelector("table")).not.toBeNull()
  })

  it("renders 4+ column table with data-responsive-table attribute", () => {
    const md = [
      "| A | B | C | D |",
      "|---|---|---|---|",
      "| 1 | 2 | 3 | 4 |",
    ].join("\n")

    const { container } = render(<MarkdownRenderer markdown={md} />)
    // The wrapper should have the responsive attribute for 4+ columns
    const wrapper = container.querySelector("[data-responsive-table]")
    expect(wrapper).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: FAIL — no `data-responsive-table` attribute on any element

- [ ] **Step 3: Create the ChatTableCards component**

Add this component above `TableCopyToolbar` in `MarkdownRenderer.tsx`:

```tsx
function ChatTableCards({
  headers,
  rows,
  keyPrefix,
  sources,
  context,
}: {
  headers: string[]
  rows: string[][]
  keyPrefix: string
  sources?: CitationSource[]
  context?: "chat" | "artifact"
}) {
  return (
    <div className="flex flex-col gap-2">
      {rows.map((row, rIdx) => (
        <div
          key={`${keyPrefix}-card-${rIdx}`}
          className="rounded-action border border-[color:var(--chat-border)] bg-[var(--chat-muted)]/30 px-4 py-3"
        >
          {/* First column as card title */}
          <div className="mb-2 text-[13px] font-semibold text-[var(--chat-foreground)]">
            {renderInline(row[0], `${keyPrefix}-card-title-${rIdx}`, sources, context)}
          </div>
          {/* Remaining columns as key-value pairs with vertical divider */}
          <div className="grid grid-cols-[auto_1fr] gap-0 text-[13px]">
            {headers.slice(1).map((header, hIdx) => {
              const cellValue = row[hIdx + 1] ?? ""
              return (
                <Fragment key={`${keyPrefix}-kv-${rIdx}-${hIdx}`}>
                  <div className="border-r border-r-[color:var(--chat-border)] pr-2.5 py-1 text-[11px] font-semibold text-[var(--chat-muted-foreground)] whitespace-nowrap">
                    {stripInlineMarkdown(header)}
                  </div>
                  <div className="pl-2.5 py-1 text-[var(--chat-foreground)] leading-relaxed [overflow-wrap:anywhere] break-words">
                    {renderInline(cellValue, `${keyPrefix}-kv-val-${rIdx}-${hIdx}`, sources, context)}
                  </div>
                </Fragment>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Create the ChatTable wrapper component with ResizeObserver**

Add this component above `renderBlocks` in `MarkdownRenderer.tsx`:

```tsx
function ChatTable({
  block,
  keyPrefix,
  sources,
  context,
  fallbackChip,
}: {
  block: { headers: string[]; alignments: ("left" | "center" | "right" | null)[]; rows: string[][] }
  keyPrefix: string
  sources?: CitationSource[]
  context?: "chat" | "artifact"
  fallbackChip: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isNarrow, setIsNarrow] = useState(false)
  const isResponsive = block.headers.length >= 4

  useEffect(() => {
    const el = containerRef.current
    if (!el || !isResponsive) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setIsNarrow(entry.contentRect.width < 480)
      }
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [isResponsive])

  const showCards = isResponsive && isNarrow

  return (
    <div
      ref={containerRef}
      className="my-3"
      {...(isResponsive ? { "data-responsive-table": "" } : {})}
    >
      {showCards ? (
        <ChatTableCards
          headers={block.headers}
          rows={block.rows}
          keyPrefix={keyPrefix}
          sources={sources}
          context={context}
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="overflow-hidden rounded-action border border-[color:var(--chat-border)]">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-[var(--chat-muted)]">
                  {block.headers.map((header, hIdx) => (
                    <th
                      key={`${keyPrefix}-th-${hIdx}`}
                      className={cn(
                        "border-b border-[color:var(--chat-border)] px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-[var(--chat-muted-foreground)]",
                        hIdx < block.headers.length - 1 && "border-r border-r-[color:var(--chat-border)]"
                      )}
                      style={{ textAlign: block.alignments[hIdx] ?? "left" }}
                    >
                      {renderInline(header, `${keyPrefix}-th-${hIdx}`, sources, context)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, rIdx) => (
                  <tr key={`${keyPrefix}-tr-${rIdx}`} className="border-b border-[color:var(--chat-border)]/50 last:border-b-0">
                    {row.map((cell, cIdx) => (
                      <td
                        key={`${keyPrefix}-td-${rIdx}-${cIdx}`}
                        className={cn(
                          "px-3.5 py-2.5 text-[13px] text-[var(--chat-foreground)] leading-relaxed",
                          cIdx < row.length - 1 && "border-r border-r-[color:var(--chat-border)]/30"
                        )}
                        style={{ textAlign: block.alignments[cIdx] ?? "left" }}
                      >
                        {renderInline(cell, `${keyPrefix}-td-${rIdx}-${cIdx}`, sources, context)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <TableCopyToolbar headers={block.headers} rows={block.rows} />
      {fallbackChip ? <div className="mt-2">{fallbackChip}</div> : null}
    </div>
  )
}
```

Update the React import (which should now have `useState` from Chunk 3) to also include `useRef` and `useEffect`:

```tsx
import { Fragment, type ReactNode, useState, useRef, useEffect } from "react"
```

- [ ] **Step 5: Add URL truncation CSS for table cells**

Add this CSS rule to `src/app/globals-new.css`, after the existing `[data-chat-scope]` rules (as a new standalone rule block):

```css
/* Table cell URL truncation — URLs in table cells get truncated, expand on hover */
[data-chat-scope] table td a[href] {
  display: block;
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-chat-scope] table td a[href]:hover {
  white-space: normal;
  overflow-wrap: anywhere;
  max-width: none;
}
```

This targets only links inside table cells within the chat scope. The `renderInline()` function already applies `font-mono text-[11px]` via `linkClassName` for links, so no component changes needed — only CSS for truncation behavior.

- [ ] **Step 6: Replace the case "table" block to use ChatTable**

Replace the entire `case "table":` block in `renderBlocks` with:

```tsx
      case "table":
        return (
          <ChatTable
            key={k}
            block={block}
            keyPrefix={k}
            sources={sources}
            context={context}
            fallbackChip={fallbackChip}
          />
        )
```

- [ ] **Step 7: Run ALL tests to verify everything passes**

Run: `npx vitest run src/components/chat/MarkdownRenderer.table.test.tsx`
Expected: ALL PASS (all existing + new tests)

- [ ] **Step 8: Run full test suite to check for regressions**

Run: `npx vitest run`
Expected: ALL PASS

- [ ] **Step 9: Commit**

```bash
git add src/components/chat/MarkdownRenderer.tsx src/components/chat/MarkdownRenderer.table.test.tsx src/app/globals-new.css
git commit -m "feat: add responsive card fallback for wide tables on narrow screens"
```

Note: This commit fully replaces the inline `case "table"` block from Chunk 2 with the `ChatTable` component. The Chunk 2 inline rendering is now encapsulated inside `ChatTable`.

---

## Chunk 5: Visual verification

### Task 5: Manual visual verification

- [ ] **Step 1: Start dev server**

Run: `npm run dev`

- [ ] **Step 2: Verify table rendering in chat**

Open the app in browser. Navigate to a chat that has a table response (or trigger one). Check:

1. Table headers use sans-serif font (not mono)
2. Table cells use sans-serif font
3. URLs/links in cells display in mono font
4. Vertical dividers visible between all columns
5. Rounded corners on table container
6. "Copy" and "Copy Markdown" buttons appear below table
7. Click "Copy" → paste into spreadsheet → verify tab-separated format works
8. Click "Copy Markdown" → paste into text editor → verify valid markdown table

- [ ] **Step 3: Verify responsive card fallback**

Resize browser window narrow (< 480px) with a 4+ column table. Check:

1. Table switches to card layout
2. First column becomes card title
3. Remaining columns show as key-value pairs with vertical divider
4. URLs display in mono font

- [ ] **Step 4: Verify both themes**

Toggle between light mode and dark mode. Check that all colors use `--chat-*` variables and render correctly in both themes.

- [ ] **Step 5: Final commit if any visual tweaks needed**

```bash
git add src/components/chat/MarkdownRenderer.tsx
git commit -m "fix: visual tweaks from manual table rendering verification"
```
