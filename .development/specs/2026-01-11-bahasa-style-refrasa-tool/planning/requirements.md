# Spec Requirements: Bahasa Style Refrasa Tool

## Deskripsi Awal

Tool "Refrasa" adalah integrasi `bahasa_style` linter (yang sudah ada di `src/tools/bahasa_style/`) ke dalam aplikasi Makalah sebagai fitur yang di-trigger oleh user. Tool ini berfungsi sebagai "Ruthless Linter" untuk tulisan akademis Bahasa Indonesia dengan tujuan:
- Menghilangkan pola tulisan AI yang monoton
- Mendeteksi "Indonenglish" (struktur Inggris yang diterjemahkan mentah)
- Memaksa variasi irama kalimat (burstiness)
- Membatasi kata-kata "kruk" (crutches) via budget system

Konsep utama: Memperlakukan gaya penulisan sebagai **Constraint Satisfaction Problem** untuk menentukan `needsRefrasa` (Pass/Fail internal), UI tetap non-blocking.

---

## Requirements Discussion

### Keputusan dari Diskusi Sebelumnya

**Q1:** Bagaimana trigger mechanism untuk refrasa?
**Answer:** UI-Triggered (Tombol Refrasa) - Bukan integrated/auto-enforcement. User klik tombol untuk trigger refrasa. Non-blocking, user-controlled.

**Q2:** Di mana integration point utama?
**Answer:** Artifact Viewer sebagai primary integration point. Tombol "Refrasa" di toolbar artifact, plus context menu untuk text selection.

**Q3:** Scope apa yang di-support?
**Answer:** V1 hanya support:
- Full artifact content
- Selected text (user highlight)

**Q4:** Bagaimana strictness level?
**Answer:** Non-blocking, warning-based:
- CRITICAL = highlight merah + strong recommendation
- WARNING = highlight kuning + soft suggestion
- Tidak blocking user action

**Q5:** Bagaimana scoring system?
**Answer:** Display-only indicator:
- Score 0-100 untuk visibility
- Bukan gate/blocker
- Formula: CRITICAL = -15, WARNING = -5 (improved dari raw implementation)

**Q6:** Bagaimana handle dependency `natural` library?
**Answer:** Keep `natural` library untuk MVP. Optimize nanti kalau bundle size jadi issue.

**Q7:** Apakah perlu kamus grammar lengkap untuk style rules?
**Answer:** TIDAK perlu kamus grammar Bahasa Indonesia lengkap. Yang diperlukan:
- **Enriched Rules** - Tambah `examples` dan `transformationHint` ke existing rules
- **Constitution sebagai AI Prompt** - Dokumen constitution dijadikan basis prompt untuk AI refrasing
- **Extensibility dengan Guardrails** - Rules bisa ditambah/diubah dengan soft limits

**Q8:** Berapa batas jumlah rules yang aman?
**Answer:** Recommended soft limits:
- FORBIDDEN_PATTERNS: max 15-20 items
- BUDGETED_WORDS: max 20-25 items
- EFFICIENCY_TARGETS: max 5-10 items
- Constitution: max 8-10 sections, ~5000 tokens

**Q9:** Apakah tool harus bisa dipanggil agent di semua konteks?
**Answer:** YA. Tool harus bisa dipanggil agent saat paper-workflow aktif maupun di percakapan bebas, tanpa tergantung state workflow.

---

## Existing Code to Reference

### Similar Features Identified

**Feature:** ArtifactViewer Toolbar
- Path: `src/components/chat/ArtifactViewer.tsx`
- Components to potentially reuse: Button pattern (Edit, Copy, Download di footer toolbar)
- Pola yang bisa diikuti: isEditing state management, handleSave pattern

**Feature:** VersionHistoryDialog
- Path: `src/components/chat/VersionHistoryDialog.tsx`
- Pattern untuk dialog comparison UI

**Feature:** ArtifactEditor
- Path: `src/components/chat/ArtifactEditor.tsx`
- Pattern untuk editing content inline

**Feature:** Existing Bahasa Style Linter
- Path: `src/tools/bahasa_style/`
- Backend logic yang sudah ready untuk diintegrasikan
- Entry point: `BahasaStyle.validate(text): ValidationResult`

---

## Visual Assets

### Files Provided
Tidak ada visual assets yang disediakan.

### Visual Insights
Berdasarkan raw-idea.md, arsitektur visual yang disetujui:

```
+-------------------------------------------------------------+
|  ARTIFACT VIEWER                                            |
|  +-------------------------------------------------------+  |
|  |  [Edit] [Copy] [Refrasa] [Skor: 72]                   |  |
|  +-------------------------------------------------------+  |
|  Content area... (selectable untuk context menu refrasa)    |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  API ROUTE: POST /api/refrasa                               |
|  Request: { mode, content, context?, artifactId? }          |
|  Response: { original, refrasad, needsRefrasa }             |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|  CONFIRMATION DIALOG                                        |
|  Score: 45 -> 92                                            |
|  Before/After comparison                                    |
|  [Terima Perubahan] [Batal]                                 |
+-------------------------------------------------------------+
```

---

## Requirements Summary

### Functional Requirements

#### FR-1: Tombol Refrasa di Artifact Viewer
- **Deskripsi:** Menambahkan tombol "Refrasa" di toolbar ArtifactViewer
- **Detail:**
  - Tombol dengan icon yang sesuai (misal: WandSparkles atau Paintbrush)
  - Posisi: di antara tombol Edit dan Copy (atau sebelum Copy)
  - State: disabled jika artifact sedang loading atau kosong
- **Acceptance Criteria:**
  - [ ] Tombol terlihat di toolbar ArtifactViewer
  - [ ] Tombol disabled saat artifact null/loading
  - [ ] Klik tombol trigger proses validasi

#### FR-2: Score Indicator di Toolbar
- **Deskripsi:** Menampilkan skor gaya tulisan (0-100) di toolbar
- **Detail:**
  - Badge menunjukkan skor dengan color coding
  - Hijau (80-100): Excellent
  - Kuning (60-79): Perlu perbaikan
  - Merah (<60): Banyak masalah
- **Catatan Implementasi:**
  - Skor saat artifact di-load harus lewat jalur validasi-only (tanpa AI).
- **Acceptance Criteria:**
  - [ ] Skor ditampilkan saat artifact di-load
  - [ ] Warna badge sesuai dengan range skor
  - [ ] Skor di-update setelah proses refrasa

#### FR-3: Text Selection Context Menu
- **Deskripsi:** Context menu untuk refrasa teks yang di-highlight
- **Detail:**
  - User select text di artifact content
  - Right-click atau menu icon muncul
  - Option "Refrasa seleksi ini"
- **Acceptance Criteria:**
  - [ ] Context menu muncul saat text di-select
  - [ ] Option "Refrasa" tersedia di menu
  - [ ] Hanya text yang di-select yang di-proses

#### FR-4: Validation API Endpoint
- **Deskripsi:** API endpoint untuk validasi dan refrasa teks
- **Endpoint:** `POST /api/refrasa`
- **Request Contract:**
  ```typescript
  interface RefrasaRequest {
    mode: 'full' | 'selection'
    content: string           // Text to validate/refrasa
    context?: string          // Surrounding text for AI context
    artifactId?: string       // For tracking/versioning
  }
  ```
- **Response Contract:**
  ```typescript
  interface RefrasaResponse {
    needsRefrasa: boolean     // True jika ada issues
    original: {
      text: string
      score: number           // 0-100
      issues: ValidationIssue[]
    }
    refrasad?: {              // Null jika needsRefrasa = false
      text: string
      score: number
      issues: ValidationIssue[]  // Issues yang tersisa setelah refrasa
    }
    mode: 'full' | 'selection'
  }
  ```
- **Acceptance Criteria:**
  - [ ] Endpoint menerima request sesuai contract
  - [ ] Response mengembalikan hasil validasi
  - [ ] Response mengembalikan teks yang sudah di-refrasa (jika ada issues)
  - [ ] Error handling untuk input kosong/invalid
  - [ ] Jika request hanya validasi (tanpa refrasa), tidak memanggil AI

#### FR-5: Confirmation Dialog
- **Deskripsi:** Dialog untuk konfirmasi perubahan refrasa
- **Detail:**
  - Menampilkan before/after comparison
  - Score comparison (misal: 45 -> 92)
  - List issues yang diperbaiki
  - Tombol "Terima Perubahan" dan "Batal"
- **Acceptance Criteria:**
  - [ ] Dialog muncul setelah proses refrasa selesai
  - [ ] Before/After text ditampilkan side-by-side atau diff view
  - [ ] Score change jelas terlihat
  - [ ] User bisa accept atau cancel perubahan

#### FR-6: Apply Refrasa Changes
- **Deskripsi:** Menyimpan perubahan ke artifact setelah user accept
- **Detail:**
  - Jika mode = 'full': replace seluruh content
  - Jika mode = 'selection': replace hanya bagian yang di-select
  - Create new version (increment version number)
- **Acceptance Criteria:**
  - [ ] Perubahan tersimpan sebagai versi baru artifact
  - [ ] Content ter-update di UI
  - [ ] Toast notification sukses
  - [ ] Score indicator ter-update

#### FR-7: Issues Highlighting (Dialog-only)
- **Deskripsi:** Highlight visual untuk issues hanya di dialog konfirmasi
- **Detail:**
  - CRITICAL issues: background merah/pink dengan text yang kontras
  - WARNING issues: background kuning dengan text gelap
  - Tooltip menampilkan pesan issue dan suggestion
- **Acceptance Criteria:**
  - [ ] Issues ter-highlight di dialog dengan warna yang tepat
  - [ ] Tooltip menunjukkan pesan issue dan suggestion
  - [ ] Tidak ada inline highlight di teks utama (v1)

#### FR-8: Akses Agent di Semua Kondisi
- **Deskripsi:** Tool dapat dipanggil agent pada semua konteks aplikasi
- **Detail:**
  - Bisa dipanggil saat paper-workflow aktif
  - Bisa dipanggil di percakapan bebas di luar workflow
  - Tidak tergantung state workflow
- **Acceptance Criteria:**
  - [ ] Agent bisa memanggil tool saat workflow aktif
  - [ ] Agent bisa memanggil tool di percakapan bebas
  - [ ] Tidak ada dependency ke state workflow untuk memproses request
  - [ ] Ada test otomatis untuk dua skenario akses agent lintas konteks

---

### Non-Functional Requirements

#### NFR-1: Performance
- **Deskripsi:** Validasi harus cepat dan tidak mengganggu UX
- **Criteria:**
  - Validasi teks < 5000 kata selesai dalam < 500ms
  - Score calculation tidak blocking UI
  - Loading state yang jelas saat proses berjalan

#### NFR-2: User Experience
- **Deskripsi:** Fitur harus intuitif dan non-intrusive
- **Criteria:**
  - Tidak ada auto-enforcement - user selalu in control
  - Feedback visual yang jelas (loading spinner, success toast)
  - Error messages yang helpful dalam Bahasa Indonesia

#### NFR-3: Accessibility
- **Deskripsi:** Fitur harus accessible
- **Criteria:**
  - Keyboard navigation untuk tombol dan dialog
  - ARIA labels yang tepat
  - Color tidak menjadi satu-satunya indikator (kombinasi dengan icon/text)

#### NFR-4: Bundle Size
- **Deskripsi:** Minimize impact pada bundle size
- **Criteria:**
  - Bahasa style logic di-load lazy jika memungkinkan
  - `natural` library hanya di-import saat dibutuhkan (API route only, bukan client bundle)

---

### Technical Requirements

#### TR-1: API Route Architecture
- **Deskripsi:** Next.js API route untuk handling refrasa
- **Detail:**
  - Path: `src/app/api/refrasa/route.ts`
  - Method: POST only
  - Input validation menggunakan Zod schema
  - Error handling dengan proper HTTP status codes
  - Jalur validasi-only untuk skor (tanpa AI) wajib tersedia
- **Dependencies:**
  - `src/tools/bahasa_style/` - Linter logic
  - Vercel AI SDK - untuk AI-powered refrasing (opsional)

#### TR-2: Client Components
- **Deskripsi:** React components untuk UI
- **Components:**
  - `RefrasaButton` - Tombol trigger di toolbar
  - `RefrasaScoreBadge` - Score indicator badge
  - `RefrasaConfirmDialog` - Confirmation dialog dengan diff view
  - `RefrasaIssueItem` - Item highlight issue di dialog
- **Location:** `src/components/refrasa/`

#### TR-3: Type Definitions
- **Deskripsi:** Shared TypeScript types
- **Detail:**
  - Re-export types dari `src/tools/bahasa_style/core/types.ts`
  - Tambahan types untuk API contract
- **Location:** `src/lib/refrasa/types.ts`

#### TR-4: Score Calculation Update
- **Deskripsi:** Update formula scoring
- **Detail:**
  - Current: `100 - (issues.length * 10)` (terlalu simplistic)
  - New: `100 - (CRITICAL_count * 15) - (WARNING_count * 5)`
  - Minimum score: 0
- **File:** `src/tools/bahasa_style/modules/linter.ts`

#### TR-5: Enriched Rule Structure
- **Deskripsi:** Upgrade rule definitions dengan examples dan transformation hints
- **Detail:**
  - Setiap rule WAJIB punya `examples` array dengan before/after
  - Tambah `transformationHint` untuk guidance AI refrasing
  - Tambah `category` untuk grouping rules
- **New Type Structure:**
  ```typescript
  interface EnrichedForbiddenPattern {
    pattern: RegExp
    message: string
    suggestion: string
    severity: 'CRITICAL' | 'WARNING'
    category: 'indonenglish' | 'placement' | 'certainty' | 'connector'
    examples: Array<{
      bad: string
      good: string
      explanation?: string
    }>
    transformationHint: string  // Guidance untuk AI
  }

  interface EnrichedBudgetedWord {
    limit: number
    suggestion: string
    alternatives?: string[]     // Daftar alternatif yang disarankan
    examples?: Array<{
      bad: string
      good: string
    }>
    transformationHint?: string
  }
  ```
- **File:** `src/tools/bahasa_style/core/definitions.ts`
- **Acceptance Criteria:**
  - [ ] Semua FORBIDDEN_PATTERNS (6 items) punya minimal 1 example
  - [ ] Semua BUDGETED_WORDS (10 items) punya transformationHint
  - [ ] Type definitions updated dengan new structure
  - [ ] Existing linter logic tetap backward compatible

#### TR-6: AI Prompt Template dari Constitution
- **Deskripsi:** Buat prompt template untuk AI refrasing berdasarkan constitution
- **Detail:**
  - Extract key rules dari `makalah-style-constitution.md`
  - Format sebagai structured prompt
  - Include detected issues + transformation hints
  - Max ~2000 tokens untuk prompt template (diukur dengan batas karakter/kata sederhana)
- **File:** `src/lib/refrasa/prompt-template.ts`
- **Template Structure:**
  ```typescript
  function buildRefrasaPrompt(
    originalText: string,
    detectedIssues: ValidationIssue[],
    rules: EnrichedRule[]
  ): string
  ```
- **Acceptance Criteria:**
  - [ ] Prompt template menghasilkan consistent transformations
  - [ ] Prompt < 2000 tokens (excluding input text)
  - [ ] Examples dari enriched rules digunakan dalam prompt

---

### Integration Requirements

#### IR-1: ArtifactViewer Integration
- **Deskripsi:** Integrasi dengan existing ArtifactViewer component
- **Detail:**
  - Tombol Refrasa di toolbar (sebelum tombol Copy)
  - Score badge di toolbar header
  - Tidak mengubah struktur data artifact yang ada
- **File:** `src/components/chat/ArtifactViewer.tsx`

#### IR-2: Artifact Update Flow
- **Deskripsi:** Menggunakan existing mutation untuk update artifact
- **Detail:**
  - Gunakan `api.artifacts.update` mutation yang sudah ada
  - Version increment handled by existing logic
- **Dependency:** `convex/artifacts.ts`

#### IR-4: Authorization
- **Deskripsi:** Endpoint refrasa wajib auth dan cek ownership jika `artifactId` dikirim
- **Detail:**
  - Jika `artifactId` ada, verifikasi user adalah pemilik artifact
  - Jika tanpa `artifactId`, proses hanya pada `content` request (tanpa akses data artifact)

#### IR-3: Selection Context Menu
- **Deskripsi:** Context menu untuk text selection
- **Detail:**
  - Gunakan Radix UI ContextMenu atau custom implementation
  - Track selection range untuk partial refrasa
- **Consideration:** Pastikan tidak conflict dengan browser default context menu

---

### Scope Boundaries

**In Scope:**
- Tombol Refrasa di ArtifactViewer toolbar
- Score indicator badge
- Validation API endpoint (`/api/refrasa`)
- Confirmation dialog dengan before/after comparison
- Full content refrasa
- Selected text refrasa
- Issues highlighting di dialog dengan tooltips
- Improved scoring formula
- Tool dapat dipanggil agent di semua konteks (workflow aktif maupun percakapan bebas)

**Out of Scope (v1):**
- Auto-enforcement di paper workflow stages
- Structural Planning (JSON sentence intent)
- Constrained Generation (logit bias)
- Sinonim Dinamis (advanced synonym rotation)
- Custom tokenizer (tetap pakai `natural` library)
- Per-paragraph mode
- Inline highlight di teks utama (butuh data posisi/range)
- Real-time validation saat mengetik
- Refrasa history/undo
- Batch refrasa multiple artifacts
- Export refrasa report

---

### Technical Considerations

#### Existing Linter Rules
Rules yang sudah implemented di `src/tools/bahasa_style/`:

1. **Sentence Variance** - Deteksi 3 kalimat monoton berturut-turut
2. **Forbidden Patterns** - dimana, tidak hanya...tetapi juga, tergantung
3. **Budgeted Words** - namun (max 1), oleh karena itu (0), jadi (0), dll
4. **Bad Placement** - "Ini" di awal kalimat
5. **Efficiency Check** - adalah, bahwa (warning untuk hapus)
6. **Sentence Length Cap** - >12 kata = long, max 10% dari total

#### Enriched Rules (To Be Implemented)
Setiap rule akan di-upgrade dengan:

| Field | Deskripsi | Contoh |
|-------|-----------|--------|
| `examples` | Before/after transformations | `{ bad: "Oleh karena itu...", good: "Jalanan pun..." }` |
| `transformationHint` | Guidance untuk AI | "Hapus connector, sambungkan implisit" |
| `category` | Grouping untuk organization | `'indonenglish'`, `'connector'`, `'certainty'` |
| `alternatives` | Alternatif kata (untuk budgeted) | `["Akan tetapi", "Sebaliknya"]` |

#### AI Refrasing Strategy
Untuk proses refrasa (mengubah teks), perlu memanfaatkan AI:
- Primary: Vercel AI Gateway dengan model yang sama dengan chat
- Fallback: OpenRouter
- Prompt harus include:
  - Original text dengan issues yang terdeteksi
  - Rules yang dilanggar (dari `bahasa_style`)
  - Instruksi untuk mempertahankan makna asli

#### Bundle Size Consideration
- `natural` library (~500KB) hanya digunakan di API route (server-side)
- Client-side tidak perlu import `natural`
- Score calculation bisa dilakukan di server dan dikirim via response

---

### Architecture Independence

#### Layer Separation Design
Tool ini didesain dengan **loosely coupled architecture** untuk memungkinkan portability dan reusability di masa depan.

| Layer | Location | Independence | Portability |
|-------|----------|--------------|-------------|
| **Core Linter** | `src/tools/bahasa_style/` | ✅ Fully independent | Bisa jadi NPM package standalone |
| **API Wrapper** | `src/app/api/refrasa/` | ⚠️ Next.js specific | Logic portable ke Express/Fastify/Hono |
| **UI Components** | `src/components/refrasa/` | ⚠️ React specific | Bisa reimplementasi di Vue/Svelte |

#### Core Linter Independence
- **Zero framework dependency**: No React, no Next.js di core linter
- **Single external dependency**: Hanya `natural` library untuk tokenization
- **Pure function design**: `BahasaStyle.validate(text) → ValidationResult`
- **Publishable**: Bisa di-extract dan publish sebagai NPM package

#### Future Portability Options
1. **NPM Package**: Publish `@makalah/bahasa-style` untuk reuse di project lain
2. **CLI Tool**: `cli_check.ts` sudah ada, bisa di-expand
3. **VS Code Extension**: Import core, bikin UI di extension API
4. **Standalone Web App**: Import core, bikin API + UI sendiri
5. **Mobile App**: Import core via React Native atau compile ke WASM

#### Design Principles untuk Independence
- **AR-1**: Core linter TIDAK BOLEH import dari `src/app/`, `src/components/`, atau `src/lib/`
- **AR-2**: Core linter TIDAK BOLEH depend pada environment variables aplikasi
- **AR-3**: API wrapper hanya sebagai HTTP interface, semua logic di core
- **AR-4**: UI components hanya consume API, tidak direct import core (kecuali types)

---

### Rule Extension Guidelines

#### Soft Limits (Recommended)

| Category | Current | Max Recommended | Alasan |
|----------|---------|-----------------|--------|
| FORBIDDEN_PATTERNS | 6 | 15-20 | Regex heavy, performance concern |
| BUDGETED_WORDS | 10 | 20-25 | Simple lookup, bisa lebih banyak |
| EFFICIENCY_TARGETS | 2 | 5-10 | Warning only, low impact |
| Constitution sections | 6 | 8-10 | Token limit untuk AI prompt |

#### Quality Requirements untuk Rule Baru

Setiap rule baru WAJIB memiliki:

1. **Detection Pattern** - Regex atau keyword yang jelas
2. **Message** - Penjelasan mengapa ini masalah
3. **Severity** - CRITICAL atau WARNING
4. **Examples** - Minimal 1 contoh before/after
5. **Transformation Hint** - Guidance untuk AI

#### Conflict Prevention

Sebelum menambah rule baru, verifikasi:
- [ ] Tidak overlap dengan existing rule
- [ ] Tidak contradict existing rule
- [ ] Sudah di-test dengan sample texts yang beragam
- [ ] False positive rate < 5%

#### Safe vs Risky Extensions

**SAFE to Add:**
- WARNING-level rules (low risk)
- Rules dengan clear, specific patterns
- Rules yang sudah di-test extensively
- Rules yang address NEW problems

**RISKY to Add:**
- CRITICAL rules tanpa thorough testing
- Broad regex yang bisa match unintended text
- Rules tanpa examples

**AVOID:**
- Rules tanpa examples atau transformation hints
- Rules yang contradict existing
- More than 50 total rules (diminishing returns)
- Constitution > 5000 tokens

---

## Referensi Dokumen

- `.references/bahasa-style/concept.md` - Konsep dasar tool
- `.references/bahasa-style/implementaion-recommendation.md` - Rekomendasi implementasi
- `.references/bahasa-style/regulations.md` - Analisis extensibility rules
- `.development/knowledge-base/writing_style_tool/bahasa_style_capabilities.md` - Detail kapabilitas linter
- `.development/knowledge-base/writing_style_tool/makalah-stylist-concept.md` - Arsitektur konsep
- `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md` - Rules penulisan yang dijadikan acuan
