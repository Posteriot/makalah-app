# Mobile Artifact/Refrasa Toolbar Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign mobile fullscreen artifact viewer: icon-only top toolbar, refrasa split compare (top-bottom), and issues bottom sheet.

**Architecture:** Modify `MobileArtifactViewer.tsx` to conditionally render artifact vs refrasa toolbar above content. Add `MobileRefrasaIssuesSheet.tsx` as bottom sheet reusing existing `RefrasaIssueItem`. Split compare renders both panels vertically in content area.

**Tech Stack:** React 19, Convex (useQuery/useMutation), iconoir-react, Radix Tooltip, shadcn Sheet/Collapsible, Tailwind CSS 4 with chat tokens.

---

### Task 1: Artifact Toolbar — Icon-Only Top Bar

**Files:**
- Modify: `src/components/chat/mobile/MobileArtifactViewer.tsx`

**Context:** Currently the toolbar is a bottom bar with text labels (Edit, Refrasa, Copy). We move it to a row below the header, icon-only with Radix Tooltips. This task only handles the **non-refrasa** artifact case.

**Step 1: Add imports and copy state**

Add these imports to `MobileArtifactViewer.tsx`:

```tsx
import { useState } from "react"
import { Xmark, EditPencil, Copy, Check, MagicWand, Download, Page } from "iconoir-react"
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from "@/components/ui/tooltip"
```

Add copy feedback state inside the component:

```tsx
const [copied, setCopied] = useState(false)

const handleCopy = () => {
  viewerRef.current?.copy()
  setCopied(true)
  setTimeout(() => setCopied(false), 1500)
}
```

**Step 2: Replace bottom bar with top toolbar for non-refrasa**

Remove the entire bottom action bar (`{/* Bottom action bar */}` section, lines 65-89).

Add a toolbar row between the header `</div>` and the content area, only for non-refrasa artifacts:

```tsx
{/* Toolbar — below header, above content */}
{!isRefrasa && (
  <div className="flex items-center gap-1 border-b border-[color:var(--chat-border)] px-3 py-1.5">
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => viewerRef.current?.startEdit()}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Edit"
          >
            <EditPencil className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Edit</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Salin"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--chat-success)]" strokeWidth={1.5} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Salin</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => { if (artifactId) onRefrasa(artifactId) }}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Refrasa"
          >
            <MagicWand className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Refrasa</TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => viewerRef.current?.download()}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Unduh"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Unduh</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  </div>
)}
```

**Step 3: Verify visually**

Run: `npm run dev`
Open mobile viewport, open an artifact (non-refrasa). Verify:
- Toolbar appears below header with border-bottom separator
- 4 icon buttons: EditPencil, Copy, MagicWand, Download
- Tooltips appear on hover/long-press
- Copy toggles to Check icon for 1.5s
- No bottom bar anymore

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileArtifactViewer.tsx
git commit -m "feat(mobile): artifact toolbar as icon-only top bar with tooltips"
```

---

### Task 2: Refrasa Toolbar with Terapkan Button

**Files:**
- Modify: `src/components/chat/mobile/MobileArtifactViewer.tsx`

**Context:** When `artifact.type === "refrasa"`, render a different toolbar with: issues badge, compare toggle, download, copy, trash, and "Terapkan" button. This task wires up all buttons except issues sheet (Task 4) and compare view (Task 3).

**Step 1: Add refrasa-specific imports and state**

```tsx
import { WarningTriangle, ViewColumns2, Trash } from "iconoir-react"
import { useMutation } from "convex/react"
import { cn } from "@/lib/utils"
```

Add state and mutations inside the component:

```tsx
// Refrasa state
const [showCompare, setShowCompare] = useState(false)
const [showIssuesSheet, setShowIssuesSheet] = useState(false)
const [isApplying, setIsApplying] = useState(false)
const [applied, setApplied] = useState(false)

// Mutations for Terapkan and Hapus
const updateArtifact = useMutation(api.artifacts.update)
const markApplied = useMutation(api.artifacts.markRefrasaApplied)
const removeChain = useMutation(api.artifacts.removeChain)

// Source artifact for compare view
const sourceArtifact = useQuery(
  api.artifacts.get,
  artifact?.sourceArtifactId && user?._id
    ? { artifactId: artifact.sourceArtifactId, userId: user._id }
    : "skip"
)

// Issues from artifact
const issues = artifact?.refrasaIssues
  ? (artifact.refrasaIssues as Array<{ category: string; type: string; message: string; severity: string; suggestion?: string }>)
  : []

// Terapkan handler
const handleApply = async () => {
  if (!artifact?.sourceArtifactId || !artifact.content || !user?._id) return
  setIsApplying(true)
  try {
    await updateArtifact({
      artifactId: artifact.sourceArtifactId,
      userId: user._id,
      content: artifact.content,
    })
    await markApplied({ artifactId: artifactId!, userId: user._id })
    setApplied(true)
    setTimeout(() => onClose(), 1500)
  } catch (err) {
    console.error("[MobileArtifactViewer] Apply failed:", err)
  } finally {
    setIsApplying(false)
  }
}

// Hapus handler
const handleDelete = async () => {
  if (!artifactId || !user?._id) return
  await removeChain({ artifactId, userId: user._id })
  onClose()
}
```

**Step 2: Add refrasa toolbar JSX**

Below the non-refrasa toolbar block (`{!isRefrasa && (...)}`), add:

```tsx
{isRefrasa && (
  <div className="flex items-center gap-1 border-b border-[color:var(--chat-border)] px-3 py-1.5">
    <TooltipProvider delayDuration={200}>
      {/* Issues badge */}
      {issues.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setShowIssuesSheet(true)}
              className="inline-flex items-center gap-1 rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-accent)] px-1.5 py-0.5 text-[10px] font-mono font-semibold text-[var(--chat-foreground)] active:bg-[var(--chat-secondary)] transition-colors duration-50"
              aria-label="Lihat masalah"
            >
              <WarningTriangle className="h-3 w-3" strokeWidth={1.5} />
              {issues.length}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-sans text-xs">Lihat masalah</TooltipContent>
        </Tooltip>
      ) : null}

      {/* Compare toggle */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => setShowCompare((v) => !v)}
            className={cn(
              "rounded-action p-2 transition-colors duration-50",
              showCompare
                ? "bg-[var(--chat-accent)] text-[var(--chat-foreground)]"
                : "text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)]"
            )}
            aria-label="Bandingkan"
          >
            <ViewColumns2 className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Bandingkan</TooltipContent>
      </Tooltip>

      {/* Download */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => viewerRef.current?.download()}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Unduh"
          >
            <Download className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Unduh</TooltipContent>
      </Tooltip>

      {/* Copy */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Salin"
          >
            {copied ? (
              <Check className="h-4 w-4 text-[var(--chat-success)]" strokeWidth={1.5} />
            ) : (
              <Copy className="h-4 w-4" strokeWidth={1.5} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Salin</TooltipContent>
      </Tooltip>

      {/* Trash */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleDelete}
            className="rounded-action p-2 text-[var(--chat-muted-foreground)] active:bg-[var(--chat-accent)] transition-colors duration-50"
            aria-label="Hapus"
          >
            <Trash className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-sans text-xs">Hapus</TooltipContent>
      </Tooltip>

      {/* Terapkan button — pushed right */}
      <button
        onClick={handleApply}
        disabled={isApplying || applied}
        className={cn(
          "ml-auto inline-flex items-center gap-1.5 rounded-action px-3 py-1.5 font-sans text-xs font-medium transition-colors duration-150",
          applied
            ? "bg-[var(--chat-success)] text-[var(--chat-success-foreground)]"
            : "bg-[var(--chat-primary)] text-[var(--chat-primary-foreground)] active:opacity-80"
        )}
      >
        <Check className="h-3.5 w-3.5" strokeWidth={1.5} />
        {applied ? "Diterapkan" : isApplying ? "Menerapkan..." : "Terapkan"}
      </button>
    </TooltipProvider>
  </div>
)}
```

**Step 3: Verify visually**

Open a refrasa artifact on mobile. Verify:
- Refrasa toolbar shows: issues badge, compare, download, copy, trash, Terapkan
- Terapkan button is right-aligned
- Tap Terapkan: loading state → success state → closes viewer after 1.5s
- Tap Trash: deletes and closes

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileArtifactViewer.tsx
git commit -m "feat(mobile): refrasa toolbar with Terapkan, compare toggle, and delete"
```

---

### Task 3: Split Compare View (Top-Bottom)

**Files:**
- Modify: `src/components/chat/mobile/MobileArtifactViewer.tsx`

**Context:** When `showCompare` is true for refrasa artifacts, replace the single ArtifactViewer with a top-bottom split showing original (ASLI) above and refrasa (REFRASA) below.

**Step 1: Add MarkdownRenderer import**

```tsx
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer"
```

**Step 2: Replace content area with conditional split view**

Replace the existing content div:

```tsx
{/* Content area */}
<div className="flex-1 overflow-hidden">
  {isRefrasa && showCompare && sourceArtifact ? (
    {/* Split compare: top-bottom */}
    <div className="flex h-full flex-col">
      {/* Top: Asli */}
      <div className="flex-1 overflow-y-auto border-b border-[color:var(--chat-border)]">
        <div className="px-4 pt-2 pb-1">
          <span className="rounded-badge border border-[color:var(--chat-border)] bg-[var(--chat-secondary)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--chat-secondary-foreground)]">
            Asli
          </span>
        </div>
        <div className="px-4 py-3">
          <MarkdownRenderer
            markdown={sourceArtifact.content ?? ""}
            className="text-sm leading-relaxed text-[var(--chat-foreground)]"
            context="artifact"
          />
        </div>
      </div>
      {/* Bottom: Refrasa */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-4 pt-2 pb-1">
          <span className="rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-info)] px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--chat-info-foreground)]">
            Refrasa
          </span>
        </div>
        <div className="px-4 py-3">
          <MarkdownRenderer
            markdown={artifact?.content ?? ""}
            className="text-sm leading-relaxed text-[var(--chat-foreground)]"
            context="artifact"
          />
        </div>
      </div>
    </div>
  ) : (
    <ArtifactViewer ref={viewerRef} artifactId={artifactId} />
  )}
</div>
```

**Step 3: Verify visually**

Open refrasa artifact → tap ViewColumns2 icon. Verify:
- Top half shows "ASLI" badge + original content, scrollable
- Bottom half shows "REFRASA" badge + refrasa content, scrollable
- Border separator between them
- ViewColumns2 icon has active state (bg accent)
- Tap again returns to single ArtifactViewer

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileArtifactViewer.tsx
git commit -m "feat(mobile): split compare view top-bottom for refrasa"
```

---

### Task 4: Issues Bottom Sheet

**Files:**
- Create: `src/components/chat/mobile/MobileRefrasaIssuesSheet.tsx`
- Modify: `src/components/chat/mobile/MobileArtifactViewer.tsx`

**Context:** When user taps the WarningTriangle badge, open a bottom sheet with issues grouped by NATURALNESS and STYLE, reusing existing `RefrasaIssueItem`.

**Step 1: Create `MobileRefrasaIssuesSheet.tsx`**

```tsx
"use client"

import { useState } from "react"
import { NavArrowDown, NavArrowRight } from "iconoir-react"
import { cn } from "@/lib/utils"
import { RefrasaIssueItem } from "@/components/refrasa/RefrasaIssueItem"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

interface RefrasaIssue {
  category: string
  type: string
  message: string
  severity: string
  suggestion?: string
}

interface MobileRefrasaIssuesSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  issues: RefrasaIssue[]
}

export function MobileRefrasaIssuesSheet({
  open,
  onOpenChange,
  issues,
}: MobileRefrasaIssuesSheetProps) {
  const [naturalnessOpen, setNaturalnessOpen] = useState(true)
  const [styleOpen, setStyleOpen] = useState(false)

  const naturalnessIssues = issues.filter((i) => i.category === "naturalness")
  const styleIssues = issues.filter((i) => i.category === "style")

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[70vh] rounded-t-shell border-t border-[color:var(--chat-border)] bg-[var(--chat-background)] p-0 [&>button]:hidden"
        data-chat-scope=""
      >
        {/* Drag handle */}
        <div className="flex justify-center pb-0 pt-1">
          <div className="h-1 w-10 rounded-full bg-[var(--chat-muted)]" />
        </div>

        <SheetHeader className="gap-0.5 px-4 pb-1.5 pt-1">
          <SheetTitle className="text-left font-sans text-sm font-semibold text-[var(--chat-foreground)]">
            Masalah Refrasa
          </SheetTitle>
          <p className="font-mono text-[11px] text-[var(--chat-muted-foreground)]">
            {issues.length} masalah ditemukan
          </p>
        </SheetHeader>

        <div className="overflow-y-auto px-4 pb-4 pt-2">
          <div className="space-y-3">
            {naturalnessIssues.length > 0 && (
              <Collapsible open={naturalnessOpen} onOpenChange={setNaturalnessOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                  {naturalnessOpen ? (
                    <NavArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <NavArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Naturalness ({naturalnessIssues.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  {naturalnessIssues.map((issue, index) => (
                    <RefrasaIssueItem key={`nat-${index}`} issue={issue} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}

            {styleIssues.length > 0 && (
              <Collapsible open={styleOpen} onOpenChange={setStyleOpen}>
                <CollapsibleTrigger className="flex w-full items-center gap-2 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-[var(--chat-muted-foreground)]">
                  {styleOpen ? (
                    <NavArrowDown className="h-3.5 w-3.5" strokeWidth={1.5} />
                  ) : (
                    <NavArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  Style ({styleIssues.length})
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-2 pt-1">
                  {styleIssues.map((issue, index) => (
                    <RefrasaIssueItem key={`sty-${index}`} issue={issue} />
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
```

**Step 2: Wire up in MobileArtifactViewer**

Add import:
```tsx
import { MobileRefrasaIssuesSheet } from "./MobileRefrasaIssuesSheet"
```

Add the sheet at the end of the component JSX (before closing `</div>`):

```tsx
{/* Issues bottom sheet */}
<MobileRefrasaIssuesSheet
  open={showIssuesSheet}
  onOpenChange={setShowIssuesSheet}
  issues={issues}
/>
```

**Step 3: Verify visually**

Open refrasa artifact with issues → tap WarningTriangle badge. Verify:
- Bottom sheet opens with "Masalah Refrasa" title
- Shows count in subtitle
- NATURALNESS section expanded by default
- STYLE section collapsed by default
- Each issue renders with severity badge + type label + message + optional suggestion
- Sheet dismissible by drag or tap outside

**Step 4: Commit**

```bash
git add src/components/chat/mobile/MobileRefrasaIssuesSheet.tsx src/components/chat/mobile/MobileArtifactViewer.tsx
git commit -m "feat(mobile): refrasa issues bottom sheet with collapsible categories"
```

---

### Task 5: Final Cleanup and Build Verification

**Files:**
- Modify: `src/components/chat/mobile/MobileArtifactViewer.tsx` (if needed)

**Step 1: Run build to check for errors**

```bash
npm run build
```

Fix any TypeScript or import errors.

**Step 2: Run lint**

```bash
npm run lint
```

Fix any linting issues (unused imports, etc).

**Step 3: Visual QA checklist**

Verify all scenarios in mobile viewport:
- [ ] Non-refrasa artifact: icon toolbar (Edit, Copy, Refrasa, Download) below header
- [ ] Refrasa artifact: icon toolbar (Issues, Compare, Download, Copy, Trash, Terapkan)
- [ ] Terapkan button: idle → loading → success → auto-close
- [ ] Compare view: ASLI top, REFRASA bottom, each scrollable
- [ ] Compare toggle: active state on ViewColumns2 icon
- [ ] Issues sheet: opens on badge tap, collapsible sections, draggable
- [ ] Header: document icon for artifacts, "R" badge for refrasa, with title

**Step 4: Commit any fixes**

```bash
git add -A
git commit -m "fix(mobile): cleanup and build verification for artifact toolbar"
```
