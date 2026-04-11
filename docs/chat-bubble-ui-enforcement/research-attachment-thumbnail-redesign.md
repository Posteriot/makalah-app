# Research — Attachment Chip → Thumbnail Card Redesign

**Date:** 2026-04-11
**Author:** Claude (investigation phase)
**Status:** Research complete, awaiting approval before implementation

## 1. Goal (User Requirement)

Ubah rendering attachment di chat bubble dari **chip/pill kecil** menjadi **thumbnail card** dengan struktur: kotak preview (kiri) + nama file (tengah) + media type/MIME (tengah bawah). Contoh target: `screenshots/Screen Shot 2026-04-11 at 16.47.28.png`.

Scope file type yang didukung aplikasi ini:
- `.txt` (text/plain)
- `.pdf` (application/pdf)
- `.docx` (application/vnd.openxmlformats-officedocument.wordprocessingml.document)
- `.xlsx` (application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
- `.pptx` (application/vnd.openxmlformats-officedocument.presentationml.presentation)

Plus image types (`.jpg`, `.png`, dst) yang sudah di-handle via inline image path — tapi target visual card mungkin juga applicable ke image files untuk konsistensi.

## 2. Visual Target Analysis

### 2.1 Current state (chip/pill)
Screenshot: `screenshots/Screen Shot 2026-04-11 at 02.19.26.png`
- Inline-flex pill, height ~26px
- Struktur: `<Page icon (12px)> <filename> <extension> <size (muted)>`
- Class: `rounded-badge border border-[chat-info] bg-[chat-accent] text-xs font-mono text-[chat-info]`
- Tidak ada preview thumbnail, tidak ada MIME display

### 2.2 Target state (thumbnail card)
Screenshot: `screenshots/Screen Shot 2026-04-11 at 16.47.28.png`
- Row-based card, height ~64-72px, full-width (atau max-width yang proporsional)
- Struktur kiri→kanan:
  - **Thumbnail square** (~48x48px) — untuk image: preview gambar asli; untuk non-image: icon besar di atas background abu-abu gelap
  - **Info column** — filename (text-base/text-lg, bold) di atas, MIME type (text-xs, muted) di bawah
  - **Remove button** (X) di paling kanan — **catatan**: di screenshot ini muncul karena konteks upload preview. Untuk sent message bubble, X tidak boleh ada karena file sudah ke-kirim.
- Background: card dengan rounded-lg, subtle border

## 3. AI SDK Elements — Reference Implementation Analysis

**Source:** `https://elements.ai-sdk.dev/components/attachments` + verbatim source dari `github.com/vercel/ai-elements/blob/main/packages/elements/src/attachments.tsx` (426 lines).

### 3.1 Component Anatomy

AI SDK Elements menyediakan compound component pattern:

```
<Attachments variant="list">               // container
  <Attachment data={file} onRemove={...}>  // per-item wrapper (dengan context)
    <AttachmentPreview />                  // kotak thumbnail kiri
    <AttachmentInfo showMediaType />       // nama + MIME type
    <AttachmentRemove />                   // tombol X
  </Attachment>
</Attachments>
```

### 3.2 Three Variants

Variant | Layout | Use case
---|---|---
`grid` | 96x96 square tile | Gallery-like display
`inline` | 32px compact pill | Like our current chip (!)
`list` | Full-width row with 48x48 preview + info + remove | **This is what user wants**

### 3.3 `list` Variant Key Styling (verbatim dari source)

```tsx
// Wrapper (Attachment component, list variant)
variant === "list" && [
  "flex w-full items-center gap-3 rounded-lg border p-3",
  "hover:bg-accent/50",
]

// Preview box (AttachmentPreview, list variant)
"flex shrink-0 items-center justify-center overflow-hidden",
variant === "list" && "size-12 rounded bg-muted"
// size-12 = 48x48px, rounded-sm, bg-muted background

// Info column (AttachmentInfo)
"min-w-0 flex-1"
// filename:
"block truncate"
// MIME type (showMediaType=true):
"block truncate text-muted-foreground text-xs"

// Remove button (AttachmentRemove, list variant)
variant === "list" && ["size-8 shrink-0 rounded p-0", "[&>svg]:size-4"]
```

### 3.4 Media Category Detection

```tsx
export const getMediaCategory = (data): AttachmentMediaCategory => {
  if (data.type === "source-document") return "source";
  const mediaType = data.mediaType ?? "";
  if (mediaType.startsWith("image/")) return "image";
  if (mediaType.startsWith("video/")) return "video";
  if (mediaType.startsWith("audio/")) return "audio";
  if (mediaType.startsWith("application/") || mediaType.startsWith("text/")) return "document";
  return "unknown";
};
```

### 3.5 Icon System (Limitation!)

```tsx
const mediaCategoryIcons: Record<AttachmentMediaCategory, typeof ImageIcon> = {
  audio: Music2Icon,
  document: FileTextIcon,   // ← ALL pdf/docx/xlsx/pptx/txt pakai icon yg sama
  image: ImageIcon,
  source: GlobeIcon,
  unknown: PaperclipIcon,
  video: VideoIcon,
};
```

**PENTING:** AI SDK Elements TIDAK membedakan icon per-extension. PDF, DOCX, XLSX, PPTX, TXT — semua dapat `FileTextIcon` yang sama. Kalau user mau PDF beda dari DOCX (seperti Google Drive / Dropbox style), harus bikin icon mapping sendiri di atas AI SDK Elements atau bikin custom.

### 3.6 Image Preview Logic

```tsx
if (mediaCategory === "image" && data.type === "file" && data.url) {
  return renderAttachmentImage(data.url, data.filename, variant === "grid");
}
// else: icon fallback
```

Image preview cuma bisa kalau `data.url` tersedia di `FileUIPart`. Untuk sent message bubble di codebase kita, image URL tersedia via `part.type === "file"` + `mediaType.startsWith("image/")` path (MessageBubble.tsx:1110-1133). Tapi untuk non-image files, kita tidak punya preview URL — cuma ada filename + size + MIME.

### 3.7 Dependencies Required

Kalau install AI SDK Elements apa adanya, butuh:
- `lucide-react` (icon library) — **BELUM ADA** di project
- `@radix-ui/react-hover-card` — **BELUM ADA** di project (project punya `@radix-ui/react-dialog`, `react-dropdown-menu`, `react-tooltip`, dsb, tapi tidak hover-card)
- `@repo/shadcn-ui/components/ui/button` + `...hover-card` — **BELUM ADA** (project pakai custom styling, bukan shadcn/ui components in that directory)
- `FileUIPart` / `SourceDocumentUIPart` dari `ai` package — **CHECK**: perlu verifikasi apakah `ai` package tersedia di project

## 4. Current Codebase Analysis

### 4.1 Two Call Sites for Chip Rendering

**(1) MessageBubble.tsx:1078-1107** — Sent message bubble
```tsx
{shouldRenderAttachmentChips && (
    <div className="mt-0.5 mb-3 flex flex-wrap gap-1.5">
        {fileIds.map((fid, idx) => {
            const fileMeta = fileMetaMap?.get(fid)
            const name = fileNames[idx] || fileMeta?.name || ...
            const size = fileSizes[idx] ?? fileMeta?.size ?? null
            const fileType = fileTypes[idx] || fileMeta?.type || ""
            const isImage = isImageType(fileType) || /\.(jpg|jpeg|png|gif|webp)$/i.test(name)
            const { baseName, extension } = splitFileName(name)
            return (
                <span key={fid} className="inline-flex min-w-0 max-w-full items-center gap-1.5 rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-accent)] py-1 pl-2.5 pr-1.5 text-xs font-mono text-[var(--chat-info)]" title={name}>
                    {isImage ? <MediaImage className="h-3 w-3 shrink-0" /> : <Page className="h-3 w-3 shrink-0" />}
                    <span className="inline-flex min-w-0 items-baseline">
                        <span className="max-w-[180px] truncate">{baseName}</span>
                        {extension && <span className="shrink-0">{extension}</span>}
                    </span>
                    {size !== null && <span className="shrink-0 text-[10px] opacity-60">{formatFileSize(size)}</span>}
                </span>
            )
        })}
    </div>
)}
```

**(2) ChatInput.tsx:149-188** — Upload preview (before send, WITH remove button)
```tsx
const renderContextFileChips = () => {
    if (!hasContextFiles) return null
    return displayedContextFiles.map((file) => {
        const { baseName, extension } = splitFileName(file.name)
        return (
            <div key={file.fileId} className="inline-flex min-w-0 max-w-full items-center gap-1.5 whitespace-nowrap rounded-badge border border-[color:var(--chat-info)] bg-[var(--chat-accent)] py-1 pl-2.5 pr-1.5 text-xs font-mono text-[var(--chat-info)]" title={file.name}>
                {isImageType(file.type) ? <MediaImage className="h-3 w-3 shrink-0" /> : <Page className="h-3 w-3 shrink-0" />}
                <span className="inline-flex min-w-0 items-baseline">
                    <span className="max-w-[120px] truncate">{baseName}</span>
                    {extension && <span className="shrink-0">{extension}</span>}
                </span>
                <span className="shrink-0 text-[10px] opacity-60">{formatFileSize(file.size)}</span>
                <button type="button" onClick={() => {...}} className="ml-0.5 rounded p-0.5 transition-colors hover:bg-[color:var(--chat-info)]/15" aria-label={...}>
                    <Xmark className="h-3 w-3" />
                </button>
            </div>
        )
    })
}
```

**Observasi:**
- Struktur dan styling identik di 2 tempat (duplikasi)
- Keduanya pakai iconoir-react `Page` + `MediaImage`
- Utility yang dipakai: `splitFileName`, `formatFileSize`, `isImageType` dari `@/lib/types/attached-file`
- Chat input version punya tombol `Xmark` remove (karena pre-send), bubble tidak

### 4.2 Icon Libraries Available

Dari `package.json`:
- **`iconoir-react` ^7.11.0** (sole icon library, digunakan di seluruh chat components)
- **TIDAK ADA** lucide-react, react-file-icon, heroicons, phosphor-icons

Icons yang sudah diimport ke MessageBubble/ChatInput: `Send, Page, Expand, Xmark, MediaImage, Trash, EditPencil, Copy, Check, CheckCircle, ...`

### 4.3 Available Data for Sent Attachments

Dari `MessageBubble.tsx`:
- `fileIds: string[]`
- `fileNames: string[]`
- `fileSizes: number[]` (bytes)
- `fileTypes: string[]` (MIME)
- `fileMetaMap: Map<string, { name, size, type }>`
- `message.parts[]` — untuk image files, punya `url` langsung

**Key constraint:** Non-image files (PDF/DOCX/XLSX/PPTX/TXT) tidak punya URL preview di metadata — cuma filename + size + MIME. Tidak ada server-side thumbnail generation untuk PDF pages, Word docs, dsb.

### 4.4 Theme Variables Used

Project pakai CSS variables untuk theming chat, bukan Tailwind's default `muted`/`accent`. Existing vars di chat scope:
- `--chat-background`
- `--chat-foreground`
- `--chat-muted`
- `--chat-muted-foreground`
- `--chat-accent`
- `--chat-border`
- `--chat-info` (currently used for chip color)
- `--chat-card` / `--chat-card-foreground`
- `--chat-secondary` / `--chat-secondary-foreground`
- `--chat-success`

Thumbnail card harus pakai var ini, bukan `bg-muted` / `bg-accent` default Tailwind.

## 5. Gap Analysis

Aspect | AI SDK Elements | Our Codebase | Gap
---|---|---|---
Icon library | `lucide-react` | `iconoir-react` | Need to map icons
Theme vars | `--muted`, `--accent`, `--border` | `--chat-muted`, `--chat-accent`, `--chat-border` | Need to remap className
Hover card dep | `@radix-ui/react-hover-card` | Not present | Skip hover card feature (not needed for list variant)
Per-extension icons | Single `FileTextIcon` for all | Single `Page` icon for all | **Same limitation. Both generic.**
Compound component pattern | Yes | No (inline markup × 2) | Refactor opportunity
TypeScript types | `FileUIPart` from `ai` | Ad-hoc `AttachedFileMeta` | Could type-align but not required
Image preview URL | `data.url` | `part.url` via different code path | Need to unify
Remove button policy | Optional via `onRemove` callback | Hardcoded in ChatInput, absent in MessageBubble | Props-driven approach fits

## 6. Per-Extension Icon Strategy (The Important Design Decision)

User explicitly listed `.txt .pdf .docx .xlsx .pptx` as file types. Gue tangkap ini sebagai sinyal bahwa **user kemungkinan mau distinct visual per file type**, bukan satu icon generic. Tapi ini asumsi yang perlu dikonfirmasi.

### 6.1 Option A — Single Generic "Page" icon (AI SDK Elements default)
- Semua document type pakai satu icon
- **Pros:** Simplest, least custom code, matches AI SDK reference exactly
- **Cons:** Tidak ada differentiation visual antar file type — user cuma bisa bedain dari extension di filename text

### 6.2 Option B — Iconoir-react category icons (different icon per category)
iconoir-react catalog untuk file type (hasil checking catalog):
- `Page` — generic document (udah ada)
- `Table2Columns` atau `ViewColumns` — untuk spreadsheet (.xlsx)
- `Presentation` — untuk slide (.pptx)
- `TextBox` atau `NoteText` — untuk text (.txt)
- PDF: no dedicated icon, pakai `Page` atau `EmptyPage`
- DOCX: no dedicated icon, pakai `Page` atau `PageEdit`

- **Pros:** Uses already-installed icon library, visual category differentiation
- **Cons:** Iconoir doesn't have PDF-specific icon, so PDF and DOCX would still share the same icon. Partial solution.

### 6.3 Option C — Custom colored SVG badges per extension (Dropbox/Google Drive style)
Bikin SVG badge component yang render kotak warna + text label di dalam:
- PDF → red background + "PDF" text
- DOCX → blue background + "DOC" text
- XLSX → green background + "XLS" text
- PPTX → orange background + "PPT" text
- TXT → gray background + "TXT" text

Pattern mirip `react-file-icon` atau Google Drive file thumbnails.

- **Pros:** Maximal visual differentiation, universally recognizable, doesn't require new icon lib, bisa custom warna sesuai theme
- **Cons:** Need custom component (50-100 lines), ada design decision (warna, font, border radius)

### 6.4 Option D — Install `react-file-icon`
```bash
npm install react-file-icon
```
Library yang memang dedicated untuk render colored file type icons (skeuomorphic folded-corner style).

- **Pros:** Battle-tested, 1k+ stars on GitHub, supports 20+ file extensions out of box, auto color mapping
- **Cons:** New dependency, skeuomorphic style mungkin tidak match desain flat/modern chat app (subjective)

### 6.5 Option E — Text-only label inside colored square
Simpler than Option C: cuma background warna + extension text (uppercase, bold) — no icon glyph.

Example:
```tsx
<div className="size-12 rounded flex items-center justify-center bg-red-500/20 text-red-400 font-mono font-bold text-xs">
  PDF
</div>
```

- **Pros:** Zero icon dependency, very clean, easy to theme, works for ANY file extension (just show the extension text)
- **Cons:** No graphical "file-ness" affordance (no folded corner, etc)

### 6.6 Recommendation: Option E (Text-only colored label)

Alasan:
1. **Zero dependency overhead** — tidak install library baru
2. **Theme-coherent** — bisa pakai `--chat-*` variables atau Tailwind color palette
3. **Future-proof** — kalau user upload `.csv` atau `.md` besok, tinggal fallback ke extension text, no new icon mapping needed
4. **Matches "badge" aesthetic** yang udah consistent di chat app (rounded-badge dipakai di banyak tempat)
5. **Simpler code** — no icon library mapping table, no SVG imports
6. **Font already loaded** — project pakai `font-mono` (Geist Mono) yang cocok buat label text seperti "PDF", "DOCX", dst

Alternative jika user reject Option E: gue recommend **Option C (custom colored SVG)** karena lebih bold visually dan tetap zero-dep.

## 7. Implementation Options

### 7.1 Option A — Install `ai-elements` Attachments component as-is

**Steps:**
1. `npx ai-elements@latest add attachments` (via CLI)
2. Install deps: `lucide-react`, `@radix-ui/react-hover-card`
3. Create `shadcn/ui` style button + hover-card if not present
4. Use `<Attachments variant="list">` in MessageBubble and ChatInput
5. Map chat theme vars via CSS override or edit the installed file

**Pros:**
- Battle-tested compound component pattern
- Future updates from upstream possible
- TypeScript types from `ai` package

**Cons:**
- Adds 2+ new dependencies
- Introduces second icon library (`lucide-react`) alongside existing `iconoir-react`
- Requires custom theme override (AI SDK uses shadcn/ui muted/accent vars, we use `--chat-*`)
- Still uses single `FileTextIcon` for all documents (same limitation as our current state)
- Brings `HoverCard` + related infrastructure we don't need for list variant
- Couples our implementation to AI SDK Elements API surface

**Verdict:** ❌ Overkill for our needs

### 7.2 Option B — Custom `MessageAttachment` component, AI SDK-inspired

Bikin satu custom component `src/components/chat/MessageAttachment.tsx` yang:
- Takes props: `{ fileId, name, size, mimeType, imageUrl?, onRemove? }`
- Render list-variant style card dengan:
  - Thumbnail square (kiri): if image → `<Image>`, else → colored label badge (Option E) dengan extension text
  - Info column (tengah): filename (truncate) + MIME type (muted, text-xs)
  - Remove button (kanan): only rendered if `onRemove` provided
- Uses `--chat-*` theme vars consistently
- Uses iconoir-react (existing) untuk X icon
- TypeScript interface co-located or in shared types

Consumers:
- `MessageBubble.tsx`: replace `<span className="rounded-badge ...">` inline markup with `<MessageAttachment ...>`
- `ChatInput.tsx`: replace `renderContextFileChips()` inline markup with `<MessageAttachment ... onRemove={...}>`

**Pros:**
- Single source of truth (no duplication)
- Full theme integration (no class overrides needed)
- Zero new dependencies
- Per-extension label via Option E (distinct PDF/DOCX/XLSX/PPTX)
- Props-driven remove button (same component, optional prop)
- Small, auditable codebase (~100-150 lines)
- Aligns with existing chat component style (functional component with className via cn)

**Cons:**
- Custom code to maintain (but really, this is just a small display component — low maintenance burden)
- No direct upstream alignment with AI SDK Elements (but we're free to change independently)

**Verdict:** ✅ **Recommended**

### 7.3 Option C — Hybrid: start from AI SDK source, heavily adapt

Ambil `attachments.tsx` source dari AI SDK repo, strip down ke `list` variant only, replace `lucide-react` dengan `iconoir-react`, replace theme vars, drop `HoverCard` / `grid` / `inline` variants yang tidak dipakai. Essentially = Option B but derived-from instead of from-scratch.

**Pros:**
- Retains compound component pattern (Attachments/Attachment/AttachmentPreview/AttachmentInfo/AttachmentRemove)
- More flexible API for future compositional needs

**Cons:**
- Compound pattern is overkill for 1 usage shape (list variant with preview + info + maybe remove)
- More code (context providers, multiple sub-components) for no additional functionality we need right now
- YAGNI — we don't need grid/inline/hover card

**Verdict:** ⚠️ More code for same result as Option B

## 8. Recommended Implementation Plan (If Option B + E Approved)

### 8.1 New File: `src/components/chat/MessageAttachment.tsx` (~120 lines)

**Props interface:**
```ts
interface MessageAttachmentProps {
  fileId: string
  name: string
  size: number | null
  mimeType: string
  imageUrl?: string        // for image files, if URL available
  onRemove?: () => void    // optional; if provided, renders X button
  className?: string
}
```

**Internal structure:**
```tsx
<div className="flex w-full items-center gap-3 rounded-lg border border-[color:var(--chat-border)] bg-[var(--chat-card)] p-3 transition-colors">
  {/* Preview square */}
  <div className="size-12 shrink-0 overflow-hidden rounded-action ...">
    {isImage && imageUrl ? (
      <Image src={imageUrl} ... className="size-full object-cover" />
    ) : (
      <ExtensionLabel extension={extension} mimeType={mimeType} />
    )}
  </div>

  {/* Info column */}
  <div className="min-w-0 flex-1">
    <div className="truncate text-sm font-medium text-[var(--chat-foreground)]">
      {name}
    </div>
    <div className="truncate text-xs text-[var(--chat-muted-foreground)]">
      {mimeType}
      {size !== null && ` · ${formatFileSize(size)}`}
    </div>
  </div>

  {/* Remove button (conditional) */}
  {onRemove && (
    <button onClick={onRemove} className="size-8 shrink-0 ..." aria-label="Hapus file">
      <Xmark className="h-4 w-4" />
    </button>
  )}
</div>
```

**ExtensionLabel sub-component (Option E):**
```tsx
const EXTENSION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  pdf:  { bg: "bg-red-500/15",    text: "text-red-400",    label: "PDF" },
  docx: { bg: "bg-blue-500/15",   text: "text-blue-400",   label: "DOC" },
  doc:  { bg: "bg-blue-500/15",   text: "text-blue-400",   label: "DOC" },
  xlsx: { bg: "bg-green-500/15",  text: "text-green-400",  label: "XLS" },
  xls:  { bg: "bg-green-500/15",  text: "text-green-400",  label: "XLS" },
  pptx: { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
  ppt:  { bg: "bg-orange-500/15", text: "text-orange-400", label: "PPT" },
  txt:  { bg: "bg-gray-500/15",   text: "text-gray-400",   label: "TXT" },
}

const ExtensionLabel = ({ extension }: { extension: string }) => {
  const ext = extension.toLowerCase().replace(/^\./, "")
  const style = EXTENSION_STYLES[ext] ?? {
    bg: "bg-[color:var(--chat-muted)]",
    text: "text-[color:var(--chat-muted-foreground)]",
    label: ext.toUpperCase().slice(0, 4) || "FILE",
  }
  return (
    <div className={cn("flex size-full items-center justify-center rounded-action font-mono text-[11px] font-bold", style.bg, style.text)}>
      {style.label}
    </div>
  )
}
```

Color palette rationale: warna mirror convention industri (PDF=red, Word=blue, Excel=green, PPT=orange, TXT=gray) — user bisa kenali secara instan.

### 8.2 Refactor `MessageBubble.tsx`

Replace lines 1078-1108:
```tsx
{shouldRenderAttachmentChips && (
  <div className="mt-0.5 mb-3 flex flex-col gap-2">
    {fileIds.map((fid, idx) => {
      const meta = fileMetaMap?.get(fid)
      const name = fileNames[idx] || meta?.name || fileNameMap?.get(fid) || "file"
      const size = typeof fileSizes[idx] === "number" && fileSizes[idx] > 0 ? fileSizes[idx] : (meta?.size ?? null)
      const mime = fileTypes[idx] || meta?.type || ""
      return (
        <MessageAttachment
          key={fid}
          fileId={fid}
          name={name}
          size={size}
          mimeType={mime}
          // no onRemove → no X button in sent bubble
        />
      )
    })}
  </div>
)}
```

Note: `flex-wrap gap-1.5` → `flex-col gap-2` karena list-variant stacks vertically, bukan inline-wrap.

### 8.3 Refactor `ChatInput.tsx`

Replace `renderContextFileChips` (lines 149-188):
```tsx
const renderContextFileChips = () => {
  if (!hasContextFiles) return null
  return displayedContextFiles.map((file) => (
    <MessageAttachment
      key={file.fileId}
      fileId={file.fileId}
      name={file.name}
      size={file.size}
      mimeType={file.type}
      onRemove={() => {
        if (onContextFileRemoved) {
          onContextFileRemoved(file.fileId)
          return
        }
        onFileRemoved(file.fileId)
      }}
    />
  ))
}
```

### 8.4 mt-0.5 Compensation — Still Needed?

Round 2 fix (mt-0.5 di chip wrapper) dibuat karena chip adalah rigid box yang tidak punya half-leading. Dengan thumbnail card, wrapper baru (`<div className="flex flex-col gap-2">`) juga rigid. **Fix mt-0.5 tetap relevan** dan harus dipertahankan.

Tapi: thumbnail card height > chip, jadi proporsi bubble bakal beda. Perlu visual verification via Playwright setelah implementation — mungkin mt-0.5 perlu di-tuning ulang karena half-leading effect relatively smaller dibanding 48px card.

## 9. Scope Boundaries (Non-Goals)

- **Tidak** melakukan backend changes (tidak generate PDF page thumbnails server-side)
- **Tidak** menambah upload mime type support baru (keep .txt/.pdf/.docx/.xlsx/.pptx)
- **Tidak** mengubah image inline rendering path (lines 1110-1133 in MessageBubble) karena itu sudah menampilkan real image preview
- **Tidak** melakukan mobile-specific optimization di phase ini (mobile review setelah base implementation working)

## 10. Open Questions for User

### Q1. Icon strategy — confirm Option E?
Gue recommend **Option E (text-only colored label: PDF/DOC/XLS/PPT/TXT dengan warna red/blue/green/orange/gray)**. Alternatifnya:
- Option A: single generic `Page` icon untuk semua (paling simple, paling bland)
- Option C: custom SVG per extension (lebih bold visual, lebih banyak code)
- Option D: install `react-file-icon` (skeuomorphic, new dep)

Lo setuju Option E, atau prefer alternatif lain?

### Q2. Apakah image files juga pakai thumbnail card?
Saat ini image files punya path terpisah (inline `<Image>` di MessageBubble:1110-1133, bukan via chip). Ada 2 pilihan:
- **A. Unify** — image files juga wrapped dalam thumbnail card, dengan image preview di square kiri (sama seperti target screenshot `mountain-landscape.jpg`). Konsisten visual.
- **B. Leave as-is** — image tetap inline, cuma non-image yang pakai thumbnail card. Less work.

Lo mau yang mana? Rekomendasi gue: **A (unify)** — konsisten dengan target screenshot dan cleaner mental model.

### Q3. Layout di upload preview (ChatInput)?
Saat ini upload preview chips di ChatInput render inline (`flex flex-wrap`). Dengan thumbnail card, chip jadi lebih gedhe — apakah mau:
- **A. Vertikal stack** (satu card per baris) — lebih clear readable
- **B. Horizontal scroll** (pakai overflow-x-auto) — keep compact footprint
- **C. Grid 2-kolom** — balance

Rekomendasi gue: **A (vertical stack)** karena thumbnail card memang didesain buat vertical layout.

### Q4. Remove button styling di ChatInput?
User saat ini pakai Xmark icon di pojok kanan chip untuk remove. Di card target screenshot, X button muncul sebagai standalone button bulat/square di ujung kanan. Konsisten pakai ghost-style X button seperti AI SDK Elements? Atau keep current styling?

Rekomendasi gue: ghost-style icon button `size-8 rounded` dengan hover bg = `var(--chat-accent)`.

### Q5. Scope file yang di-implement sekarang
User listed: `.txt .pdf .docx .xlsx .pptx`. Apakah gue juga add default fallback untuk file type lain (mis. `.zip`, `.csv`, `.md`) pakai "FILE" generic label, atau strict hanya 5 extension yang disebut?

Rekomendasi gue: **Add generic fallback** (show extension uppercase slice or "FILE") biar tidak blank kalau user upload file lain suatu saat.

### Q6. Commit after research, implement in follow-up?
Apakah lo mau:
- **A.** Review research doc dulu, lalu kasih approval untuk 6 pertanyaan di atas, baru gue implement
- **B.** Gue langsung lanjut implement dengan rekomendasi gue (E+A+A+ghost+fallback) tanpa review
- **C.** Gue bikin single proof-of-concept dulu (1 component + refactor MessageBubble only), lo lihat visual, lalu putusin lanjut ke ChatInput

Rekomendasi gue: **C** — biar lo bisa lihat visual sebelum commit ke full scope.

## 11. References

- **AI SDK Elements docs:** https://elements.ai-sdk.dev/components/attachments
- **AI SDK Elements source (verbatim):** `github.com/vercel/ai-elements/blob/main/packages/elements/src/attachments.tsx` (426 lines, fetched 2026-04-11, saved locally at `/tmp/ai-elements-attachments.tsx` for reference during implementation)
- **Our current chip implementation:**
  - `src/components/chat/MessageBubble.tsx:1078-1108`
  - `src/components/chat/ChatInput.tsx:149-188`
- **Existing utilities:** `src/lib/types/attached-file.ts` (`splitFileName`, `formatFileSize`, `isImageType`, `AttachedFileMeta` type)
- **Theme variables:** defined in global CSS as `--chat-*` custom properties
