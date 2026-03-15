# Handoff: Chat Visual Rendering & Message Display

Dokumen konteks untuk tugas merapikan markdown renderer, tampilan visual chat window, response bubble, thinking expression, dan peningkatan UI lain di area chat.

## Scope Area

Semua komponen yang terlibat dalam **rendering pesan dan respons** di `/chat/*`:

- Markdown renderer
- Message bubble (user dan assistant)
- Thinking/reasoning display
- Process status bar
- Citation dan source display
- Artifact indicator
- Search dan tool state indicator

## Komponen Utama dan State Saat Ini

### 1. ChatWindow.tsx

**Path:** `src/components/chat/ChatWindow.tsx`

- Container utama chat dengan virtualized message list (`react-virtuoso`)
- Menggunakan AI SDK v5 (`useChat` dari `@ai-sdk/react` + `DefaultChatTransport`)
- Menampilkan `TemplateGrid` untuk empty state
- Menampilkan `ChatProcessStatusBar` saat AI memproses
- Menampilkan `PaperValidationPanel` untuk paper workflow
- Quota enforcement via `checkQuotaBeforeOperation()`
- File attachment dan artifact signal management

### 2. MessageBubble.tsx

**Path:** `src/components/chat/MessageBubble.tsx`

Layout pesan:

- **User message**: aligned right, bubble style, `rounded-shell`, background `--chat-muted`/`--chat-card`, padding `px-4 py-3`
- **Assistant message**: full width, tanpa bubble, `--chat-foreground` text, padding `py-1`

Fitur:

- Inline markdown rendering via `MarkdownRenderer`
- Internal thought display via `splitInternalThought()` — bordered block dengan muted foreground
- Process indicators (tools, web search, errors) di slot terpisah
- Artifact signals dengan visual badges (created/updated states)
- Sources indicator dengan collapsible list
- Quick actions menu
- File attachment chips (icon + size)
- Paper mode UI (approval/revision status)
- Auto-user action parsing (`[Approved: ...]` dan `[Revisi untuk ...]`)
- Edit functionality dengan permission checks

### 3. MarkdownRenderer.tsx

**Path:** `src/components/chat/MarkdownRenderer.tsx`

- **Custom parser** — bukan pakai `marked.js` atau `react-markdown`
- Parsing markdown plain text secara rekursif

Block types yang didukung:

| Block | Styling |
|-------|---------|
| Heading h1–h6 | Progressive size, h1 `text-2xl`, h2 `mt-10 border-t`, h3 `text-lg`, semua `tracking-tight` |
| Paragraph | `leading-relaxed text-sm` |
| Unordered list | `list-disc pl-6 mb-3 space-y-1` |
| Ordered list | Grid layout dengan number column (2rem width) |
| Outline | Smart numbered heading grouping |
| Table | Bordered, header row background, overflow responsive |
| Code block | Dark background `--chat-background`, deteksi Mermaid |
| Blockquote | Left border + nested rendering |
| Horizontal rule | Simple divider |

Inline formatting:

- Bold `**`, italic `*`/`_`, backtick code, link `[text](url)`
- Citation markers `[1]`, `[1,2,3]` → `InlineCitationChip`
- URL autolink detection
- Mermaid diagram support (dynamic import)

Context mode: `"chat"` vs `"artifact"` — mempengaruhi rendering behavior

Word wrapping: `[overflow-wrap:anywhere] break-words`

### 4. ChatProcessStatusBar.tsx

**Path:** `src/components/chat/ChatProcessStatusBar.tsx`

- Status bar AI processing dengan progress bar dan reasoning headline
- Dua mode: processing (headline + progress bar) vs completed (duration display)
- Narrative headline dari reasoning steps (running/error/last step)
- Progress bar: Teal (`--chat-success`) dengan shimmer animation
- Thinking dots animation (3-dot cascade `.animate-chat-thought-dot`)
- Clickable → buka `ReasoningActivityPanel`
- Typography: `font-mono text-[11px]` dengan 92% opacity
- Padding respects `--chat-input-pad-x` CSS variable (5rem default)

### 5. ReasoningTracePanel.tsx

**Path:** `src/components/chat/ReasoningTracePanel.tsx`

- Timeline visualization reasoning steps AI
- Step states: `pending | running | done | skipped | error`
- Transparent mode detection (detail thoughts kalau non-template labels)
- Visual: dot + vertical line connector pattern
- Dot colors: `bg-foreground/80` (done), `bg-foreground` (running), `bg-destructive` (error), `bg-muted-foreground/60` (pending)
- Text: `text-sm font-medium` step label, `text-xs text-muted-foreground` detail
- **Menggunakan global Tailwind tokens** (bukan `--chat-*`) karena render di Sheet Portal

### 6. ReasoningActivityPanel.tsx

**Path:** `src/components/chat/ReasoningActivityPanel.tsx`

- Modal Sheet wrapper untuk ReasoningTracePanel
- Responsive: bottom sheet (mobile), right drawer (desktop `w-[420px]`)
- **Menggunakan global tokens** (`bg-background text-foreground`) karena Sheet Portal isolation

### 7. InlineCitationChip.tsx

**Path:** `src/components/chat/InlineCitationChip.tsx`

- Inline citation indicator: hostname + count badge
- Carousel untuk browse multiple sources
- Mobile: Sheet modal, Desktop: Hover card
- Trigger: `text-[11px] text-[var(--chat-info)] underline-offset-2 hover:underline`
- Dark mode: `dark:text-[oklch(0.746_0.16_232.661)]` (sky color hardcoded)

### 8. SourcesIndicator.tsx

**Path:** `src/components/chat/SourcesIndicator.tsx`

- Collapsible sources list di bawah message
- Tampilkan 5 pertama, "+ remaining" untuk expand
- Source item: clickable link dengan title + URL
- URL styling: `font-mono text-[11px] text-[var(--chat-info)]`

### 9. ArtifactIndicator.tsx

**Path:** `src/components/chat/ArtifactIndicator.tsx`

- Button clickable untuk buka artifact di side panel
- Status badges: "Artifak" (base), "Revisi" (updated), version number
- Styling: `rounded-lg border px-3 py-2.5`, badge `text-[10px] font-mono font-semibold uppercase tracking-wide`

### 10. SearchStatusIndicator.tsx dan ToolStateIndicator.tsx

**Path:** `src/components/chat/SearchStatusIndicator.tsx`, `src/components/chat/ToolStateIndicator.tsx`

- Display status web search dan tool execution
- Typography: `text-[11px] font-mono tracking-wide` (uppercase signal style)
- Custom shimmer text animation `.chat-search-shimmer`
- Error: `text-[var(--chat-destructive)]`

### 11. Inline Citation (ai-elements)

**Path:** `src/components/ai-elements/inline-citation.tsx`

- Komponen primitif untuk citation: `InlineCitation`, `InlineCitationCard`, `InlineCitationCarousel`, `InlineCitationSource`, dll
- Carousel header: `.bg-secondary p-2`
- **Menggunakan global tokens** (bukan `--chat-*`)

## Sistem Styling Chat

### CSS Variable Scope

Semua chat components scoped ke `[data-chat-scope]`:

```
--chat-background         (surface)
--chat-foreground         (text)
--chat-card               (message bubble background)
--chat-card-foreground    (text on card)
--chat-muted              (disabled/secondary surface)
--chat-muted-foreground   (secondary text)
--chat-accent             (hover/focus state)
--chat-border             (dividers/borders)
--chat-input              (input fields)
--chat-info               (Sky — links, citations, AI identity)
--chat-success            (Teal — progress bar)
--chat-destructive        (Rose — errors)
```

### Pengecualian Scope

Komponen yang render di **Sheet/Modal Portal** menggunakan **global tokens** (bukan `--chat-*`):

- `ReasoningTracePanel` → `bg-foreground`, `text-muted-foreground`
- `ReasoningActivityPanel` → `bg-background`, `text-foreground`
- `InlineCitation` (ai-elements) → `bg-secondary`, `text-muted-foreground`

### Typography di Chat

| Konteks | Font | Style |
|---------|------|-------|
| Body text | Geist Sans | `text-sm` (14px), Regular 400 |
| Headings | Geist Sans | `tracking-tight`, progressive sizing |
| Labels/data | Geist Mono | `font-mono` |
| Signal/badge | Geist Mono | Bold, Uppercase, `tracking-widest` |
| Status indicator | Geist Mono | `text-[11px] font-mono tracking-wide` |
| Table header | Geist Mono | `text-[10px] font-bold uppercase` |

### Border & Shape

| Level | Class | Usage |
|-------|-------|-------|
| Shell | `rounded-shell` (16px) | User message bubble |
| Action | `rounded-action` (8px) | Buttons, inputs |
| Badge | `rounded-badge` (6px) | Status tags |
| Core | `rounded-none` (0px) | Data grids |

### Animation

| Efek | Durasi | Penggunaan |
|------|--------|------------|
| Shimmer text | Custom keyframe | Search/tool status |
| Progress fill | Transition | ChatProcessStatusBar |
| Thinking dots | Cascade `.animate-chat-thought-dot` | Processing state |
| Hover/transition | 150ms | Buttons, links |

## File Reference

| Komponen | Path |
|----------|------|
| ChatWindow | `src/components/chat/ChatWindow.tsx` |
| MessageBubble | `src/components/chat/MessageBubble.tsx` |
| MarkdownRenderer | `src/components/chat/MarkdownRenderer.tsx` |
| ReasoningTracePanel | `src/components/chat/ReasoningTracePanel.tsx` |
| ReasoningActivityPanel | `src/components/chat/ReasoningActivityPanel.tsx` |
| ChatProcessStatusBar | `src/components/chat/ChatProcessStatusBar.tsx` |
| SearchStatusIndicator | `src/components/chat/SearchStatusIndicator.tsx` |
| ToolStateIndicator | `src/components/chat/ToolStateIndicator.tsx` |
| InlineCitationChip | `src/components/chat/InlineCitationChip.tsx` |
| SourcesIndicator | `src/components/chat/SourcesIndicator.tsx` |
| ArtifactIndicator | `src/components/chat/ArtifactIndicator.tsx` |
| InlineCitation primitives | `src/components/ai-elements/inline-citation.tsx` |
| CSS tokens | `src/app/globals.css` + `src/app/globals-new.css` |

## Pola Desain yang Berlaku

1. **Scope isolation**: Chat pakai `[data-chat-scope]` + `--chat-*`. Modal/Sheet pakai global tokens karena Portal DOM.
2. **Custom markdown parser**: Bukan library eksternal — kontrol penuh atas rendering dan embedding citation.
3. **Bubble asymmetry**: User = bubble kanan, assistant = full width tanpa bubble.
4. **Process indication**: Tool/search/error di slot terpisah supaya tidak geser layout saat streaming.
5. **Citation flow**: Text → marker `[1]` → `InlineCitationChip` hover-card (desktop) / Sheet modal (mobile).
6. **Reasoning transparency**: Thinking ditampilkan progresif di status bar, expandable ke detail panel.
