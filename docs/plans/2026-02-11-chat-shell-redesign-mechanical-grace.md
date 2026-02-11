# Chat Shell & Layout Redesign (Mechanical Grace Phase 1) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Chat Shell & Layout (the application frame of the chat workspace) to Makalah-Carbon Mechanical Grace standard — covering grid foundation, lateral navigation, sidebar typography, shell header/tabs, and panel resizer refinement.

**Architecture:** This is Phase 1 of 3 for the Chat feature redesign. Phase 1 covers ONLY the outer shell: layout grid, activity bar, sidebar container/typography, shell header, chat tabs, and resizer. It does NOT touch chat message internals (MessageBubble, ChatInput, ChatWindow content), artifact panel content (ArtifactViewer, ArtifactEditor), or any backend logic.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Iconoir, Convex (read-only — no backend changes)

**Key References:**
- Justification doc: `docs/makalah-design-system/justification-docs/chat-shell-redesign.md`
- Design system core: `docs/makalah-design-system/docs/MANIFESTO.md`
- Naming rules: `docs/makalah-design-system/docs/class-naming-convention.md`
- Color rules: `docs/makalah-design-system/docs/justifikasi-warna.md`
- Shape/layout rules: `docs/makalah-design-system/docs/shape-layout.md`
- Typography rules: `docs/makalah-design-system/docs/typografi.md`
- Component blueprint: `docs/makalah-design-system/docs/komponen-standar.md`
- Visual language: `docs/makalah-design-system/docs/bahasa-visual.md`

**Current State Snapshot:**
- `ChatLayout.tsx` already has 6-column CSS Grid with CSS variables (`--activity-bar-width: 48px`, `--header-height: 72px`, etc.) and animated grid transitions (`duration-300 ease-in-out`).
- `ActivityBar.tsx` already uses Iconoir icons and amber-500 active indicator, but background is `bg-sidebar` instead of `bg-slate-950`.
- `ChatSidebar.tsx` uses `bg-sidebar` and standard `border-r` — needs `bg-card` + `border-r-hairline`.
- `SidebarChatHistory.tsx` uses `font-medium text-sm` for items — needs Geist Sans Medium + padding update. Group label "Conversations" at line 155 is `text-xs text-muted-foreground` — needs Geist Mono Bold Uppercase 10px.
- `ShellHeader.tsx` already at 72px with diagonal stripes. Border is `h-px bg-border` — needs `border-hairline`.
- `ChatTabs.tsx` uses `bg-muted` — needs `bg-background`. Height already `h-9`/36px.
- `PanelResizer.tsx` uses `bg-sky-500/30` hover — needs `bg-amber-500` feedback per spec.
- `ChatMiniFooter.tsx` exists with proper Mechanical Grace tokens but is NOT rendered in `ChatLayout.tsx` — layout has its own inline footer at line 421-427.
- `useResizer.ts` is a utility hook that exists but is not actively used by `ChatLayout` (layout uses inline resize logic).

**Migration Strategy (Best Recommendation):**
- Follow Structure -> Visual -> Content -> Theme order from migration guide.
- 7 tasks, each scoped to a single concern, each with its own commit.
- Order: Outer Layout Texture -> Grid Foundation -> Activity Bar -> Sidebar Typography -> Shell Header -> Tab Bar -> Resizer Precision.

---

## GLOBAL RULES (APPLY TO EVERY TASK)

### MANDATORY:
- **KERJAKAN HANYA UNTUK FRONTEND, JANGAN UBAH BACKEND** — Tidak ada perubahan di `convex/` directory. Semua perubahan hanya di `src/` (components, app routes, styles).
- **LAKUKAN COMMIT HANYA UNTUK TUGAS DI BRANCH `feat/chat-page-redesign-mechanical-grace`** — Jika ada perubahan di branch lain, ABAIKAN. Jangan switch branch.

### Constraints:
- **DILARANG** mengubah aturan setting model/coding LLM dan providernya (primary Gateway maupun fallback OpenRouter), kecuali untuk kepentingan perubahan UI/komponen.
- **DILARANG** mengubah aturan setting/coding search web tool (google grounding maupun fallback `:online` dari OpenRouter), kecuali untuk kepentingan perubahan UI/komponen.
- **DILARANG** mengubah aturan setting/coding artifact (create, update, view logic di `convex/artifacts.ts`), kecuali untuk kepentingan perubahan UI/komponen.
- **DILARANG** mengubah aturan setting/coding workflow paper dan seluruh fungsi yang terhubung dengannya (`convex/paperSessions.ts`, `src/lib/ai/paper-*.ts`), kecuali untuk kepentingan perubahan UI/komponen.
- **DILARANG** mengubah file di luar scope Phase 1 (chat message internals, artifact panel content, backend functions).

---

## Task 1: Outer Layout — Add Industrial Dotted Texture

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah `ensureConvexUser()` logic atau auth flow di layout. Hanya sentuh visual wrapper.

**Files:**
- Modify: `src/app/chat/layout.tsx:64-68`

**Step 1: Add `.bg-dots` texture class to the outer wrapper**

Current code (line 65):
```tsx
<div className="min-h-screen bg-background text-foreground">
```

Change to:
```tsx
<div className="min-h-screen bg-background text-foreground bg-dots">
```

The `.bg-dots` class should already be defined in `globals.css` as part of the Mechanical Grace token system (dotted industrial texture at 10-15% opacity with radial mask fade-out). If it does not exist, add it to `src/app/globals.css`:

```css
.bg-dots {
  background-image: radial-gradient(circle, oklch(.372 0 0) 1px, transparent 1px);
  background-size: 24px 24px;
  background-position: 0 0;
}
```

**Step 2: Verify the texture renders**

Run: `npm run dev`
- Open `http://localhost:3000/chat`
- Verify subtle dotted texture is visible on the background
- Verify texture does NOT interfere with readability of chat content
- Verify texture appearance in both light and dark mode

**Step 3: Commit**

```bash
git add src/app/chat/layout.tsx src/app/globals.css
git commit -m "feat(chat): add industrial dotted texture to chat layout wrapper"
```

**Verification Checklist (Task 1):**
- [ ] `.bg-dots` texture visible on chat workspace background
- [ ] Texture opacity is subtle (10-15%), not distracting
- [ ] Both light and dark mode render correctly
- [ ] `ensureConvexUser()` logic is completely untouched

---

## Task 2: Grid Foundation & Footer Integration

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah logic di `useConversations`, `useTabState`, atau hooks lain. Dilarang mengubah callback handlers. Hanya sentuh JSX layout dan CSS classes.

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx:291-432`
- Reference: `src/components/chat/ChatMiniFooter.tsx` (will be imported)

**Step 1: Replace inline footer with ChatMiniFooter component**

Current inline footer (lines 420-427):
```tsx
<footer className="fixed bottom-0 left-0 right-0 h-8 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-background border-t z-10">
  <span className="font-medium">Makalah AI</span>
  <span className="opacity-50">·</span>
  <span className="opacity-80">© 2026</span>
  <span className="opacity-50">·</span>
  <span className="opacity-80">v1.0</span>
</footer>
```

Replace with:
```tsx
<ChatMiniFooter />
```

Add import at top of file:
```tsx
import { ChatMiniFooter } from "../ChatMiniFooter"
```

This uses the existing `ChatMiniFooter` component which already has proper Mechanical Grace tokens: `border-hairline`, `text-interface`, `text-[10px]`, `tracking-wider uppercase`, `bg-sidebar`.

**Step 2: Ensure grid container border-hairline consistency**

The sidebar aside (line 325-331) currently uses `border-r`:
```tsx
"flex flex-col border-r bg-sidebar overflow-hidden",
```

Change to use hairline border:
```tsx
"flex flex-col border-r border-border/50 bg-sidebar overflow-hidden",
```

The artifact panel aside (line 385-393) currently uses `border-l`:
```tsx
"border-l bg-card",
```

Change to use hairline border:
```tsx
"border-l border-border/50 bg-card",
```

**Step 3: Verify layout stability**

Run: `npm run dev`
- Open `http://localhost:3000/chat`
- Verify footer shows "© 2026 Makalah" in Mono uppercase
- Verify sidebar right border is hairline (subtle)
- Verify artifact panel left border is hairline
- Verify grid columns animate smoothly when sidebar collapses/expands
- Verify mobile Sheet sidebar still works

**Step 4: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx
git commit -m "feat(chat): integrate ChatMiniFooter and apply hairline borders to grid panels"
```

**Verification Checklist (Task 2):**
- [ ] Inline footer replaced with `ChatMiniFooter` component
- [ ] Footer renders Mono uppercase copyright text
- [ ] Sidebar right border is hairline (0.5px visual)
- [ ] Artifact panel left border is hairline
- [ ] Grid column transitions still animate `duration-300 ease-in-out`
- [ ] Mobile Sheet sidebar unaffected
- [ ] No handler logic modified

---

## Task 3: Activity Bar — Slate 950 Background & Active Strip Refinement

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah keyboard navigation logic, panel switching logic, atau accessibility attributes. Hanya sentuh visual styling classes.

**Files:**
- Modify: `src/components/chat/shell/ActivityBar.tsx:189-193` (nav container)
- Modify: `src/components/chat/shell/ActivityBar.tsx:57-62` (item button)

**Step 1: Change Activity Bar background to Slate 950**

Current nav container (lines 189-193):
```tsx
"flex flex-col items-center py-2 gap-1",
"w-[var(--activity-bar-width)] min-w-[48px]",
"border-r bg-sidebar"
```

Change to:
```tsx
"flex flex-col items-center py-2 gap-1",
"w-[var(--activity-bar-width)] min-w-[48px]",
"border-r border-border/50 bg-slate-950"
```

**Step 2: Refine active state indicator**

Current active state on `ActivityBarItem` buttons (lines 57-62):
```tsx
"w-10 h-10 rounded-lg transition-all duration-150",
"text-muted-foreground hover:text-foreground hover:bg-accent",
"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
isActive && "text-foreground border-l-2 border-amber-500 bg-amber-500/10"
```

Refine for better contrast on dark background:
```tsx
"w-10 h-10 rounded-action transition-all duration-150",
"text-slate-400 hover:text-slate-50 hover:bg-slate-800",
"focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
isActive && "text-slate-50 border-l-2 border-amber-500 bg-amber-500/10"
```

Key changes:
- `rounded-lg` -> `rounded-action` (Mechanical Grace naming)
- `hover:bg-accent` -> `hover:bg-slate-800` (works on slate-950 background)
- `focus-visible:ring-primary` -> `focus-visible:ring-info` (Sky focus ring per spec)
- Added `ring-offset-slate-950` so focus ring offset matches dark background
- `text-muted-foreground` -> `text-slate-400` (explicit on dark bg)
- `hover:text-foreground` -> `hover:text-slate-50` (explicit on dark bg)

**Step 3: Refine sidebar toggle button**

Current toggle button (lines 203-206):
```tsx
"w-10 h-10 rounded-lg mb-2",
"text-muted-foreground hover:text-foreground hover:bg-accent",
"focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
```

Change to match dark background:
```tsx
"w-10 h-10 rounded-action mb-2",
"text-slate-400 hover:text-slate-50 hover:bg-slate-800",
"focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
```

**Step 4: Verify Activity Bar visual**

Run: `npm run dev`
- Verify Activity Bar background is the darkest shade (Slate 950)
- Verify active item has amber left strip + subtle amber background
- Verify hover state shows slate-800 highlight
- Verify focus ring is Sky/Info color
- Verify icons remain Iconoir at correct sizes
- Verify keyboard navigation (Arrow Up/Down, Home, End) still works

**Step 5: Commit**

```bash
git add src/components/chat/shell/ActivityBar.tsx
git commit -m "feat(chat): apply Slate-950 background and refine active indicator on ActivityBar"
```

**Verification Checklist (Task 3):**
- [ ] Activity Bar background is `bg-slate-950`
- [ ] Active indicator is amber left strip (2px border-l)
- [ ] Hover shows `bg-slate-800` highlight
- [ ] Focus ring uses `ring-info` (Sky color)
- [ ] `rounded-action` used instead of `rounded-lg`
- [ ] Border to sidebar is hairline
- [ ] Keyboard navigation unchanged
- [ ] No panel switching logic modified

---

## Task 4: Sidebar Container & Typography

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah conversation CRUD logic, paper session queries, rewind logic, atau subscription tier logic. Hanya sentuh visual classes dan typography.

**Files:**
- Modify: `src/components/chat/ChatSidebar.tsx:118-178`
- Modify: `src/components/chat/sidebar/SidebarChatHistory.tsx:196-371`
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx:99-157`
- Modify: `src/components/chat/sidebar/SidebarProgress.tsx:366-409`

### Part A: ChatSidebar Container

**Step 1: Change container background and button radius**

Current container (line 121):
```tsx
"w-full h-full flex flex-col bg-sidebar overflow-hidden",
```

Change to:
```tsx
"w-full h-full flex flex-col bg-card overflow-hidden",
```

Current "Percakapan Baru" button (line 133):
```tsx
className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-[10px] gap-2 text-sm"
```

Change to proper Mechanical Grace radius:
```tsx
className="w-full py-2.5 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-action gap-2 text-sm"
```

**Step 2: Change section label to Geist Mono Bold Uppercase**

Current section label (lines 154-157):
```tsx
<div className="py-2 px-4 text-xs text-muted-foreground">
  Conversations <span className="ml-2">{conversations.length}</span>
</div>
```

Change to Mechanical Grace `.text-signal` pattern:
```tsx
<div className="py-2 px-4 text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">
  Riwayat Chat <span className="ml-2 font-mono">{conversations.length}</span>
</div>
```

### Part B: SidebarChatHistory Items

**Step 3: Update list item padding and typography**

Current list items use inline class string (line 206-210):
```tsx
const itemClasses = `group flex items-center w-full p-3 transition-colors text-left ${
  currentConversationId === conv._id
    ? "bg-list-selected-bg"
    : "hover:bg-list-hover-bg"
}`
```

Change to "airy" padding (`p-2.5` per spec) and use `cn()`:
```tsx
const itemClasses = cn(
  "group flex items-center w-full p-2.5 transition-colors text-left",
  currentConversationId === conv._id
    ? "bg-list-selected-bg"
    : "hover:bg-list-hover-bg"
)
```

Current title text (line 234):
```tsx
<span className="font-medium text-sm truncate"
```

Ensure it uses Geist Sans Medium (should already be default since `font-medium` is 500):
```tsx
<span className="font-sans font-medium text-sm truncate"
```

Current time text (line 254):
```tsx
<div className="text-xs text-muted-foreground">
```

Change to Mono for timestamps:
```tsx
<div className="text-xs text-muted-foreground font-mono">
```

### Part C: SidebarPaperSessions Typography

**Step 4: Apply Mono typography to paper sessions header**

Current header (lines 101-106 in empty state, lines 135-139 in active state):
```tsx
<div className="text-base font-semibold">Paper Sessions</div>
<div className="text-[13px] text-muted-foreground">
```

Change header to Mono Bold Uppercase signal style:
```tsx
<div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground">Paper Sessions</div>
<div className="text-[11px] font-mono text-muted-foreground/70 mt-1">
```

Apply this same change to BOTH the empty state header (line 102) and the active state header (line 136).

### Part D: SidebarProgress Typography

**Step 5: Apply hairline border and Mono typography to progress header**

Current header border (line 370):
```tsx
<div className="p-4 border-b border-slate-800">
```

Change to hairline:
```tsx
<div className="p-4 border-b border-border/50">
```

Current progress title (line 371):
```tsx
<div className="text-sm font-semibold mb-1">Progress</div>
```

Change to Mono Bold Uppercase signal:
```tsx
<div className="text-[10px] font-mono font-bold uppercase tracking-widest text-muted-foreground mb-1">Progress</div>
```

Current connecting line pending state (line 181):
```tsx
state === "completed" ? "bg-amber-500" : "bg-slate-700"
```

Change to use border token:
```tsx
state === "completed" ? "bg-amber-500" : "bg-border"
```

**Step 6: Verify all sidebar typography**

Run: `npm run dev`
- Verify "RIWAYAT CHAT" label is Mono Bold Uppercase 10px with wide tracking
- Verify chat history items use Sans Medium with `p-2.5` padding
- Verify timestamps use Mono font
- Verify "PAPER SESSIONS" label is Mono Bold Uppercase 10px
- Verify "PROGRESS" label is Mono Bold Uppercase 10px
- Verify hairline borders on progress header
- Verify conversation CRUD still works (create, edit, delete)
- Verify paper session folder expand/collapse still works
- Verify progress rewind still works

**Step 7: Commit**

```bash
git add src/components/chat/ChatSidebar.tsx src/components/chat/sidebar/SidebarChatHistory.tsx src/components/chat/sidebar/SidebarPaperSessions.tsx src/components/chat/sidebar/SidebarProgress.tsx
git commit -m "feat(chat): apply Mechanical Grace typography and spacing to sidebar components"
```

**Verification Checklist (Task 4):**
- [ ] Sidebar container background is `bg-card`
- [ ] "Percakapan Baru" button uses `rounded-action`
- [ ] Section label "RIWAYAT CHAT" is Mono Bold Uppercase 10px tracking-widest
- [ ] List items have `p-2.5` padding (airy)
- [ ] Item titles use `font-sans font-medium`
- [ ] Timestamps use `font-mono`
- [ ] Paper Sessions header is Mono Bold Uppercase signal style
- [ ] Progress header is Mono Bold Uppercase signal style
- [ ] Progress header border is hairline
- [ ] Conversation CRUD functionality unchanged
- [ ] Paper session queries unchanged
- [ ] Rewind logic unchanged

---

## Task 5: Shell Header — Hairline Border & Badge Refinement

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah theme toggle logic, notification dropdown behavior, user dropdown behavior, atau artifact panel toggle logic. Hanya sentuh visual classes.

**Files:**
- Modify: `src/components/chat/shell/ShellHeader.tsx:49-218`

**Step 1: Apply hairline bottom border**

Current bottom border line (lines 212-216):
```tsx
<div
  className={cn(
    "absolute bottom-0 left-0 right-0",
    "h-px bg-border"
  )}
/>
```

Change to hairline:
```tsx
<div
  className={cn(
    "absolute bottom-0 left-0 right-0",
    "h-px bg-border/50"
  )}
/>
```

**Step 2: Refine header button radius**

Current theme toggle and panel toggle buttons (lines 120-121, 144-145):
```tsx
"w-9 h-9 rounded-lg",
```

Change to Mechanical Grace naming:
```tsx
"w-9 h-9 rounded-action",
```

**Step 3: Ensure artifact badge is rounded-full with neutral background**

Current badge (lines 158-168):
```tsx
"min-w-[18px] h-[18px] px-1",
"flex items-center justify-center",
"text-[10px] font-semibold font-mono",
"bg-amber-500 text-white",
"rounded-full",
```

This already matches the spec (rounded-full, neutral can be amber for primary brand). Keep as-is. The spec says "rounded-full dengan background neutral" — amber-500 is the primary brand color and is acceptable per Signal Theory.

**Step 4: Verify header visual**

Run: `npm run dev`
- Verify header height is 72px
- Verify bottom border is hairline (subtle)
- Verify diagonal stripes separator renders correctly
- Verify buttons use `rounded-action`
- Verify artifact count badge is `rounded-full`
- Verify theme toggle works (light/dark switch)
- Verify notification dropdown opens/closes
- Verify user dropdown opens/closes
- Verify panel toggle works

**Step 5: Commit**

```bash
git add src/components/chat/shell/ShellHeader.tsx
git commit -m "feat(chat): apply hairline border and rounded-action to ShellHeader"
```

**Verification Checklist (Task 5):**
- [ ] Header bottom border is hairline
- [ ] Buttons use `rounded-action` instead of `rounded-lg`
- [ ] Diagonal stripes still render correctly
- [ ] Theme toggle, notification, user dropdown all functional
- [ ] Artifact panel toggle functional
- [ ] No logic changes to toggle/dropdown handlers

---

## Task 6: Tab Bar — Minimalist Background

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah tab switching logic, keyboard navigation, scroll behavior, atau close handlers. Hanya sentuh visual classes.

**Files:**
- Modify: `src/components/chat/shell/ChatTabs.tsx:180-378`

**Step 1: Change tab bar background to minimalist**

Current tab bar container (lines 182-187):
```tsx
"flex items-stretch",
"h-9 min-h-[36px]",
"bg-muted border-b border-border",
"flex-shrink-0"
```

Change to:
```tsx
"flex items-stretch",
"h-9 min-h-[36px]",
"bg-background border-b border-border/50",
"flex-shrink-0"
```

**Step 2: Update fade gradients to match new background**

Current left fade (line 203):
```tsx
"bg-gradient-to-r from-muted to-transparent",
```

Change to:
```tsx
"bg-gradient-to-r from-background to-transparent",
```

Current right fade (line 215):
```tsx
"bg-gradient-to-l from-muted to-transparent",
```

Change to:
```tsx
"bg-gradient-to-l from-background to-transparent",
```

**Step 3: Refine tab item styling**

Current tab items (lines 250-266):
```tsx
"px-3 h-[35px] rounded-t-[6px]",
"bg-transparent border-b-2 border-transparent",
"font-mono text-sm cursor-pointer",
```

The `rounded-t-[6px]` matches `rounded-badge` (6px). Keep as-is — this is correct per the shape system.

Active state (line 261):
```tsx
activeTabId === tab.id && "bg-background border-b-amber-500",
```

Since we changed container to `bg-background`, the active tab needs a slightly different shade to differentiate:
```tsx
activeTabId === tab.id && "bg-card border-b-amber-500",
```

**Step 4: Verify tab bar**

Run: `npm run dev`
- Open a conversation to see tab bar render
- Verify tab bar background is plain `bg-background`
- Verify active tab has amber bottom border and slightly contrasting background
- Verify fade gradients work at overflow edges
- Verify tab switching, close, close-all work
- Verify keyboard navigation (ArrowLeft/Right, Home, End, Delete)

**Step 5: Commit**

```bash
git add src/components/chat/shell/ChatTabs.tsx
git commit -m "feat(chat): apply minimalist background and hairline border to ChatTabs"
```

**Verification Checklist (Task 6):**
- [ ] Tab bar background is `bg-background` (minimalist)
- [ ] Bottom border is hairline (`border-border/50`)
- [ ] Active tab uses `bg-card` for subtle contrast
- [ ] Active tab amber bottom border preserved
- [ ] Fade gradients match new background
- [ ] Tab switching, close, close-all functional
- [ ] Keyboard navigation functional
- [ ] No logic changes to scroll/navigation handlers

---

## Task 7: Panel Resizer — Amber Feedback & Precision Handle

**MANDATORY:** FRONTEND ONLY. NO BACKEND CHANGES. COMMIT ONLY ON `feat/chat-page-redesign-mechanical-grace`.
**Constraints:** Dilarang mengubah drag logic, mouse event handlers, keyboard handlers, atau accessibility attributes. Hanya sentuh visual classes.

**Files:**
- Modify: `src/components/chat/layout/PanelResizer.tsx:105-142`

**Step 1: Change hover/drag feedback to amber-500**

Current styling (lines 116-128):
```tsx
// Base styles
"relative z-20 flex-shrink-0",
"w-1 cursor-col-resize",
"transition-colors duration-150",
// Default: transparent, hover/drag: Sky feedback per Mechanical Grace spec
"bg-transparent hover:bg-sky-500/30",
isDragging && "bg-sky-500/50",
// Position-specific margins for overlap
position === "left" && "-mx-0.5",
position === "right" && "-mx-0.5",
```

Change to amber-500 feedback per justification doc:
```tsx
// Base styles
"relative z-20 flex-shrink-0",
"w-0.5 cursor-col-resize",
"transition-colors duration-150",
// Default: transparent, hover/drag: Amber feedback per chat-shell-redesign spec
"bg-transparent hover:bg-amber-500/40",
isDragging && "bg-amber-500/60",
// Position-specific margins for overlap
position === "left" && "-mx-0.5",
position === "right" && "-mx-0.5",
```

Key changes:
- `w-1` (4px) -> `w-0.5` (2px) for visual handle — thinner per spec
- `hover:bg-sky-500/30` -> `hover:bg-amber-500/40` — amber feedback per spec
- `isDragging && "bg-sky-500/50"` -> `isDragging && "bg-amber-500/60"` — amber drag

The hit area remains at 12px (line 137: `w-3 -left-1`) — this ensures usability is preserved despite thinner visual handle.

**Step 2: Update comment to reflect spec change**

Change the comment on line 121 from:
```tsx
// Default: transparent, hover/drag: Sky feedback per Mechanical Grace spec
```
To:
```tsx
// Default: transparent, hover/drag: Amber feedback per chat-shell-redesign spec
```

**Step 3: Verify resizer behavior**

Run: `npm run dev`
- Open a conversation with artifact panel open
- Hover over sidebar resizer — should show subtle amber highlight
- Drag sidebar resizer — should show stronger amber
- Hover over panel resizer — same amber behavior
- Verify drag resize still works smoothly
- Verify double-click reset works
- Verify keyboard resize (Arrow keys) works
- Verify no heavy reflow in message area during resize

**Step 4: Commit**

```bash
git add src/components/chat/layout/PanelResizer.tsx
git commit -m "feat(chat): apply amber feedback and thinner visual handle to PanelResizer"
```

**Verification Checklist (Task 7):**
- [ ] Resizer visual handle is 2px wide (`w-0.5`)
- [ ] Hit area remains 12px wide (`w-3`) for usability
- [ ] Hover shows `bg-amber-500/40` (amber)
- [ ] Active drag shows `bg-amber-500/60` (stronger amber)
- [ ] Drag resize works smoothly
- [ ] Double-click reset works
- [ ] Keyboard resize works
- [ ] No performance issues during resize
- [ ] No drag logic modified

---

## Final Verification Checklist (All Tasks Complete)

From `chat-shell-redesign.md` Section 4:

- [ ] **Grid Audit**: 6-column grid is perfectly synchronized with no layout leaks.
- [ ] **Border Audit**: ALL panel separators (Sidebar, Header, Tabs) use hairline 0.5px borders.
- [ ] **Typography Audit**: Sidebar labels and shell headings use Geist Mono.
- [ ] **Performance Audit**: Resizing does NOT cause heavy reflow in the message area.
- [ ] **Responsive Audit**: Sidebar automatically collapses on mobile and uses the Carbon `Sheet` component.

**Run full build to catch type errors:**
```bash
npm run build
```

**Run lint to catch style issues:**
```bash
npm run lint
```

---

## Post-Implementation Notes

- **Phase 2** (planned separately): Chat message internals — MessageBubble, ChatInput, ChatWindow, TemplateGrid, ThinkingIndicator, etc.
- **Phase 3** (planned separately): Action panel content — ArtifactPanel, ArtifactViewer, ArtifactEditor, FullsizeArtifactModal, etc.
- `useResizer.ts` hook was NOT modified in this phase because `ChatLayout` uses its own inline resize logic. If future refactor consolidates resize logic, this hook can be updated then.
