# Chat Interface & Messages Redesign (Mechanical Grace Phase 2) — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Chat Interface & Messages (area percakapan) to Makalah-Carbon Mechanical Grace standard — covering message bubbles, markdown typography, citation chips, chat input, quick actions, landing page cards, template grid, and status indicators.

**Architecture:** This is Phase 2 of the Chat feature redesign. Phase 1 (completed) covered the outer shell: layout grid, activity bar, sidebar, header, tabs, resizer. Phase 2 covers the conversation internals: message presentation, input processing, and supporting indicators. Principle: **"Vibrant Silence"** — conversation area must be free from visual noise, with focus on academic text.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS v4, shadcn/ui, Iconoir, Convex (read-only — no backend changes)

**Key References:**
- Justification doc: `docs/makalah-design-system/justification-docs/chat-interface-redesign.md`
- Design system core: `docs/makalah-design-system/docs/MANIFESTO.md`
- Shape/layout rules: `docs/makalah-design-system/docs/shape-layout.md`
- Typography rules: `docs/makalah-design-system/docs/typografi.md`
- Component blueprint: `docs/makalah-design-system/docs/komponen-standar.md`
- Color rules: `docs/makalah-design-system/docs/justifikasi-warna.md`

**Current State Snapshot (on branch `feat/chat-page-redesign-mechanical-grace`):**
- Phase 1 commits: 7 commits (dotted texture, mini-footer, activity bar, sidebar typography, shell header, chat tabs, panel resizer)
- `MessageBubble.tsx`: User bubble uses `rounded-lg`, `bg-user-message-bg`, `border border-slate-800`. Assistant is full-width, no bubble. Edit textarea uses `rounded-lg` + dashed `border-sky-500`. File badge uses `rounded-md`.
- `MarkdownRenderer.tsx`: Headings use standard sizes without `tracking-tight`. Inline code uses generic `rounded`. Code blocks use `rounded-md`. Blockquote uses `border-l-2`. HR uses `border-muted-foreground/20`.
- `InlineCitationChip.tsx`: Mobile badge uses `rounded-full` via shadcn Badge `variant="secondary"`. No explicit Mono font on chip label.
- `ChatInput.tsx`: Container uses `bg-chat-input` + `border-t`. Textarea uses `rounded-lg`. Send button uses `rounded-lg`. Placeholder is default font (no explicit Mono). File attachment chips use generic `rounded`.
- `QuickActions.tsx`: Button uses `rounded-md`. Already has `font-mono text-[10px]`.
- `FileUploadButton.tsx`: Button uses `rounded-md`.
- `ChatWindow.tsx`: Landing page feature cards use `rounded-lg`, `bg-slate-800/50`, `border border-slate-700`. Icon container uses `rounded-2xl`. Skeleton uses `rounded-lg`. Error overlay uses `rounded-lg`. Mobile headers use `border-slate-800`.
- `TemplateGrid.tsx`: Cards use `rounded-lg`, `border border-slate-800`. Icon box uses `rounded-lg`. Badge uses generic `rounded`.
- `ThinkingIndicator.tsx`: Container uses `rounded-lg`, `border border-slate-700`.
- `SearchStatusIndicator.tsx`: Container uses `rounded-md`. Signal Theory colors already correct (Sky, Emerald, Rose).

**CSS Tokens Available (in `globals.css`):**
- `.rounded-shell` = `var(--radius-xl)` = 16px
- `.rounded-action` = `var(--radius-sm)` = 4px (NOTE: spec says 8px, CSS maps to 4px — known discrepancy, do NOT change global token)
- `.rounded-badge` = `var(--radius-s-md)` = 6px
- `.border-hairline` = 0.5px + `var(--border-hairline)`
- `.border-main` = 1px
- `.border-ai` = 1px dashed + `var(--ai-border)`
- `.hover-slash` = diagonal stripes pattern (via `::before` pseudo-element, requires `position: relative`)
- `bg-user-message-bg` → `var(--user-message-bg)` → dark: `var(--slate-800)`, light: `var(--slate-100)`
- `bg-chat-input` → `var(--chat-input)` → dark: `var(--slate-800)`, light: `var(--slate-100)`

**Migration Strategy (Best Recommendation):**
- Follow the spec's 4 migration steps + 2 extra for non-spec components.
- 6 tasks, each scoped to a clear concern, each with its own commit.
- Order: MessageBubble → Markdown/Citation → ChatInput → QuickActions → Landing/Templates → Indicators.

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
- **DILARANG** mengubah file di luar scope Phase 2 (shell/layout components sudah selesai di Phase 1, artifact panel content).

### Verification (run after EVERY task):
```bash
npx tsc --noEmit          # TypeScript check
npm run build             # Production build
npm run lint              # ESLint check
```

---

## Task 1: MessageBubble — Bubble & Gravity Polish

**Justification:** Spec Step 1 — "User message bubble → bg-card + border-main + rounded-shell (16px). Assistant → transparent, no border, narrative flow."

**Files:**
- Modify: `src/components/chat/MessageBubble.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch.

### Step 1: Update user message bubble container

In `MessageBubble.tsx` at line 319-331, change the user message container classes:

**Current (line 322-328):**
```tsx
isUser && [
    "rounded-lg",
    "bg-user-message-bg",
    "border border-slate-800",
    "max-w-[85%]",
],
```

**Change to:**
```tsx
isUser && [
    "rounded-shell",
    "bg-card",
    "border border-border/50",
    "max-w-[85%]",
],
```

**Why:** `rounded-shell` = 16px (instruction container). `bg-card` replaces legacy `bg-user-message-bg`. `border-border/50` = hairline-like opacity (using directional border approach from Phase 1).

### Step 2: Update edit button radius

In `MessageBubble.tsx` at line 290, change:
```tsx
className="p-1.5 hover:bg-accent rounded-md text-muted-foreground hover:text-foreground transition-colors"
```
to:
```tsx
className="p-1.5 hover:bg-accent rounded-action text-muted-foreground hover:text-foreground transition-colors"
```

And at line 303, change the disabled edit button:
```tsx
className="p-1.5 rounded-md text-muted-foreground/40 cursor-not-allowed"
```
to:
```tsx
className="p-1.5 rounded-action text-muted-foreground/40 cursor-not-allowed"
```

### Step 3: Update edit textarea and edit action buttons

Edit textarea at line 373, change `rounded-lg` to `rounded-action`:
```tsx
className="w-full rounded-action p-3 text-sm bg-background border border-dashed border-sky-500 text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none overflow-hidden"
```

Cancel button at line 380, change `rounded-md` to `rounded-action`:
```tsx
className="px-3 py-1.5 rounded-action text-xs font-mono flex items-center gap-1.5 hover:bg-accent transition-colors"
```

Send button at line 387, change `rounded-md` to `rounded-action`:
```tsx
className="px-3 py-1.5 rounded-action text-xs font-mono flex items-center gap-1.5 font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
```

### Step 4: Update file attachment badge

At line 340, change `rounded-md` to `rounded-badge`:
```tsx
<span className="inline-flex items-center gap-1.5 text-xs py-1 px-2.5 rounded-badge bg-info/20 text-info border border-info/30">
```

### Step 5: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes — only styling class swaps.

### Step 6: Commit

```bash
git add src/components/chat/MessageBubble.tsx
git commit -m "feat(chat): apply Mechanical Grace bubble styling to MessageBubble

- User bubble: rounded-shell (16px), bg-card, border-border/50
- Edit button/textarea/actions: rounded-action
- File badge: rounded-badge
- Assistant bubble: unchanged (already transparent, narrative flow)"
```

---

## Task 2: MarkdownRenderer & InlineCitationChip — Typography & Citation Precision

**Justification:** Spec Step 2 — "Headings with tracking-tight, vertical rhythm 4px grid. InlineCitationChip uses Geist Mono (tabular) + rounded-badge + text-signal."

**Files:**
- Modify: `src/components/chat/MarkdownRenderer.tsx`
- Modify: `src/components/chat/InlineCitationChip.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch.

### Step 1: Update heading styles in MarkdownRenderer

In `MarkdownRenderer.tsx`, update all heading classNames to add `tracking-tight` (industrial feel per typography rules):

**h1 (line 417):**
```tsx
<h1 key={k} className="mt-6 mb-2 text-2xl font-bold tracking-tight text-foreground">
```

**h2 (line 425):**
```tsx
<h2 key={k} className="mt-8 mb-1 text-xl font-bold tracking-tight text-foreground first:mt-0">
```

**h3 (line 433):**
```tsx
<h3 key={k} className="mt-5 mb-1 text-lg font-semibold tracking-tight text-foreground">
```

**h4 (line 440):**
```tsx
<h4 key={k} className="mt-4 mb-1 text-base font-semibold tracking-tight text-foreground">
```

### Step 2: Update code block radius

Inline code at line 275, change `rounded` to `rounded-badge`:
```tsx
className="rounded-badge bg-background/50 px-1 py-0.5 font-mono text-[0.85em]"
```

Code block `<pre>` at line 509, change `rounded-md` to `rounded-action`:
```tsx
<pre className="my-2 overflow-x-auto rounded-action bg-background/50 p-3 text-xs leading-relaxed">
```

### Step 3: Update blockquote border and HR

Blockquote at line 518, make border explicit:
```tsx
<blockquote key={k} className="border-l-2 border-border pl-3 my-2 opacity-90 space-y-2">
```

HR at line 528, update to use `border-border/50`:
```tsx
<hr className="my-3 border-border/50" />
```

### Step 4: Update InlineCitationChip badge

In `InlineCitationChip.tsx` at line 104-108, change mobile badge styling:

**Current:**
```tsx
<Badge
  className="ml-1 rounded-full text-xs font-medium cursor-pointer"
  variant="secondary"
>
```

**Change to:**
```tsx
<Badge
  className="ml-1 rounded-badge text-xs font-mono font-medium cursor-pointer"
  variant="secondary"
>
```

**Why:** `rounded-badge` = 6px (status tag/citation chip). `font-mono` enforces Geist Mono for citation numbers per spec.

### Step 5: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes — only typography/radius adjustments.

### Step 6: Commit

```bash
git add src/components/chat/MarkdownRenderer.tsx src/components/chat/InlineCitationChip.tsx
git commit -m "feat(chat): apply Mechanical Grace typography to MarkdownRenderer and citation chip

- Headings: add tracking-tight for industrial feel
- Inline code: rounded-badge (6px)
- Code block: rounded-action
- Blockquote: explicit border-border
- HR: border-border/50
- Citation chip: rounded-badge + font-mono"
```

---

## Task 3: ChatInput & FileUploadButton — Input Re-tooling

**Justification:** Spec Step 3 — "Clean thick borders from ChatInput. Placeholder text MANDATORY Geist Mono. Send button rounded-action with hover-slash."

**Files:**
- Modify: `src/components/chat/ChatInput.tsx`
- Modify: `src/components/chat/FileUploadButton.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch.

### Step 1: Update ChatInput container

At line 39, change container background and border:

**Current:**
```tsx
<div className="py-4 px-5 border-t bg-chat-input">
```

**Change to:**
```tsx
<div className="py-4 px-5 border-t border-border/50 bg-background">
```

**Why:** Replace legacy `bg-chat-input` with standard `bg-background`. Add explicit `border-border/50` for hairline consistency.

### Step 2: Update file attachment chips

At line 43, change the file attachment badge:

**Current:**
```tsx
<div key={id} className="flex items-center gap-2 bg-muted p-2 rounded text-xs text-muted-foreground whitespace-nowrap">
```

**Change to:**
```tsx
<div key={id} className="flex items-center gap-2 bg-muted p-2 rounded-badge text-xs font-mono text-muted-foreground whitespace-nowrap">
```

### Step 3: Update textarea styling

At line 63, update textarea classes:

**Current:**
```tsx
className="w-full border border-border rounded-lg p-3 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[88px] text-sm leading-relaxed"
```

**Change to:**
```tsx
className="w-full border border-border/50 rounded-shell p-3 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[88px] text-sm leading-relaxed"
```

**Why:** `rounded-shell` (16px) for the main input container — it's a premium input shell. `border-border/50` for subtle hairline.

### Step 4: Update placeholder to Geist Mono

At line 67, add `font-mono` class to placeholder text. Since Tailwind applies placeholder font via the `placeholder:` modifier, and the placeholder text is in the HTML attribute, we need to add `placeholder:font-mono` to the textarea class:

**Update line 63 textarea (add `placeholder:font-mono` to the className):**
```tsx
className="w-full border border-border/50 rounded-shell p-3 resize-none bg-background focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-amber-500 min-h-[88px] text-sm leading-relaxed placeholder:font-mono placeholder:text-sm"
```

### Step 5: Update send button

At line 78, change send button styling:

**Current:**
```tsx
className="w-10 h-10 flex items-center justify-center rounded-lg bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-3"
```

**Change to:**
```tsx
className="w-10 h-10 flex items-center justify-center rounded-action hover-slash bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground transition-colors disabled:opacity-30 disabled:cursor-not-allowed mt-3"
```

**Why:** `rounded-action` for action button. `hover-slash` adds diagonal stripes on hover (premium/command pattern per spec). The `hover-slash` class already has `position: relative` defined in globals.css.

### Step 6: Update FileUploadButton

In `FileUploadButton.tsx` at line 117, change button radius:

**Current:**
```tsx
className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
```

**Change to:**
```tsx
className="p-2 rounded-action text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-50"
```

### Step 7: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes.

### Step 8: Commit

```bash
git add src/components/chat/ChatInput.tsx src/components/chat/FileUploadButton.tsx
git commit -m "feat(chat): apply Mechanical Grace input styling to ChatInput and FileUploadButton

- Container: bg-background replaces legacy bg-chat-input, border-border/50
- Textarea: rounded-shell (16px premium input), placeholder:font-mono
- File chips: rounded-badge + font-mono
- Send button: rounded-action + hover-slash diagonal stripes
- FileUploadButton: rounded-action"
```

---

## Task 4: QuickActions — Action Button Polish

**Justification:** Spec Step 4 — "Copy/edit/retry buttons use rounded-action. Icons use Iconoir 1.5px stroke."

**Files:**
- Modify: `src/components/chat/QuickActions.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch.

### Step 1: Update copy button radius

At line 37, change `rounded-md` to `rounded-action`:

**Current:**
```tsx
className={`flex items-center gap-1 text-[10px] font-mono transition-colors p-1.5 rounded-md hover:bg-muted ${
    isCopied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
}`}
```

**Change to (also convert string template to cn() for consistency):**
```tsx
import { cn } from "@/lib/utils"
```

Then replace the className:
```tsx
className={cn(
    "flex items-center gap-1 text-[10px] font-mono transition-colors p-1.5 rounded-action hover:bg-muted",
    isCopied ? "text-emerald-500" : "text-muted-foreground hover:text-foreground"
)}
```

**Note:** QuickActions does NOT currently import `cn`. Add the import at the top.

### Step 2: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes.

### Step 3: Commit

```bash
git add src/components/chat/QuickActions.tsx
git commit -m "feat(chat): apply Mechanical Grace rounded-action to QuickActions button

- Copy button: rounded-action, refactor to cn() utility
- Add cn import from @/lib/utils"
```

---

## Task 5: ChatWindow & TemplateGrid — Landing Page & Card Polish

**Justification:** Landing page feature cards and template cards use generic `rounded-lg` and hardcoded slate borders. Align to Mechanical Grace radius and border tokens.

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/messages/TemplateGrid.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch. **Do NOT change any hooks, state logic, mutations, router logic, Virtuoso config, or paper/artifact handlers.**

### Step 1: Update ChatWindow landing page icon container

At line 414, change:
```tsx
<div className="mx-auto w-16 h-16 rounded-2xl bg-sky-500/10 flex items-center justify-center">
```
to:
```tsx
<div className="mx-auto w-16 h-16 rounded-shell bg-sky-500/10 flex items-center justify-center">
```

### Step 2: Update ChatWindow feature cards

At line 429, change:
```tsx
<div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
```
to:
```tsx
<div className="flex items-start gap-3 p-3 rounded-action bg-slate-800/50 border border-border/50">
```

At line 436, change (second feature card):
```tsx
<div className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
```
to:
```tsx
<div className="flex items-start gap-3 p-3 rounded-action bg-slate-800/50 border border-border/50">
```

### Step 3: Update ChatWindow loading skeletons

At lines 505-509, change all `rounded-lg` to `rounded-action`:
```tsx
<Skeleton className="h-12 w-[60%] rounded-action" />
```
(Apply to all 3 skeleton elements on lines 505, 508, 511.)

### Step 4: Update ChatWindow error overlay

At line 584, change:
```tsx
<div className="absolute bottom-4 left-6 right-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-lg flex items-center justify-between text-sm shadow-sm backdrop-blur-sm">
```
to:
```tsx
<div className="absolute bottom-4 left-6 right-6 bg-rose-500/10 border border-rose-500/30 text-rose-400 p-3 rounded-action flex items-center justify-between text-sm shadow-sm backdrop-blur-sm">
```

### Step 5: Update ChatWindow mobile header borders

At lines 402, 465, 487 — change all `border-slate-800` to `border-border/50`:
```tsx
border-b border-border/50
```

### Step 6: Update TemplateGrid card

In `TemplateGrid.tsx` at line 116, change:
```tsx
"rounded-lg border border-slate-800 bg-slate-900/50",
```
to:
```tsx
"rounded-action border border-border/50 bg-slate-900/50",
```

### Step 7: Update TemplateGrid icon box

At line 124, change:
```tsx
"flex-shrink-0 w-10 h-10 rounded-lg",
```
to:
```tsx
"flex-shrink-0 w-10 h-10 rounded-action",
```

### Step 8: Update TemplateGrid badge

At line 143, change generic `rounded` to `rounded-badge`:
```tsx
"inline-block px-2 py-0.5 rounded-badge",
```

### Step 9: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes — only styling.

### Step 10: Commit

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/messages/TemplateGrid.tsx
git commit -m "feat(chat): apply Mechanical Grace radius and borders to ChatWindow and TemplateGrid

- Landing icon: rounded-shell (16px)
- Feature cards: rounded-action, border-border/50
- Skeletons: rounded-action
- Error overlay: rounded-action
- Mobile headers: border-border/50
- Template cards: rounded-action, border-border/50
- Template icon box: rounded-action
- Template badge: rounded-badge (6px)"
```

---

## Task 6: ThinkingIndicator & SearchStatusIndicator — Status Indicator Polish

**Justification:** Status indicators use generic rounded values. Align to Mechanical Grace tokens for consistency with the rest of Phase 2.

**Files:**
- Modify: `src/components/chat/ThinkingIndicator.tsx`
- Modify: `src/components/chat/SearchStatusIndicator.tsx`

**MANDATORY / Constraints:** FRONTEND ONLY. No backend changes. No artifact/paper/LLM/search logic changes. Commit only on feature branch.

### Step 1: Update ThinkingIndicator

At line 18, change:
```tsx
"bg-slate-900/80 border border-slate-700 rounded-lg",
```
to:
```tsx
"bg-slate-900/80 border border-border/50 rounded-action",
```

### Step 2: Update SearchStatusIndicator

At line 33, change:
```tsx
"flex items-center gap-2.5 px-3 py-2 rounded-md",
```
to:
```tsx
"flex items-center gap-2.5 px-3 py-2 rounded-badge",
```

**Why:** `rounded-badge` (6px) for status tag indicators — they are status signals, not action buttons.

### Step 3: Verify

```bash
npx tsc --noEmit && npm run build && npm run lint
```

Expected: All pass. No functional changes.

### Step 4: Commit

```bash
git add src/components/chat/ThinkingIndicator.tsx src/components/chat/SearchStatusIndicator.tsx
git commit -m "feat(chat): apply Mechanical Grace tokens to ThinkingIndicator and SearchStatusIndicator

- ThinkingIndicator: rounded-action, border-border/50
- SearchStatusIndicator: rounded-badge (6px status tag)"
```

---

## Verification Checklist (Post-Implementation)

After all 6 tasks complete, run the full verification:

- [ ] **Bubble Audit**: User message uses `rounded-shell` (16px), Assistant has no border (narrative style)
- [ ] **Typo Audit**: Headings have `tracking-tight`, code uses `font-mono`, citation chip uses `font-mono`
- [ ] **Color Audit**: Legacy `bg-user-message-bg` completely removed from MessageBubble. Legacy `bg-chat-input` completely removed from ChatInput.
- [ ] **Radius Audit**: No generic `rounded-lg` or `rounded-md` remaining in modified files — all use semantic tokens (`rounded-shell`, `rounded-action`, `rounded-badge`)
- [ ] **Border Audit**: No hardcoded `border-slate-800` or `border-slate-700` remaining in modified files — all use `border-border/50`
- [ ] **Interaction Audit**: Send button has `hover-slash` diagonal stripes on hover
- [ ] **Build**: `npx tsc --noEmit && npm run build && npm run lint` all pass
