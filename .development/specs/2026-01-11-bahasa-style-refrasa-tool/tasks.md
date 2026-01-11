# Task Breakdown: Bahasa Style Refrasa Tool

## Overview
Total Tasks: 42 sub-tasks dalam 6 task groups

Fitur ini mengintegrasikan `bahasa_style` linter yang sudah ada ke dalam aplikasi sebagai tool "Refrasa" yang di-trigger oleh user untuk memperbaiki gaya penulisan akademis Bahasa Indonesia.

**Goal Positioning:** "Writing Quality Improver untuk Bahasa Indonesia Akademis"
- Fokus: tulisan lebih natural, tidak terkesan template
- Bonus: kebetulan juga lolos detector karena lebih natural

---

## Task List

### Foundation Layer

#### Task Group 0: Rule Enrichment dan Prompt Template
**Dependencies:** None
**Kompleksitas:** Medium
**Catatan:** Task ini HARUS dikerjakan SEBELUM Task Group 1

- [ ] 0.0 Complete rule enrichment dan prompt template
  - [ ] 0.1 Update type definitions untuk enriched rules
    - Tambah `EnrichedForbiddenPattern` interface dengan fields: examples, transformationHint, category, severity
    - Tambah `EnrichedBudgetedWord` interface dengan fields: alternatives, examples, transformationHint
    - Backward compatible dengan existing types
    - File: `src/tools/bahasa_style/core/types.ts`
  - [ ] 0.2 Enrich FORBIDDEN_PATTERNS dengan examples
    - Tambah minimal 1 example per pattern (6 patterns total)
    - Tambah transformationHint untuk setiap pattern
    - Tambah category ('indonenglish', 'placement', 'certainty')
    - Tambah severity ('CRITICAL' atau 'WARNING')
    - Referensi: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
    - File: `src/tools/bahasa_style/core/definitions.ts`
  - [ ] 0.3 Enrich BUDGETED_WORDS dengan transformationHint
    - Tambah transformationHint untuk semua 10 words
    - Tambah alternatives array untuk words yang punya sinonim
    - Tambah minimal 1 example untuk kata-kata utama (namun, oleh karena itu)
    - File: `src/tools/bahasa_style/core/definitions.ts`
  - [ ] 0.4 Upgrade EFFICIENCY_TARGETS ke enriched format
    - Convert dari string[] ke EnrichedEfficiencyTarget[]
    - Tambah examples before/after untuk setiap target
    - File: `src/tools/bahasa_style/core/definitions.ts`
  - [ ] 0.5 Buat AI prompt template
    - Extract key rules dari constitution document
    - Create buildRefrasaPrompt() function
    - Template max ~2000 tokens (excluding input text) dengan batas karakter/kata sederhana
    - Include: filosofi induktif, aturan kalimat, contoh transformasi
    - File: `src/lib/refrasa/prompt-template.ts`
  - [ ] 0.6 Verifikasi backward compatibility
    - Pastikan BahasaStyle.validate() masih berfungsi
    - Jalankan existing tests di `src/tools/bahasa_style/tests/`
    - Verifikasi linter tidak break
  - [ ] 0.7 Buat Vocabulary Diversity Module
    - Implementasi calculateTTR() function
    - Buat Indonesian stop words list (dan, yang, di, ke, dari, untuk, dengan, dll)
    - Implementasi checkVocabularyDiversity() dengan threshold: WARNING < 0.40, CRITICAL < 0.30
    - File: `src/tools/bahasa_style/modules/vocabulary.ts`
  - [ ] 0.8 Buat N-gram Analysis Module
    - Implementasi extractNgrams() untuk bigram dan trigram
    - Implementasi countNgramFrequencies() dengan Map
    - Implementasi checkNgramRepetition() dengan threshold > 2x = WARNING
    - Tambah AI-specific patterns: "dalam konteks ini", "perlu dicatat bahwa", "hal ini menunjukkan", "dapat disimpulkan bahwa", "berdasarkan analisis"
    - File: `src/tools/bahasa_style/modules/ngram.ts`
  - [ ] 0.9 Buat Paragraph Analysis Module
    - Implementasi splitIntoParagraphs() by double newline
    - Implementasi calculateParagraphVariance() dengan coefficient of variation
    - Implementasi checkParagraphUniformity() dengan threshold variance < 0.15 = WARNING
    - File: `src/tools/bahasa_style/modules/paragraph.ts`
  - [ ] 0.10 Buat Hedging/Certainty Balance Check
    - Define certainty markers: "pasti", "tentu", "jelas", "sudah pasti", "tidak diragukan"
    - Define hedging markers: "mungkin", "barangkali", "tampaknya", "cenderung", "kemungkinan"
    - Implementasi checkHedgingBalance() per paragraf
    - WARNING jika 100% certainty tanpa hedging dalam paragraf opini
    - File: `src/tools/bahasa_style/modules/paragraph.ts` (same file as 0.9)
  - [ ] 0.11 Expand FORBIDDEN_PATTERNS dengan AI-specific patterns
    - Tambah pattern: `/dalam hal ini/i` - filler phrase
    - Tambah pattern: `/penting untuk dicatat/i` - AI crutch
    - Tambah pattern: `/sebagai kesimpulan/i` - formulaic ending
    - Tambah pattern: `/di sisi lain/i` - translated "on the other hand"
    - Tambah pattern: `/lebih lanjut/i` - translated "furthermore"
    - Semua dengan severity WARNING, category 'ai-pattern', dan transformationHint
    - File: `src/tools/bahasa_style/core/definitions.ts`
  - [ ] 0.12 Integrasikan semua modules ke linter.ts
    - Import vocabulary, ngram, paragraph modules
    - Tambahkan checks ke validateText() pipeline
    - Ensure semua new checks contribute ke score calculation
    - File: `src/tools/bahasa_style/modules/linter.ts`
  - [ ] 0.13 Update type definitions untuk naturalness metrics
    - Tambah IssueType baru: 'vocabulary_diversity', 'ngram_repetition', 'paragraph_uniformity', 'hedging_imbalance'
    - Update ValidationIssue dengan metadata untuk metrics (TTR value, variance value, etc)
    - File: `src/tools/bahasa_style/core/types.ts`

**Acceptance Criteria:**
- Semua 6 FORBIDDEN_PATTERNS punya examples dan transformationHint
- Semua 10 BUDGETED_WORDS punya transformationHint
- Prompt template < 2000 tokens
- Existing linter tetap berfungsi (backward compatible)
- Manual test: `npx tsx src/tools/bahasa_style/cli_check.ts "test text"` masih works
- Vocabulary diversity (TTR) dihitung dan threshold working
- N-gram repetition detection working untuk bigram/trigram
- Paragraph variance check working untuk teks >= 3 paragraf
- Hedging/certainty balance check working
- 5 AI-specific patterns baru ditambahkan ke FORBIDDEN_PATTERNS

---

### Backend Layer

#### Task Group 1: API Endpoint dan Linter Update
**Dependencies:** Task Group 0
**Kompleksitas:** Medium

- [ ] 1.0 Complete backend layer untuk refrasa API
  - [ ] 1.1 Tulis 4-6 focused tests untuk API endpoint refrasa
    - Test validasi input (content kosong, mode invalid)
    - Test response needsRefrasa = true dengan issues
    - Test response needsRefrasa = false tanpa issues
    - Test AI refrasing mengubah teks dan improve score (AI harus di-mock)
    - Test agent bisa akses endpoint saat workflow aktif dan saat percakapan bebas (dengan/tanpa metadata workflow)
    - File: `src/app/api/refrasa/__tests__/route.test.ts`
  - [ ] 1.2 Update scoring formula di linter
    - Ubah dari `100 - (issues.length * 10)` ke `100 - (CRITICAL * 15) - (WARNING * 5)`
    - Pastikan minimum score = 0
    - File: `src/tools/bahasa_style/modules/linter.ts`
  - [ ] 1.3 Buat type definitions untuk API contract
    - Export RefrasaRequest, RefrasaResponse interface
    - Re-export ValidationIssue, IssueType dari bahasa_style
    - File: `src/lib/refrasa/types.ts`
  - [ ] 1.4 Buat Zod schema untuk request validation
    - Schema untuk mode: 'full' | 'selection'
    - Schema untuk content (required string, non-empty)
    - Schema untuk context (optional string)
    - Jika pakai flag validate-only, tambahkan field boolean di schema
    - File: `src/lib/refrasa/schemas.ts`
  - [ ] 1.5 Buat API route POST /api/refrasa
    - Validasi request dengan Zod schema
    - Panggil BahasaStyle.validate() untuk analisis
    - Jika ada issues, panggil AI untuk refrasa
    - Validasi ulang hasil refrasa
    - Return response sesuai contract
    - Wajib auth; jika `artifactId` ada, cek ownership
    - Sediakan jalur validasi-only untuk skor (endpoint terpisah atau flag)
    - Pastikan bisa dipanggil agent di semua konteks (workflow aktif maupun percakapan bebas)
    - File: `src/app/api/refrasa/route.ts`
  - [ ] 1.6 Implementasi AI refrasing logic
    - Gunakan pattern try-catch dengan getGatewayModel() primary dan getOpenRouterModel() fallback
    - Gunakan `buildRefrasaPrompt()` dari Task 0.5 untuk generate prompt
    - Include enriched rules examples dalam prompt
    - Gunakan generateText dari Vercel AI SDK
    - File: `src/lib/refrasa/ai-refrasa.ts`
  - [ ] 1.7 Pastikan API tests pass
    - Jalankan HANYA tests yang ditulis di 1.1
    - Verifikasi semua response sesuai contract

**Acceptance Criteria:**
- Tests dari 1.1 pass (4-6 tests)
- Scoring formula menggunakan weighted calculation
- API menerima request dan return response sesuai contract
- AI refrasing berfungsi dengan fallback mechanism

---

### Frontend Components Layer

#### Task Group 2: UI Components untuk Refrasa
**Dependencies:** Task Group 1
**Kompleksitas:** Medium

- [ ] 2.0 Complete UI components untuk refrasa
  - [ ] 2.1 Tulis 4-6 focused tests untuk UI components
    - Test RefrasaScoreBadge render dengan color coding
    - Test RefrasaButton disabled state
    - Test RefrasaConfirmDialog menampilkan before/after
    - Test apply changes callback dipanggil
    - File: `src/components/refrasa/__tests__/components.test.tsx`
  - [ ] 2.2 Buat RefrasaScoreBadge component
    - Props: score (number), className (optional)
    - Color coding: hijau (80-100), kuning (60-79), merah (<60)
    - Format: "Skor: {value}"
    - Gunakan icon sebagai indikator tambahan (CheckCircle, AlertCircle, XCircle)
    - File: `src/components/refrasa/RefrasaScoreBadge.tsx`
  - [ ] 2.3 Buat RefrasaButton component
    - Props: onClick, disabled, isLoading
    - Icon: WandSparkles dari lucide-react
    - Loading state dengan Loader2Icon
    - Disabled state styling
    - File: `src/components/refrasa/RefrasaButton.tsx`
  - [ ] 2.4 Buat RefrasaConfirmDialog component
    - Props: open, onOpenChange, originalData, refrasadData, onAccept, onCancel
    - Layout side-by-side untuk before/after comparison
    - Score comparison visual (misal: "45 -> 92")
    - List issues dengan severity color coding
    - Tombol "Terima Perubahan" dan "Batal"
    - Pattern dari VersionHistoryDialog.tsx
    - File: `src/components/refrasa/RefrasaConfirmDialog.tsx`
  - [ ] 2.5 Buat RefrasaIssueItem component
    - Props: issue (ValidationIssue)
    - CRITICAL: background merah/pink
    - WARNING: background kuning
    - Tooltip dengan detail message dan suggestion
    - File: `src/components/refrasa/RefrasaIssueItem.tsx`
  - [ ] 2.6 Buat index.ts untuk export components
    - Export semua components dari satu entry point
    - File: `src/components/refrasa/index.ts`
  - [ ] 2.7 Pastikan component tests pass
    - Jalankan HANYA tests yang ditulis di 2.1
    - Verifikasi rendering dan interactions

**Acceptance Criteria:**
- Tests dari 2.1 pass (4-6 tests)
- Components render dengan styling yang benar
- Score badge menampilkan color coding sesuai range
- Dialog menampilkan comparison dengan jelas

---

#### Task Group 3: Context Menu untuk Text Selection
**Dependencies:** Task Group 2
**Kompleksitas:** Medium

- [ ] 3.0 Complete context menu untuk text selection refrasa
  - [ ] 3.1 Tulis 2-4 focused tests untuk context menu
    - Test menu muncul saat ada text selection
    - Test menu item "Refrasa seleksi ini" trigger callback dengan selected text
    - File: `src/components/refrasa/__tests__/context-menu.test.tsx`
  - [ ] 3.2 Buat custom hook useTextSelection
    - Track selected text dalam artifact content
    - Return: selectedText, selectionRange, clearSelection
    - Handle mouse up events untuk capture selection
    - File: `src/lib/hooks/useTextSelection.ts`
  - [ ] 3.3 Buat RefrasaContextMenu component
    - Gunakan Radix UI ContextMenu (sudah ada di src/components/ui/context-menu.tsx)
    - Trigger: artifact content area
    - Menu item: "Refrasa seleksi ini" dengan icon WandSparkles
    - Disabled jika tidak ada selection
    - Props: children, onRefrasaSelection(text, context)
    - File: `src/components/refrasa/RefrasaContextMenu.tsx`
  - [ ] 3.4 Pastikan context menu tests pass
    - Jalankan HANYA tests yang ditulis di 3.1

**Acceptance Criteria:**
- Tests dari 3.1 pass (2-4 tests)
- Context menu muncul dengan right-click
- Selection text dikirim ke callback dengan benar

---

### Integration Layer

#### Task Group 4: Integrasi ke ArtifactViewer
**Dependencies:** Task Groups 1, 2, 3
**Kompleksitas:** Kompleks

- [ ] 4.0 Complete integrasi refrasa ke ArtifactViewer
  - [ ] 4.1 Tulis 4-6 focused tests untuk integrasi
    - Test score badge muncul di header
    - Test tombol Refrasa muncul di footer toolbar
    - Test flow: klik Refrasa -> loading -> dialog -> apply
    - Test selection refrasa flow
    - File: `src/components/chat/__tests__/artifact-refrasa.test.tsx`
  - [ ] 4.2 Buat custom hook useRefrasa
    - State management: isLoading, dialogOpen, refrasaResult
    - Method: triggerFullRefrasa(content), triggerSelectionRefrasa(text, context)
    - Handle API call ke /api/refrasa
    - File: `src/lib/hooks/useRefrasa.ts`
  - [ ] 4.3 Buat custom hook useArtifactScore
    - Kalkulasi score saat artifact di-load (via jalur validasi-only, tanpa AI)
    - State: score, isCalculating
    - Auto-refresh setelah refrasa applied
    - File: `src/lib/hooks/useArtifactScore.ts`
  - [ ] 4.4 Integrasi RefrasaScoreBadge ke ArtifactViewer header
    - Posisi: setelah badge type artifact
    - Tampilkan saat artifact loaded dan score tersedia
    - File: `src/components/chat/ArtifactViewer.tsx` (modifikasi)
  - [ ] 4.5 Integrasi RefrasaButton ke ArtifactViewer footer toolbar
    - Posisi: sebelum tombol "Salin"
    - Disabled: saat artifact null, loading, atau isEditing
    - Loading state saat proses refrasa
    - File: `src/components/chat/ArtifactViewer.tsx` (modifikasi)
  - [ ] 4.6 Integrasi RefrasaContextMenu ke artifact content area
    - Wrap content area dengan RefrasaContextMenu
    - Pass onRefrasaSelection handler
    - File: `src/components/chat/ArtifactViewer.tsx` (modifikasi)
  - [ ] 4.7 Implementasi apply changes flow
    - Gunakan existing mutation api.artifacts.update
    - Mode full: replace seluruh content
    - Mode selection: merge dengan text asli
    - Update score badge setelah save
    - Toast notification sukses
    - File: `src/components/chat/ArtifactViewer.tsx` (modifikasi)
  - [ ] 4.8 Integrasi RefrasaConfirmDialog
    - Tampilkan dialog setelah API response diterima
    - Jika needsRefrasa = false, tampilkan toast "Tulisan sudah bagus!"
    - Jika needsRefrasa = true, tampilkan dialog comparison
    - File: `src/components/chat/ArtifactViewer.tsx` (modifikasi)
  - [ ] 4.9 Pastikan integration tests pass
    - Jalankan HANYA tests yang ditulis di 4.1

**Acceptance Criteria:**
- Tests dari 4.1 pass (4-6 tests)
- Score badge muncul dan update dengan benar
- Tombol Refrasa berfungsi untuk full content
- Context menu berfungsi untuk selection
- Dialog comparison tampil dengan benar
- Apply changes menyimpan ke artifact dengan version increment

---

### Testing & QA Layer

#### Task Group 5: Review Tests dan Fill Critical Gaps
**Dependencies:** Task Groups 1-4
**Kompleksitas:** Sederhana

- [ ] 5.0 Review existing tests dan fill critical gaps
  - [ ] 5.1 Review tests dari Task Groups 1-4
    - Review 4-6 tests dari Task 1.1 (API layer)
    - Review 4-6 tests dari Task 2.1 (UI components)
    - Review 2-4 tests dari Task 3.1 (context menu)
    - Review 4-6 tests dari Task 4.1 (integration)
    - Total existing: sekitar 14-22 tests
  - [ ] 5.2 Analisis coverage gaps untuk fitur refrasa
    - Identifikasi critical workflows yang belum ter-test
    - Fokus HANYA pada gaps fitur ini, bukan seluruh aplikasi
    - Prioritaskan end-to-end flows
  - [ ] 5.3 Tulis maksimal 8 additional tests jika diperlukan
    - Focus pada integration points yang belum covered
    - Test error handling untuk API failures
    - Test edge case: artifact tanpa content
    - Jika belum ada, tambah test verifikasi akses agent lintas konteks
    - JANGAN tulis comprehensive coverage
    - File: `src/components/refrasa/__tests__/additional.test.tsx` atau files yang relevan
  - [ ] 5.4 Jalankan semua feature-specific tests
    - Run tests dari 1.1, 2.1, 3.1, 4.1, dan 5.3
    - Total expected: sekitar 22-30 tests
    - JANGAN run entire test suite

**Acceptance Criteria:**
- Semua feature-specific tests pass (22-30 tests)
- Critical user workflows untuk refrasa ter-cover
- Tidak lebih dari 8 additional tests ditambahkan

---

## Execution Order

Recommended implementation sequence:

```
0. Foundation Layer (Task Group 0) ← NEW, HARUS PERTAMA
   - Update type definitions untuk enriched rules
   - Enrich existing rules dengan examples
   - Buat AI prompt template
   - Verifikasi backward compatibility

1. Backend Layer (Task Group 1)
   - Update linter scoring
   - Create API types dan schemas
   - Build API route
   - Implement AI refrasing (gunakan prompt template dari Task 0)

2. Frontend Components (Task Group 2)
   - Create individual UI components
   - Score badge, button, dialog
   - Issue highlighting

3. Context Menu (Task Group 3)
   - Text selection hook
   - Context menu component

4. Integration (Task Group 4)
   - Custom hooks untuk state management
   - Integrate ke ArtifactViewer
   - Wire up all flows

5. Testing & QA (Task Group 5)
   - Review dan gap analysis
   - Fill critical gaps only
```

---

## File Structure Summary

```
src/
├── app/api/refrasa/
│   ├── route.ts                    # API endpoint
│   └── __tests__/
│       └── route.test.ts           # API tests
├── components/
│   ├── chat/
│   │   ├── ArtifactViewer.tsx      # Modifikasi untuk integrasi
│   │   └── __tests__/
│   │       └── artifact-refrasa.test.tsx
│   └── refrasa/
│       ├── index.ts                # Export entry point
│       ├── RefrasaButton.tsx
│       ├── RefrasaScoreBadge.tsx
│       ├── RefrasaConfirmDialog.tsx
│       ├── RefrasaIssueItem.tsx
│       ├── RefrasaContextMenu.tsx
│       └── __tests__/
│           ├── components.test.tsx
│           └── context-menu.test.tsx
├── lib/
│   ├── refrasa/
│   │   ├── types.ts                # Type definitions
│   │   ├── schemas.ts              # Zod schemas
│   │   ├── ai-refrasa.ts           # AI refrasing logic
│   │   └── prompt-template.ts      # AI prompt template (NEW - Task 0.5)
│   └── hooks/
│       ├── useRefrasa.ts
│       ├── useArtifactScore.ts
│       └── useTextSelection.ts
└── tools/bahasa_style/
    ├── core/
    │   ├── types.ts                # Enriched type definitions (MODIFIED - Task 0.1, 0.13)
    │   └── definitions.ts          # Enriched rules + AI patterns (MODIFIED - Task 0.2, 0.3, 0.4, 0.11)
    └── modules/
        ├── linter.ts               # Modifikasi scoring formula + integration (MODIFIED - Task 0.12)
        ├── vocabulary.ts           # NEW: TTR & vocabulary diversity (Task 0.7)
        ├── ngram.ts                # NEW: N-gram repetition detection (Task 0.8)
        └── paragraph.ts            # NEW: Paragraph variance & hedging (Task 0.9, 0.10)
```

---

## Technical Notes

### Enriched Rules Strategy
- Rules di-enrich dengan examples dari `makalah-style-constitution.md`
- Setiap rule punya `transformationHint` untuk AI guidance
- Examples format: `{ bad: string, good: string, explanation?: string }`
- Backward compatible: existing linter logic tidak berubah
- Soft limits: FORBIDDEN_PATTERNS max 15-20, BUDGETED_WORDS max 20-25

### AI Refrasing Strategy
- Primary: Vercel AI Gateway via `getGatewayModel()`
- Fallback: OpenRouter via `getOpenRouterModel()`
- Use `generateText` bukan streaming untuk refrasa
- Prompt dibangun dengan `buildRefrasaPrompt()` yang include:
  - Enriched rules dengan examples
  - Detected issues dan transformationHints
  - Filosofi dari constitution (induktif, tidak kaku)
- Prompt max ~2000 tokens (excluding input text)

### Bundle Size Consideration
- `natural` library HANYA di API route (server-side)
- Client bundle TIDAK import `natural`
- Score dikirim via API response, bukan kalkulasi di client

### Existing Patterns to Follow
- Dialog: `VersionHistoryDialog.tsx`
- Button dengan loading: `ArtifactViewer.tsx`
- API route: `src/app/api/chat/route.ts`
- Context menu: `src/components/ui/context-menu.tsx` (Radix UI)

### Accessibility Requirements
- Score badge: kombinasi warna DAN icon
- Keyboard navigation untuk dialog dan buttons
- ARIA labels yang tepat untuk semua interactive elements

### Enhanced Naturalness Metrics Strategy

Tool ini menggunakan pendekatan multi-layer untuk menghasilkan tulisan yang natural:

**Layer 1: Pattern Detection (Existing)**
- Forbidden patterns (Indonenglish, connectors)
- Budgeted words (crutch words)
- Sentence variance (burstiness)

**Layer 2: Vocabulary Analysis (NEW)**
- Type-Token Ratio (TTR) untuk vocabulary diversity
- Threshold: WARNING < 0.40, CRITICAL < 0.30
- Stop words excluded dari perhitungan

**Layer 3: Repetition Analysis (NEW)**
- N-gram (bigram/trigram) repetition detection
- AI-specific phrase patterns ("dalam konteks ini", etc)
- Threshold: > 2x occurrence = WARNING

**Layer 4: Structure Analysis (NEW)**
- Paragraph length variance
- Hedging/certainty balance per paragraf
- First-person encouragement (INFO level)

**Scoring Impact:**
- Layer 1: CRITICAL = -15, WARNING = -5 (existing)
- Layer 2-4: WARNING = -5 (new metrics are WARNING-level only in v1)

**Why This Works:**
AI text tends to have: low TTR, repetitive phrases, uniform structure, overly certain tone. By detecting and flagging these patterns, we encourage more human-like writing.
