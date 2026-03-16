# Sources Right Sheet Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the inline collapsible sources dropdown with a right sidebar sheet, matching the Proses panel pattern, with mutual exclusivity between the two sheets.

**Architecture:** Add an `onOpenSources` callback prop to `SourcesIndicator` (dual-mode: button when callback provided, collapsible when not). Create `SourcesPanel.tsx` mirroring `ReasoningActivityPanel`. Lift sheet state to `ChatWindow.tsx` as `activeSheet` to enforce mutual exclusivity between Proses and Sources sheets.

**Tech Stack:** React, Radix Dialog (via shadcn Sheet), Tailwind CSS, iconoir-react, existing `getWebCitationDisplayParts` + `deriveSiteNameFromUrl` from `@/lib/citations/apaWeb`

---

### Task 1: Create SourcesPanel.tsx

**Files:**
- Create: `src/components/chat/SourcesPanel.tsx`
- Reference: `src/components/chat/ReasoningActivityPanel.tsx` (pattern to mirror)
- Reference: `src/lib/citations/apaWeb.ts` (for `getWebCitationDisplayParts`, `deriveSiteNameFromUrl`)

**Step 1: Create the SourcesPanel component**

Create `src/components/chat/SourcesPanel.tsx`:

```tsx
"use client"

import { useEffect, useState } from "react"
import { OpenNewWindow } from "iconoir-react"
import { cn } from "@/lib/utils"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { getWebCitationDisplayParts, deriveSiteNameFromUrl } from "@/lib/citations/apaWeb"

interface Source {
  url: string
  title: string
  publishedAt?: number | null
}

interface SourcesPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  sources: Source[]
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

function faviconUrl(url: string): string {
  const domain = extractDomain(url)
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=32`
}

export function SourcesPanel({ open, onOpenChange, sources }: SourcesPanelProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)")
    const sync = () => setIsMobile(media.matches)
    sync()
    media.addEventListener("change", sync)
    return () => media.removeEventListener("change", sync)
  }, [])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={isMobile ? "bottom" : "right"}
        className={cn(
          "overflow-y-auto border-0 bg-background p-0 text-foreground font-sans",
          "[&>[data-slot='sheet-close']]:absolute [&>[data-slot='sheet-close']]:top-4 [&>[data-slot='sheet-close']]:right-4",
          "[&>[data-slot='sheet-close']]:flex [&>[data-slot='sheet-close']]:h-8 [&>[data-slot='sheet-close']]:w-8 [&>[data-slot='sheet-close']]:items-center [&>[data-slot='sheet-close']]:justify-center",
          "[&>[data-slot='sheet-close']]:rounded-none [&>[data-slot='sheet-close']]:border-0 [&>[data-slot='sheet-close']]:bg-transparent [&>[data-slot='sheet-close']]:shadow-none [&>[data-slot='sheet-close']]:ring-0",
          "[&>[data-slot='sheet-close']]:text-muted-foreground [&>[data-slot='sheet-close']]:opacity-60",
          "[&>[data-slot='sheet-close']]:transition-opacity [&>[data-slot='sheet-close']]:hover:opacity-100 [&>[data-slot='sheet-close']]:hover:bg-transparent",
          "[&>[data-slot='sheet-close']]:focus-visible:outline-none [&>[data-slot='sheet-close']]:focus-visible:ring-0 [&>[data-slot='sheet-close']]:focus-visible:ring-offset-0",
          isMobile ? "h-[80vh]" : "w-[420px] max-w-[90vw] sm:max-w-[420px]"
        )}
      >
        <div className="px-5 pb-6 pt-5 md:px-6">
          <SheetTitle className="mb-1 font-sans text-base font-semibold text-foreground">
            Rujukan
          </SheetTitle>
          <SheetDescription className="mb-5 font-sans text-xs text-muted-foreground">
            {sources.length} sumber ditemukan
          </SheetDescription>

          <div className="flex flex-col divide-y divide-border">
            {sources.map((source, idx) => (
              <SourceCard key={idx} source={source} />
            ))}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function SourceCard({ source }: { source: Source }) {
  const parts = getWebCitationDisplayParts(source)
  const domain = extractDomain(parts.url)
  const siteName = deriveSiteNameFromUrl(parts.url)

  return (
    <a
      href={parts.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex gap-3 py-3 transition-colors hover:bg-muted/50"
    >
      {/* Favicon */}
      <img
        src={faviconUrl(parts.url)}
        alt=""
        width={16}
        height={16}
        className="mt-0.5 h-4 w-4 flex-shrink-0 rounded-sm"
        loading="lazy"
      />

      {/* Content */}
      <div className="min-w-0 flex-1">
        {/* Domain + date row */}
        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
          <span className="truncate">{siteName || domain}</span>
          {parts.dateText && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="shrink-0">{parts.dateText}</span>
            </>
          )}
        </div>

        {/* Title */}
        <span className="mt-0.5 flex items-center gap-1 text-sm font-medium text-foreground group-hover:underline">
          <span className="line-clamp-2">{parts.title}</span>
          <OpenNewWindow className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
        </span>
      </div>
    </a>
  )
}
```

**Step 2: Verify the file compiles**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors related to SourcesPanel.tsx

**Step 3: Commit**

```bash
git add src/components/chat/SourcesPanel.tsx
git commit -m "feat(chat): add SourcesPanel sheet component"
```

---

### Task 2: Make SourcesIndicator dual-mode (button or collapsible)

**Files:**
- Modify: `src/components/chat/SourcesIndicator.tsx`

**Step 1: Add optional `onOpenSheet` prop**

When `onOpenSheet` is provided, render a simple button (no Collapsible, no chevron).
When `onOpenSheet` is not provided, keep existing Collapsible behavior (for ArtifactViewer/FullsizeArtifactModal).

Replace the full content of `SourcesIndicator.tsx`:

```tsx
"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowUp, CheckCircle, OpenNewWindow } from "iconoir-react"
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { getWebCitationDisplayParts } from "@/lib/citations/apaWeb"
import { cn } from "@/lib/utils"

interface Source {
    url: string
    title: string
    publishedAt?: number | null
}

interface SourcesIndicatorProps {
    sources: Source[]
    /** When provided, clicking opens the Sources sheet instead of expanding inline */
    onOpenSheet?: (sources: Source[]) => void
}

export function SourcesIndicator({ sources, onOpenSheet }: SourcesIndicatorProps) {
    if (!sources || sources.length === 0) return null

    // Sheet mode: simple button, no inline expand
    if (onOpenSheet) {
        return (
            <button
                type="button"
                onClick={() => onOpenSheet(sources)}
                className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:opacity-80"
            >
                <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--chat-muted-foreground)]" />
                <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[var(--chat-muted-foreground)]">
                    Menemukan {sources.length} rujukan
                </span>
            </button>
        )
    }

    // Inline collapsible mode (for ArtifactViewer / FullsizeArtifactModal)
    return <SourcesCollapsible sources={sources} />
}

function SourcesCollapsible({ sources }: { sources: Source[] }) {
    const [isOpen, setIsOpen] = useState(false)
    const [showAll, setShowAll] = useState(false)

    const indexedSources = sources.map((source, idx) => ({ source, idx }))
    const displayedSources = showAll ? indexedSources : indexedSources.slice(0, 5)
    const remainingCount = sources.length - 5
    const hasMore = sources.length > 5

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
                <button
                    className="flex w-full items-center gap-2 py-1.5 text-left transition-colors hover:opacity-80"
                >
                    <CheckCircle className="h-3.5 w-3.5 flex-shrink-0 text-[var(--chat-muted-foreground)]" />
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-[var(--chat-muted-foreground)]">
                        Menemukan {sources.length} rujukan
                    </span>
                    <NavArrowDown
                        className={cn(
                            "h-3.5 w-3.5 text-[var(--chat-muted-foreground)] transition-transform duration-200",
                            isOpen && "rotate-180"
                        )}
                    />
                </button>
            </CollapsibleTrigger>

            <CollapsibleContent className="pt-1">
                <div className="flex flex-col divide-y divide-[var(--chat-border)]">
                    {displayedSources.map(({ source, idx }) => {
                        const parts = getWebCitationDisplayParts(source)
                        return (
                            <SourceItem key={idx} parts={parts} />
                        )
                    })}
                </div>

                {hasMore && (
                    <button
                        type="button"
                        onClick={() => setShowAll(!showAll)}
                        className="flex items-center gap-1 pt-1 font-mono text-[11px] text-[var(--chat-muted-foreground)] transition-colors hover:text-[var(--chat-foreground)]"
                    >
                        {showAll ? (
                            <NavArrowUp className="h-3.5 w-3.5" />
                        ) : (
                            <>
                                <NavArrowDown className="h-3.5 w-3.5" />
                                <span>+{remainingCount}</span>
                            </>
                        )}
                    </button>
                )}
            </CollapsibleContent>
        </Collapsible>
    )
}

function SourceItem({ parts }: { parts: ReturnType<typeof getWebCitationDisplayParts> }) {
    return (
        <a
            href={parts.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col gap-0.5 py-1.5 transition-colors hover:opacity-80"
        >
            <span className="text-xs font-medium text-[var(--chat-foreground)] flex items-center gap-1">
                {parts.title}
                <OpenNewWindow className="h-3 w-3 flex-shrink-0 opacity-0 group-hover:opacity-70 transition-opacity" />
            </span>
            <span className="truncate font-mono text-[11px] text-[var(--chat-info)] dark:text-[oklch(0.746_0.16_232.661)] group-hover:underline">
                {parts.url}
            </span>
        </a>
    )
}
```

**Step 2: Verify no breaking changes**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. ArtifactViewer and FullsizeArtifactModal don't pass `onOpenSheet`, so they keep existing behavior.

**Step 3: Commit**

```bash
git add src/components/chat/SourcesIndicator.tsx
git commit -m "feat(chat): add dual-mode to SourcesIndicator (sheet or collapsible)"
```

---

### Task 3: Add `onOpenSources` prop to MessageBubble

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx:66-91` (MessageBubbleProps interface)
- Modify: `src/components/chat/MessageBubble.tsx:94-107` (function signature)
- Modify: `src/components/chat/MessageBubble.tsx:902-905` (SourcesIndicator usage)

**Step 1: Add `onOpenSources` to MessageBubbleProps**

In `MessageBubble.tsx`, add to the interface (around line 91):

```typescript
// After fileMetaMap line:
    /** Callback to open the Sources sheet with the given sources */
    onOpenSources?: (sources: { url: string; title: string; publishedAt?: number | null }[]) => void
```

**Step 2: Destructure the new prop**

In the function signature (around line 94-107), add `onOpenSources` to destructuring:

```typescript
    fileMetaMap,
    onOpenSources,
}: MessageBubbleProps) {
```

**Step 3: Pass callback to SourcesIndicator**

Change the SourcesIndicator usage (around line 902-905) from:

```tsx
{hasSources && (
    <section aria-label="Sumber referensi">
        <SourcesIndicator sources={sources} />
    </section>
)}
```

To:

```tsx
{hasSources && (
    <section aria-label="Sumber referensi">
        <SourcesIndicator sources={sources} onOpenSheet={onOpenSources} />
    </section>
)}
```

**Step 4: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors. `onOpenSources` is optional so ChatWindow doesn't need to pass it yet.

**Step 5: Commit**

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat(chat): thread onOpenSources callback through MessageBubble"
```

---

### Task 4: Wire up mutual exclusive sheet state in ChatWindow

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx` (import SourcesPanel, add state, wire props)
- Modify: `src/components/chat/ChatProcessStatusBar.tsx` (externalize panel open state)

**Step 1: Externalize ReasoningActivityPanel state from ChatProcessStatusBar**

Currently `ChatProcessStatusBar` manages `isPanelOpen` internally. Change it to accept external control.

In `ChatProcessStatusBar.tsx`, modify the interface and component:

Add to `ChatProcessStatusBarProps`:
```typescript
  /** External control for the reasoning panel open state */
  isPanelOpen?: boolean
  onPanelOpenChange?: (open: boolean) => void
```

Replace the internal `useState`:
```typescript
// Replace: const [isPanelOpen, setIsPanelOpen] = useState(false)
// With:
const [internalPanelOpen, setInternalPanelOpen] = useState(false)
const isPanelOpenValue = isPanelOpen ?? internalPanelOpen
const setPanelOpen = onPanelOpenChange ?? setInternalPanelOpen
```

Update all references from `isPanelOpen` → `isPanelOpenValue` and `setIsPanelOpen` → `setPanelOpen`:
- Line 67: `const openPanel = () => hasSteps && setPanelOpen(true)`
- Line 145: `open={isPanelOpenValue}`
- Line 146: `onOpenChange={setPanelOpen}`

**Step 2: Add state and wiring in ChatWindow**

In `ChatWindow.tsx`:

Add import:
```typescript
import { SourcesPanel } from "./SourcesPanel"
```

Add state (near other state declarations):
```typescript
type ActiveSheet = "proses" | "sources" | null
const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null)
const [sourcesForSheet, setSourcesForSheet] = useState<{ url: string; title: string; publishedAt?: number | null }[]>([])
```

Add handler:
```typescript
const handleOpenSources = useCallback((sources: { url: string; title: string; publishedAt?: number | null }[]) => {
  setSourcesForSheet(sources)
  setActiveSheet("sources")
}, [])

const handleSheetChange = useCallback((sheet: ActiveSheet) => {
  setActiveSheet(sheet)
}, [])
```

Pass to `MessageBubble` (around line 2037-2058), add:
```tsx
onOpenSources={handleOpenSources}
```

Pass to `ChatProcessStatusBar` (around line 2160-2167):
```tsx
<ChatProcessStatusBar
  visible={processUi.visible}
  status={processUi.status}
  progress={processUi.progress}
  elapsedSeconds={processUi.elapsedSeconds}
  reasoningSteps={activeReasoningState.steps}
  reasoningHeadline={activeReasoningState.headline}
  isPanelOpen={activeSheet === "proses"}
  onPanelOpenChange={(open) => handleSheetChange(open ? "proses" : null)}
/>
```

Add SourcesPanel rendering (right after ChatProcessStatusBar):
```tsx
<SourcesPanel
  open={activeSheet === "sources"}
  onOpenChange={(open) => handleSheetChange(open ? "sources" : null)}
  sources={sourcesForSheet}
/>
```

**Step 3: Add `useCallback` to imports if not already imported**

Check that `useCallback` is in the React imports at the top of ChatWindow.tsx.

**Step 4: Verify compilation**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npx tsc --noEmit --pretty 2>&1 | head -30`
Expected: No errors.

**Step 5: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/ChatProcessStatusBar.tsx
git commit -m "feat(chat): wire mutual exclusive sheet state for Sources and Proses panels"
```

---

### Task 5: Visual verification

**Step 1: Start dev server and test**

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npm run dev`

Manual test checklist:
1. Send a chat message that triggers web search (should produce sources)
2. Click "MENEMUKAN X RUJUKAN" → Sources sheet should open from right
3. Verify sheet shows: title "Rujukan", subtitle "X sumber ditemukan", source cards with favicon + domain + title + date
4. Verify clicking a source opens in new tab
5. Click X to close → sheet closes
6. Trigger Proses panel while Sources is open → Sources should close, Proses opens
7. Open Sources while Proses is open → Proses should close, Sources opens
8. On mobile viewport (< 768px) → sheet should come from bottom
9. Open an artifact with sources → verify inline collapsible still works (ArtifactViewer)

**Step 2: Commit any fixes**

```bash
git add -u
git commit -m "fix(chat): visual adjustments for Sources sheet"
```

---

### Task 6: Update existing tests

**Files:**
- Modify: `src/components/chat/MessageBubble.search-status.test.tsx`
- Modify: `src/components/chat/MessageBubble.internal-thought.test.tsx`

**Step 1: Verify existing mocks still work**

Both test files mock `SourcesIndicator` to `() => null`. Since we only added an optional prop, the mock signature doesn't need to change. Verify:

Run: `cd /Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement && npx vitest run src/components/chat/MessageBubble --reporter=verbose 2>&1 | tail -20`
Expected: All existing tests pass.

**Step 2: Commit if any test fixes needed**

```bash
git add -u
git commit -m "test(chat): ensure MessageBubble tests pass with new onOpenSources prop"
```
