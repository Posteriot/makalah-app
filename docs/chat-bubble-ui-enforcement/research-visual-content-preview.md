# Research — Visual Content Preview for Attachment Thumbnails

**Date:** 2026-04-11
**Author:** Claude (research phase, no implementation)
**Status:** Research complete, awaiting user validation on format + architecture direction

## 1. Context — User's Expanded Vision

Setelah PoC colored-text-label attachment card (`research-attachment-thumbnail-redesign.md` section 8, screenshot `poc-attachment-card-pdf.png` / user validation screenshot `Screen Shot 2026-04-11 at 17.25.13.png`), user ingin level-up menjadi **visual content preview**:

> "Jika dokumen menampilkan screenshot/gambar dari halaman pertama (jika multipages) atau menampilkan screenshots dari paragrafnya jika single page, dan thumbnail utuh gambar jika itu image attachment."

**Interpretasi gue (perlu konfirmasi):**
- **Image file** (`.jpg`, `.png`, dst) → thumbnail = gambar asli (scaled down)
- **Multi-page document** (PDF multi-page, DOCX multi-page, PPTX multi-slide, XLSX multi-sheet) → thumbnail = rendered image dari halaman pertama / slide pertama / sheet pertama
- **Single-page document** → thumbnail = "screenshots dari paragrafnya" (ambiguous — lihat §10)

**Konteks user:** Academic paper app (Makalah AI). File yang di-upload kemungkinan besar:
- PDF references (multi-page)
- DOCX drafts (multi-page)
- XLSX data tables (single/multi-sheet)
- PPTX slides (single/multi-slide)
- TXT notes (often short)
- Image scans/figures

## 2. Feasibility Matrix — "First Page as Image" per File Type

Legend:
- ✅ = Feasible with low complexity
- ⚠️ = Feasible with medium complexity or caveat
- ❌ = Not feasible without heavy infra / external service
- 💰 = Requires paid third-party service

### 2.1 Client-side (rendered in browser during upload)

| Format | Library | Feasibility | Bundle Cost | Fidelity | Notes |
|---|---|---|---|---|---|
| Image | Native `<img>` + Canvas | ✅ | 0 KB | Perfect | Just scale the uploaded image |
| PDF | `pdfjs-dist` (Mozilla PDF.js) | ✅ | ~800 KB (lib + worker) | High | Battle-tested, Firefox uses it |
| TXT | Canvas 2D API | ✅ | 0 KB | Medium | Render text lines as image |
| DOCX | `docx-preview` + `html2canvas` | ⚠️ | ~250 KB | Low-Medium | Approximates styling; complex tables/images may break; `docx-preview` README explicitly says "not efficient for thumbnails" |
| XLSX | `xlsx` (SheetJS) + `html2canvas` | ⚠️ | ~400 KB | Low-Medium | Parse → HTML table → screenshot; no chart rendering |
| PPTX | `pptx2html` / `pptxjs` + `html2canvas` | ⚠️ | ~500 KB | Low | Ancient libs, unreliable; animations/SmartArt not rendered |

**Total if supporting all formats client-side**: ~2 MB gzipped added to bundle. Large but feasible via dynamic import.

### 2.2 Server-side Node.js (Convex action with `"use node"` directive)

| Format | Library | Feasibility | Runtime Cost | Fidelity | Notes |
|---|---|---|---|---|---|
| Image | `sharp` (already demoed in Convex docs) | ✅ | Low | Perfect | Cleanest path |
| PDF | `unpdf` + `@napi-rs/canvas` | ⚠️ | Medium | High | Works in Node.js but requires native canvas module — **Convex native module support unclear**, needs testing |
| PDF | `pdfjs-dist` + node-canvas | ⚠️ | Medium | High | Traditional path, native dep issue same as above |
| TXT | `canvas` (Node 2D API) or `sharp` + text render | ✅ | Low | Medium | Node canvas can render text |
| DOCX | **No pure-JS solution renders to image** | ❌ | — | — | Need LibreOffice or external API |
| XLSX | SheetJS parse only (no image render) | ❌ | — | — | Same |
| PPTX | **No Node-native PPTX renderer** | ❌ | — | — | Same |
| **ALL formats via LibreOffice** | `libreoffice-convert` npm | ❌ | — | — | LibreOffice binary ~300MB, **won't fit in Convex action** |

### 2.3 External API (third-party service)

| Service | Formats | Pricing | Latency | Reliability |
|---|---|---|---|---|
| **ApyHub** Generate File Preview | PDF, DOCX, PPTX, XLSX, TXT + more | Free tier + unified subscription 💰 | ~2-5 sec | Good (documented format support) |
| **Cloudmersive** Document to Thumbnail | PDF, DOCX, DOC, XLSX, XLS, PPTX, PPT, 100+ image formats | Free tier limited + pay-as-you-go 💰 | ~2-5 sec | Good |
| **ConvertAPI** | All Office + PDF + image | 250 credits/month free + pay-as-you-go 💰 | ~3-8 sec | Good |
| **Self-hosted LibreOffice** (Docker on Fly.io / Render / separate VPS) | All formats via PDF pipeline | $5-20/month infra 💰 | ~5-15 sec | Medium (need to monitor) |

**All external services** provide HTTP API: POST file → receive PNG image URL or binary. Easy to call from Convex action.

### 2.4 Hybrid Approaches (best-of-all-worlds combinations)

**Hybrid A — Client-first with server fallback:**
- Images: client-side resize + Convex storage
- PDF: client-side `pdfjs-dist` → first page image → Convex storage
- DOCX/XLSX/PPTX/TXT: fallback to extension label (current PoC) OR external API call on upload

**Hybrid B — Server-first via external API:**
- Images: Convex action + `sharp` resize
- All documents: Convex action → ApyHub/Cloudmersive API → store result

**Hybrid C — Full client-side (brave):**
- Everything rendered in browser via pdfjs/docx-preview/SheetJS/html2canvas
- No external dependency, no server cost
- Large bundle, unreliable for non-PDF formats

## 3. Library / Service Catalog

### 3.1 `pdfjs-dist` (Mozilla PDF.js)
- **Version**: 5.6.205 (as of research date)
- **Bundle**: ~300 KB core + ~500 KB worker, dynamic imported with `ssr: false`
- **Install**: `npm i pdfjs-dist --no-optional` (avoid 180MB canvas optional dep)
- **Next.js gotchas**: Needs `"use client"`, worker file path must match version, throws hydration error if SSR not disabled
- **API**: `pdfjsLib.getDocument(data).promise → pdf.getPage(1) → page.render({canvasContext, viewport})`
- **Best for**: PDF rendering, high fidelity, client-side

### 3.2 `unpdf` (UnJS)
- **Package**: Serverless-friendly PDF.js wrapper
- **Edge compatible**: For text extraction. For **image rendering**, still needs Node.js + `@napi-rs/canvas`
- **Best for**: Server-side PDF text extraction (Edge compatible) + Node.js image rendering

### 3.3 `docx-preview`
- **Bundle**: ~150 KB
- **Output**: HTML (not image) — must be paired with `html2canvas`
- **Fidelity**: Decent for simple docs, breaks on complex layouts
- **Per docs**: "Not efficient for thumbnails" — library author's own caveat

### 3.4 `html2canvas`
- **Bundle**: ~45 KB
- **Output**: Takes a DOM subtree → renders to canvas → PNG
- **Limitations**: No cross-origin frames, CSS features partially supported, slow for large content

### 3.5 `@cyntler/react-doc-viewer`
- **v1.17.1** (updated 6 months ago)
- **Approach**: Uses external MS Office Online iframe for DOCX/XLSX/PPTX — **requires public URL + CORS**
- **Not suitable** for our thumbnail use case (we want static image, not iframe viewer)

### 3.6 ApyHub File Preview API
- **Endpoint**: POST file binary → receive PNG
- **Formats**: PDF, DOCX, PPTX, XLSX, TXT, + more
- **Custom size**: Width/height params supported
- **Free tier**: Exists (monthly quota, exact number not published pre-signup)
- **Auth**: API token
- **Best for**: Drop-in solution for all office formats

### 3.7 Cloudmersive Document to Thumbnail
- **Endpoint**: `/convert/image/document/*/to/png` (auto-detects type)
- **Max thumbnail**: 2048x2048
- **Free tier**: Exists
- **Enterprise-grade SLA**: Yes
- **Best for**: Production-ready multi-format thumbnailing

### 3.8 LibreOffice headless (self-hosted or AWS Lambda)
- **Capability**: Converts ANY office format → PDF → any image format
- **Dep**: 300MB binary, **cannot fit in Convex action or Vercel serverless**
- **Options**: Run on Fly.io / Render / separate Docker container / AWS Lambda (Shelf Engineering's serverless-libreoffice Lambda layer exists)
- **Best for**: Self-hosted, full control, zero per-request cost

## 4. Architecture Options

Dengan mempertimbangkan project saat ini pakai **Next.js (App Router) + Convex backend + Vercel hosting** dan already uses Convex storage:

### Option 1 — Client-side PDF only, extension label fallback
```
User uploads file
   ├── is image? → current path (inline <Image>)
   ├── is PDF? → pdfjs-dist renders first page → upload thumbnail to Convex storage
   └── else → no thumbnail, MessageAttachment shows extension label (current PoC)
```

**Pros:**
- Lowest architectural change
- Zero external service
- Zero new server infra
- Solves the PDF case (likely most common academic file)
- Images remain handled

**Cons:**
- DOCX/XLSX/PPTX/TXT still use extension label (not "visual content preview")
- Client bundle +800 KB for pdfjs-dist
- Client CPU spent on upload (negligible for single file)

**Best if:** User accepts partial coverage (PDF + images = maybe 80% of actual uploads)

### Option 2 — Convex action + ApyHub API (full coverage)
```
User uploads file → Convex storage
  → schedule background action (runAfter(0))
  → action downloads file from storage
  → action POSTs to ApyHub /generate-file-preview
  → action stores returned PNG in Convex storage
  → action mutates file record with thumbnailStorageId
  → UI reactively shows thumbnail once available (meanwhile: extension label placeholder)
```

**Pros:**
- Full coverage for all 5 formats + images
- Zero client-side bundle cost
- Thumbnails consistent across all platforms (Web, mobile, desktop)
- Graceful progressive enhancement (placeholder → real thumbnail when ready)
- One thumbnail per file, cached forever

**Cons:**
- New external dependency (ApyHub account + API key in env)
- Per-conversion cost 💰 (unknown exact pricing, need pre-signup estimate)
- Latency: 2-5 sec between upload and thumbnail visible
- Risk: external API downtime → fall back to extension label
- **New infra surface**: Convex action for thumbnail pipeline

**Best if:** User wants full fidelity and is OK with third-party dep + recurring cost

### Option 3 — Hybrid (PDF client-side + external API for office)
```
User uploads file
  ├── is image? → Convex action + sharp resize
  ├── is PDF? → client-side pdfjs-dist → upload thumb
  ├── is DOCX/XLSX/PPTX/TXT? → Convex action + ApyHub API → upload thumb
  └── else → extension label
```

**Pros:**
- PDF is handled client-side (zero external cost for most common format)
- Office files handled via external API (guaranteed format coverage)
- External API called less often (only for office formats) → cost optimized

**Cons:**
- Most complex architecture (3 different code paths)
- Still needs ApyHub dep for DOCX/XLSX/PPTX/TXT
- Client bundle +800 KB still applies

**Best if:** User wants to optimize per-format and minimize external API usage

### Option 4 — Self-hosted LibreOffice micro-service
```
User uploads file → Convex storage
  → Convex action downloads → POST to self-hosted LibreOffice API (Fly.io / Render / VPS)
  → receive PDF → render first page via pdfjs → upload PNG
```

**Pros:**
- No per-request external cost (just infra fixed cost)
- Full format coverage
- Full control

**Cons:**
- Requires deploying + monitoring a LibreOffice Docker container
- Infra cost ($5-20/month)
- Operational overhead
- Latency 5-15 sec

**Best if:** User wants to avoid external API dependency AND is willing to operate a micro-service

### Option 5 — Text-extract preview (compromise option)
Instead of rendering the actual first page visually, extract first ~50 words of text and render it as an image via Canvas API:
```
User uploads file → Convex action
  → PDF: pdf-parse extracts text (already in deps)
  → DOCX: mammoth / docx extracts text (docx already in deps)
  → XLSX: SheetJS extracts first sheet cells as text
  → PPTX: pptx2json extracts first slide text
  → TXT: read content
  → render first N words to Canvas → save as image
```

**Pros:**
- No external API needed
- Works for ALL formats using libraries already in `package.json` (docx, pdf-parse)
- Fast, deterministic
- Text-based preview gives meaningful content hint

**Cons:**
- **Not a "screenshot of first page"** — it's a text render, so the visual doesn't show headers, tables, images, charts from the source
- User's vision was specifically "screenshot/gambar" which implies visual fidelity
- Feels less "premium" than a true page render

**Best if:** User can compromise on visual fidelity for simplicity and zero dependencies

## 5. Cost Analysis

Assumption: 1,000 file uploads per month (rough estimate for a growing academic app).

| Option | Upfront dev time | Monthly runtime cost | Infrastructure complexity |
|---|---|---|---|
| 1 (PDF client only) | ~2 days | $0 | +pdfjs-dist bundle only |
| 2 (Convex + ApyHub) | ~3 days | ~$5-20 (est.) | +ApyHub account + env vars |
| 3 (Hybrid) | ~4 days | ~$2-10 (est.) | Option 1 + Option 2 combined |
| 4 (Self-hosted LibreOffice) | ~5-7 days | ~$5-15 + ops | +Docker container + monitoring |
| 5 (Text-extract) | ~3 days | $0 | No new deps |

**Important caveat**: Actual ApyHub/Cloudmersive pricing varies per plan tier. Need to sign up for exact quotes. For 1,000 uploads/month, free tier might suffice — worth testing.

## 6. Caching & Upload Pipeline Design

Regardless of option chosen, the pipeline should be:

1. **Upload trigger**: User drops file → existing upload flow to Convex storage → fileId returned
2. **Thumbnail trigger**: Mutation that creates file record **schedules** Convex action (`ctx.scheduler.runAfter(0, internal.files.generateThumbnail, { fileId })`)
3. **Action runs in background**: Returns file record immediately to UI, thumbnail processed async
4. **UI reactivity**: File record in UI reactively updates with `thumbnailStorageId` when ready
5. **UI states**:
   - Before thumbnail ready: MessageAttachment shows extension label (current PoC) — **loading state**
   - After thumbnail ready: MessageAttachment shows thumbnail image
   - On thumbnail generation failure: MessageAttachment stays on extension label (**graceful fallback**)
6. **Cache**: Thumbnail is uploaded ONCE to Convex storage. All subsequent reads serve from cache. Zero regeneration cost.

This async pattern is idiomatic Convex (per their "Background Job Management" docs).

## 7. Recommendation

**Primary recommendation: Option 3 (Hybrid) with Option 1 as MVP**

Rationale:
- **PDF is likely the most common format** in an academic paper app (references, citations, course materials). Solving PDF client-side via pdfjs-dist gives the biggest user-visible improvement with zero external cost.
- **Office formats** (DOCX/XLSX/PPTX) are less common but still important. External API (ApyHub) handles them reliably.
- **Text file (.txt)** could be handled client-side via Canvas 2D text rendering — trivial, ~50 lines.
- **Image files** already work via existing path; only need to unify visual into thumbnail card.
- **Progressive roll-out**: Ship Option 1 (PDF + image only) first as MVP. Observe upload patterns. If non-PDF office formats are common, add Option 3 layer (external API).

**Phased plan:**
- **Phase 1 (MVP, ~2 days dev)**: Option 1 — PDF client-side + image + TXT canvas render. DOCX/XLSX/PPTX gracefully fall back to extension label.
- **Phase 2 (~2-3 days dev)**: Add ApyHub integration for DOCX/XLSX/PPTX via Convex action. Makes Option 3 complete.

**Why NOT Option 2 (external API for everything)**: Paying per-request for PDF when client-side works fine is wasteful.

**Why NOT Option 4 (self-hosted)**: Extra ops burden for a small team. Only makes sense at scale (10k+ uploads/month).

**Why NOT Option 5 (text-extract)**: User explicitly said "screenshot/gambar", which implies visual fidelity. Text-only preview doesn't match the vision.

## 8. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| `pdfjs-dist` bundle +800 KB | Dynamic import with `ssr: false` + lazy load only when upload starts |
| `pdfjs-dist` worker version mismatch | Pin version in `package.json`, test after install |
| Thumbnail generation fails for corrupt/exotic PDF | Graceful fallback to extension label |
| Client OOM for huge PDFs (>100 MB) | Reject PDFs over reasonable size threshold (e.g., 50 MB) before rendering |
| External API downtime (Option 3 phase 2) | Graceful fallback to extension label + retry logic in Convex action |
| External API pricing surprise | Monitor usage, set hard quota per user/month |
| Convex native module (`@napi-rs/canvas`) incompatibility | Test early; if fails, rule out server-side PDF rendering → client-side only |
| Image orientation EXIF issues | `sharp` handles rotation automatically |
| Thumbnail storage cost growth | Prune thumbnails when source file deleted (CASCADE via file record) |

## 9. Scope Boundaries (Non-Goals)

- **Not** interactive document viewing (only static thumbnail)
- **Not** page navigation in preview (only page 1)
- **Not** OCR for image-only PDFs
- **Not** real-time video/audio preview
- **Not** editable previews

## 10. Open Questions for User

### Q1. "Screenshots dari paragrafnya jika single page" — clarify meaning

Ada dua interpretasi:
- **Interpretasi A (visual)**: Render visual dari halaman tunggal secara utuh (heading, body, layout). Sama dengan "first page" tapi untuk single-page doc.
- **Interpretasi B (text snippet)**: Ekstrak teks paragraf pertama, render sebagai image text-only.

Yang mana yang lo maksud?

**Rekomendasi gue: A** — konsisten dengan vision "screenshot/gambar".

### Q2. Fidelity level yang lo ekspektasi

Thumbnail 48x48px (ukuran di PoC sekarang) atau lebih besar (seperti 96x96px / 120x120px / full bleed)?

Thumbnail kecil: detail hampir tidak terbaca, jadi "first page image" lebih berfungsi sebagai visual identifier, bukan preview konten.
Thumbnail besar: butuh lebih banyak bandwidth, bubble jadi lebih tinggi, tapi konten lebih terbaca.

**Rekomendasi gue**: 96x96px atau lebih. Kalau 48x48, extension label udah cukup (kasus sebelumnya). User point of wanting visual fidelity implies bigger preview.

### Q3. Architecture preference — Option 1, 2, 3, 4, atau 5?

Rekomendasi gue: **Option 3 (Hybrid), staged** — Phase 1 Option 1 dulu (PDF + image + TXT), Phase 2 Option 3 (tambah ApyHub untuk office).

Pilihan lo?

### Q4. Bundle size tolerance

`pdfjs-dist` nambah ~800 KB gzipped ke client bundle (dynamic loaded). Bubble-nya punya impact di TTI (Time to Interactive) meskipun lazy.

Apakah OK trade-off ini buat dapat client-side PDF rendering?

**Rekomendasi gue**: OK, karena dynamic imported pas upload start — zero impact ke initial page load.

### Q5. External API (ApyHub / Cloudmersive) — boleh atau no-go?

Kalau mau Option 2/3, perlu sign-up + API key + per-request cost (~$0.01-0.05 per conversion estimate). Free tier exists tapi limited.

Apakah lo OK dengan external dependency + recurring cost?

**Alternatif kalau no-go**: Option 1 (PDF only, office fallback ke label) atau Option 5 (text-extract, less visual).

### Q6. Upload UX — sync atau async thumbnail generation?

- **Sync**: Block upload confirmation sampai thumbnail ready (~2-5 sec delay per file)
- **Async**: Upload returns immediately with placeholder, thumbnail appears reactively when ready

**Rekomendasi gue**: **Async** — user tidak perlu menunggu. Placeholder = extension label (current PoC).

### Q7. Thumbnail generation timing — on-upload atau on-view?

- **On-upload**: Generate saat file diunggah (sekali per file, stored forever)
- **On-view**: Generate saat bubble rendered (lazy, cached after first view)

**Rekomendasi gue**: **On-upload** — deterministic, cached, no render-time latency, works for all message history retroactively via backfill job.

### Q8. Retroactive backfill

Ada existing messages dengan attachment yang belum punya thumbnail. Apakah perlu:
- **A.** Backfill batch job yang generate thumbnail untuk semua file lama (one-time migration)
- **B.** Generate lazily saat bubble pertama kali rendered pasca-deploy
- **C.** Skip — cuma file baru yang dapet thumbnail, file lama tetep pakai extension label

**Rekomendasi gue**: **C untuk MVP**, **A kemudian** kalau user minta.

## 11. References

### Libraries
- **pdfjs-dist**: https://www.npmjs.com/package/pdfjs-dist
- **unpdf** (UnJS serverless PDF.js wrapper): https://unjs.io/packages/unpdf
- **pdfjs-serverless**: https://github.com/johannschopplich/pdfjs-serverless
- **docx-preview**: https://www.npmjs.com/package/docx-preview
- **html2canvas**: https://html2canvas.hertzen.com
- **@cyntler/react-doc-viewer**: https://github.com/cyntler/react-doc-viewer
- **SheetJS** (xlsx): https://sheetjs.com

### External APIs
- **ApyHub File Preview**: https://apyhub.com/utility/generate-file-preview
- **Cloudmersive Document to Thumbnail**: https://cloudmersive.com/convert/pdf-to-thumbnail-api
- **ConvertAPI**: https://www.convertapi.com/prices
- **Nutrient (Apryse) WebViewer**: https://apryse.com/products/webviewer

### Convex architecture docs
- **Convex file storage**: https://docs.convex.dev/file-storage
- **Convex scheduled actions**: https://docs.convex.dev/scheduling/scheduled-functions
- **Convex Node.js runtime**: https://docs.convex.dev/functions/actions (under "use node")
- **Convex background jobs**: https://stack.convex.dev/background-job-management

### Self-hosted LibreOffice
- **serverless-libreoffice (AWS Lambda layer)**: https://github.com/vladholubiev/serverless-libreoffice
- **docker-libreoffice-api**: https://github.com/hannesdejager/docker-libreoffice-api

### Performance / Bundle
- **pdfjs-dist Next.js issues**: https://github.com/wojtekmaj/react-pdf/issues/1855
- **Next.js dynamic imports**: https://dev.to/bolajibolajoko51/optimizing-performance-in-nextjs-using-dynamic-imports-5b3
