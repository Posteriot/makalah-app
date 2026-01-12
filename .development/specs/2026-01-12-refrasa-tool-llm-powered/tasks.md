# Task Breakdown: Refrasa Tool - LLM Powered

## Overview
Total Tasks: 40 sub-tasks across 6 task groups

Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai LLM.

**Dual Goal:**
1. **Humanize Writing Standard** - Standar penulisan akademis yang natural dan manusiawi
2. **Target Anti-Deteksi LLM (upaya terbaik)** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos detektor)

**Arsitektur: Two-Layer Evaluation**
- **Layer 1: Core Naturalness Criteria (Hardcoded)** - Metrik anti-deteksi di prompt builder
- **Layer 2: Style Constitution (Editable)** - Style rules yang bisa dikustomisasi admin

**LLM Limitation Note:**
- LLM buruk dalam counting → gunakan instruksi KUALITATIF, bukan kuantitatif

## Task List

### Database Layer

#### Task Group 0: Style Constitution Schema & CRUD
**Dependencies:** None

- [ ] 0.0 Complete database layer untuk styleConstitutions
  - [ ] 0.1 Write 3-5 focused tests untuk styleConstitutions CRUD
    - Test getActive returns active constitution
    - Test create constitution with versioning
    - Test activate/deactivate toggle (single-active constraint)
    - Test update creates new version (immutable pattern)
  - [ ] 0.2 Add styleConstitutions table ke `convex/schema.ts`
    - Fields: name, content, description, version, isActive, parentId, rootId, createdBy, createdAt, updatedAt
    - Indexes: by_active, by_root, by_createdAt
    - Copy pattern dari systemPrompts table definition
  - [ ] 0.3 Create `convex/styleConstitutions.ts` dengan CRUD functions
    - Copy pattern dari `convex/systemPrompts.ts`
    - Queries: getActive (no auth), list (admin), getVersionHistory (admin), getById (admin)
    - Mutations: create, update (new version), activate, deactivate, delete, deleteChain
    - Permission check dengan `requireRole(db, userId, "admin")`
  - [ ] 0.4 Create seed migration `convex/migrations/seedDefaultStyleConstitution.ts`
    - Source content dari `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
    - Auto-activate setelah seed
    - Pattern sama seperti `seedDefaultSystemPrompt.ts`
  - [ ] 0.5 Ensure database layer tests pass
    - Run ONLY tests dari 0.1
    - Verify migration runs successfully
    - Verify single-active constraint works

**Acceptance Criteria:**
- Tests dari 0.1 pass
- styleConstitutions table terdefinisi di schema
- CRUD functions tersedia dan mengikuti versioning pattern
- Migration seed berhasil dengan default constitution aktif

**Files to Create:**
```
convex/
├── styleConstitutions.ts
└── migrations/
    └── seedDefaultStyleConstitution.ts
```

**Files to Modify:**
```
convex/schema.ts  # Add styleConstitutions table
```

---

### API Layer

#### Task Group 1: POST /api/refrasa Endpoint
**Dependencies:** Task Group 0

- [ ] 1.0 Complete API endpoint untuk refrasa
  - [ ] 1.1 Write 3-5 focused tests untuk /api/refrasa endpoint
    - Test successful refrasa returns structured output (issues with category, refrasedText)
    - Test auth required (401 for unauthenticated)
    - Test validation (content required, minimum length)
    - Test fallback to OpenRouter when Gateway fails
    - Test constitution fallback (proceed with Layer 1 only if no active constitution)
  - [ ] 1.2 Create type definitions di `src/lib/refrasa/types.ts`
    - RefrasaIssueType: union type for all issue types
    - RefrasaIssueCategory: 'naturalness' | 'style'
    - RefrasaIssue: { type, category, message, severity, suggestion? }
    - RefrasaRequest: { content, artifactId? }
    - RefrasaResponse: { issues: RefrasaIssue[], refrasedText: string }
    - **Note:** Score dihapus karena self-grading bias
  - [ ] 1.3 Create Zod schemas di `src/lib/refrasa/schemas.ts`
    - RefrasaIssueTypeSchema: enum of all issue types
    - RefrasaIssueCategorySchema: 'naturalness' | 'style'
    - RefrasaIssueSchema: type, category, message, severity (info|warning|critical), suggestion?
    - RefrasaOutputSchema: issues[], refrasedText (tanpa score)
    - RequestBodySchema: content (min 50 chars), artifactId?
  - [ ] 1.4 Create prompt builder dengan TWO-LAYER structure di `src/lib/refrasa/prompt-builder.ts`
    - Function buildRefrasaPrompt(constitution: string, content: string)
    - **LAYER 1 (Hardcoded): Core Naturalness Criteria - QUALITATIVE INSTRUCTIONS**
      - ⚠️ PENTING: Gunakan instruksi KUALITATIF, bukan kuantitatif (LLM buruk dalam counting)
      - Vocabulary Diversity:
        - ❌ JANGAN: "No word >3x per 500 words"
        - ✅ GUNAKAN: "Strictly avoid repeating non-technical vocabulary close together. Use synonyms aggressively for common words."
      - Sentence Pattern Variance:
        - ❌ JANGAN: "Mix lengths (short <10, medium 10-20, long >20 words)"
        - ✅ GUNAKAN: "Vary sentence structures naturally. Mix short punchy sentences with longer explanatory ones. Avoid starting consecutive sentences with the same word or phrase."
      - Paragraph Rhythm:
        - ❌ JANGAN: "Vary 2-6 sentences per paragraph"
        - ✅ GUNAKAN: "Create natural paragraph flow. Some paragraphs should be brief for emphasis, others more developed for detailed explanation."
      - Hedging Balance:
        - ✅ GUNAKAN: "Include appropriate academic hedging language where claims are not absolute. Use markers like 'cenderung', 'kemungkinan', 'tampaknya', 'dapat diargumentasikan'."
      - Burstiness:
        - ✅ GUNAKAN: "Write with variable complexity like humans do. Mix technical precision with accessible explanations. Maintain academic formality throughout."
    - **ACADEMIC ESCAPE CLAUSE (CRITICAL):**
      ```
      SELALU PERTAHANKAN:
      - Technical terminology consistency (istilah teknis TIDAK diganti sinonim)
      - Academic rigor and formality
      - Markdown formatting structure (heading, list, bold/italic, link, code block, blockquote)
      - Citation/reference formatting (e.g., "Menurut Smith (2020)...")
      - Citation keys ([@...], [1], [2])
      - Discipline-specific conventions
      - Proper nouns and named entities
      ```
    - **Guidance tambahan:** Jika ragu apakah kata ini istilah teknis atau bukan, pilih untuk MENGULANG. Konsistensi > variasi.
    - **LAYER 2 (Dynamic): Style Constitution**
      - Injected dari database
      - Additional style guidelines
    - Output format specification dengan categorized issues
    - **Instruksi bahasa output:** issues/suggestion/refrasedText harus Bahasa Indonesia (kecuali istilah teknis/rujukan)
    - **CRITICAL: Layer 1 TIDAK BISA di-override oleh constitution**
  - [ ] 1.5 Create educational loading messages di `src/lib/refrasa/loading-messages.ts`
    - Array of rotating messages untuk loading UI
    - Messages menjelaskan proses secara edukatif:
      - "Menganalisis pola kalimat..."
      - "Memeriksa variasi kosa kata..."
      - "Menyesuaikan ritme paragraf..."
      - "Memperbaiki gaya penulisan..."
      - "Menyeimbangkan hedging akademik..."
      - "Memastikan konsistensi terminologi..."
    - Export constant LOADING_MESSAGES array
    - Export LOADING_ROTATION_INTERVAL (2-3 seconds)
  - [ ] 1.6 Create API route `src/app/api/refrasa/route.ts`
    - Auth: Clerk authentication required (getAuth dari @clerk/nextjs/server)
    - Request validation dengan Zod schema
    - Fetch active Style Constitution via `fetchQuery(api.styleConstitutions.getActive)`
    - **Constitution fallback:** Jika tidak ada active constitution, proceed dengan Layer 1 only
    - Build two-layer prompt dengan buildRefrasaPrompt() (constitution optional)
    - LLM call dengan `generateObject` dari ai package
    - Primary provider (getGatewayModel) dengan try-catch fallback (getOpenRouterModel)
    - Return structured response: `{ issues, refrasedText }`
    - Set `export const maxDuration = 300` (Vercel Functions)
  - [ ] 1.7 Ensure API layer tests pass
    - Run ONLY tests dari 1.1
    - Verify endpoint returns correct schema with categorized issues
    - Verify auth dan validation bekerja

**Acceptance Criteria:**
- Tests dari 1.1 pass
- Endpoint returns `{ issues: RefrasaIssue[], refrasedText: string }`
- Auth required dan validation enforced
- Fallback ke OpenRouter bekerja saat Gateway fail
- Constitution fallback works (Layer 1 only if no active constitution)
- **Issues properly categorized sebagai 'naturalness' atau 'style'**
- **Bahasa output:** issues/suggestion/refrasedText Bahasa Indonesia (kecuali istilah teknis/rujukan)
- `maxDuration = 300` diset di route

**Files to Create:**
```
src/
├── lib/
│   └── refrasa/
│       ├── types.ts
│       ├── schemas.ts
│       ├── prompt-builder.ts
│       ├── loading-messages.ts    # Educational loading messages array
│       └── index.ts
└── app/
    └── api/
        └── refrasa/
            └── route.ts
```

---

### Admin UI Layer

#### Task Group 2: Style Constitution Manager
**Dependencies:** Task Group 0

- [ ] 2.0 Complete Admin UI untuk Style Constitution
  - [ ] 2.1 Write 2-4 focused tests untuk StyleConstitutionManager
    - Test renders list of constitutions
    - Test create new constitution flow
    - Test activate/deactivate toggle
  - [ ] 2.2 Create `src/components/admin/StyleConstitutionManager.tsx`
    - Copy pattern dari `SystemPromptsManager.tsx`
    - Table dengan columns: Name, Version, Status (Active badge), Actions
    - Action buttons: Edit (creates new version), History, Activate/Deactivate, Delete
    - Loading state dengan skeleton animation
    - Empty state message
    - **Add note: "Constitution hanya untuk style rules. Naturalness criteria hardcoded."**
  - [ ] 2.3 Create form dialog untuk create/edit
    - Reuse AlertDialog pattern dari SystemPromptsManager
    - Fields: name (text input), content (textarea), description (optional textarea)
    - Validation: name dan content required
    - Submit handler calls create/update mutation
  - [ ] 2.4 Create version history dialog
    - Reuse VersionHistoryDialog pattern
    - List versions dengan creator email dan timestamp
    - Option untuk activate version tertentu
  - [ ] 2.5 Add tab "Style Constitution" di Admin Panel layout
    - Modify admin layout/page untuk include new tab
    - Tab ordering: System Prompts, AI Config, Style Constitution, System Health
  - [ ] 2.6 Ensure Admin UI tests pass
    - Run ONLY tests dari 2.1
    - Verify CRUD flows work correctly

**Acceptance Criteria:**
- Tests dari 2.1 pass
- Tab "Style Constitution" tersedia di admin panel
- CRUD operations (create, edit, view history, activate, delete) berfungsi
- UI consistent dengan SystemPromptsManager

**Files to Create:**
```
src/components/admin/
├── StyleConstitutionManager.tsx
└── StyleConstitutionFormDialog.tsx (optional, bisa inline di manager)
```

**Files to Modify:**
```
src/app/(dashboard)/dashboard/page.tsx  # Add tab atau navigation
```

---

### User UI Layer

#### Task Group 3: Refrasa UI Components
**Dependencies:** Task Group 1

- [ ] 3.0 Complete User-facing UI components
  - [ ] 3.1 Write 3-5 focused tests untuk Refrasa UI components
    - Test RefrasaButton disabled states (isEditing, null artifact, short content)
    - Test RefrasaConfirmDialog renders before/after comparison
    - Test "Terapkan" button triggers artifact update
    - Test issues grouped by category (naturalness/style)
  - [ ] 3.2 Create `src/components/refrasa/RefrasaButton.tsx`
    - Icon: WandSparkles dari lucide-react
    - Props: onClick, disabled, isLoading
    - Disabled conditions: isEditing, artifact === null, content.length < 50
    - Loading state: Loader2 spinning icon
    - Tooltip dengan disabled reason
    - Tooltip peringatan saat jumlah kata > 2.000 (tanpa hard block)
  - [ ] 3.3 Create `src/components/refrasa/RefrasaIssueItem.tsx`
    - Props: issue (RefrasaIssue type dengan category)
    - Badge warna berdasarkan severity: info=blue, warning=yellow, critical=red
    - **Category indicator: naturalness=purple badge, style=teal badge**
    - Display type, message, dan suggestion (if exists)
  - [ ] 3.4 Create `src/components/refrasa/RefrasaConfirmDialog.tsx`
    - Dialog dari shadcn/ui dengan max-w-3xl
    - Side-by-side layout: CSS grid dengan gap-4
    - Left panel (Original): content dengan issues list
    - Panel kanan (hasil refrasa): refrasedText (bersih)
    - Improvement indicator: "X masalah terdeteksi → Tinjau hasil perbaikan"
    - **Collapsible issues list GROUPED by category:**
      - "Naturalness Issues" section
      - "Style Issues" section
    - Buttons: "Terapkan" (primary) dan "Batal" (outline)
    - Responsive: stack vertikal pada mobile (md:grid-cols-2)
  - [ ] 3.5 Create `src/components/refrasa/RefrasaLoadingIndicator.tsx`
    - Component untuk educational loading states
    - Import LOADING_MESSAGES dan LOADING_ROTATION_INTERVAL dari loading-messages.ts
    - useState untuk currentMessageIndex
    - useEffect dengan interval untuk rotate messages (2-3 detik per message)
    - Centered layout dengan Loader2 spinning icon
    - Display rotating educational message di bawah spinner
    - Clean up interval on unmount
  - [ ] 3.6 Create `src/lib/hooks/useRefrasa.ts`
    - State: isLoading, result ({ issues, refrasedText } | null), error
    - Function: analyzeAndRefrasa(content: string, artifactId?: string)
    - Calls POST /api/refrasa
    - Handles loading dan error states
    - Returns issueCount untuk UI indicator
  - [ ] 3.7 Create barrel export `src/components/refrasa/index.ts`
    - Export all components
  - [ ] 3.8 Ensure User UI tests pass
    - Run ONLY tests dari 3.1
    - Verify disabled states dan dialog render correctly
    - Verify issues grouped by category

**Acceptance Criteria:**
- Tests dari 3.1 pass
- RefrasaButton shows correct disabled states dengan tooltip
- Tooltip peringatan muncul saat jumlah kata > 2.000 (tanpa hard block)
- Dialog shows side-by-side comparison (original + issues vs refrasedText clean)
- Improvement indicator shows issue count (bukan score)
- **Issues list grouped by category (naturalness/style) untuk transparency**
- Empty issues state ditangani dengan aman (UI tetap informatif)
- Responsive design works

**Files to Create:**
```
src/
├── components/
│   └── refrasa/
│       ├── RefrasaButton.tsx
│       ├── RefrasaIssueItem.tsx
│       ├── RefrasaConfirmDialog.tsx
│       ├── RefrasaLoadingIndicator.tsx  # Educational loading states
│       └── index.ts
└── lib/
    └── hooks/
        └── useRefrasa.ts
```

---

### Integration Layer

#### Task Group 4: ArtifactViewer Integration
**Dependencies:** Task Groups 1, 3

- [ ] 4.0 Integrate Refrasa ke ArtifactViewer
  - [ ] 4.1 Write 3-4 focused tests untuk integration
    - Test Refrasa button appears di toolbar
    - Test context menu appears on right-click
    - Test click triggers dialog open
    - Test apply updates artifact dan closes dialog
  - [ ] 4.2 Add Refrasa button ke ArtifactViewer toolbar
    - Location: sejajar dengan Edit, Download, Copy buttons (line 376-410)
    - Use RefrasaButton component
    - Disabled conditions: isEditing, artifact === null, artifact.content.length < 50
    - Hitung jumlah kata untuk tooltip peringatan (> 2.000 kata)
  - [ ] 4.3 Add context menu untuk right-click refrasa
    - Wrap artifact content area dengan ContextMenu dari Radix UI
    - Menu item "Refrasa" dengan icon WandSparkles
    - Trigger refrasa pada seluruh content (bukan selection)
    - Import dari `src/components/ui/context-menu.tsx`
  - [ ] 4.4 Add state management untuk refrasa flow
    - State: showRefrasaDialog, refrasaResult
    - Trigger useRefrasa hook saat button/context menu clicked
    - Show RefrasaConfirmDialog dengan result
  - [ ] 4.5 Implement apply changes flow
    - Saat user klik "Terapkan" di dialog:
    - Call `api.artifacts.update` mutation dengan refrasedText
    - Artifact versioning: creates new version (immutable pattern)
    - Close dialog setelah sukses
    - Toast success: "Tulisan berhasil diperbaiki ke v{version}"
  - [ ] 4.6 Add educational loading states (FR-11)
    - Use RefrasaLoadingIndicator component saat API call in progress
    - Tujuan: User tidak bosan menunggu proses yang bisa 10-20+ detik untuk teks panjang
    - Show rotating educational messages:
      - "Menganalisis pola kalimat..."
      - "Memeriksa variasi kosa kata..."
      - "Menyesuaikan ritme paragraf..."
      - "Memperbaiki gaya penulisan..."
    - Disable button saat loading
    - Error toast jika API fails
  - [ ] 4.7 Ensure integration tests pass
    - Run ONLY tests dari 4.1
    - Verify end-to-end flow works

**Acceptance Criteria:**
- Tests dari 4.1 pass
- Tombol Refrasa visible di ArtifactViewer toolbar
- Context menu dengan "Refrasa" muncul saat right-click di content area
- Click (button atau context menu) opens dialog dengan before/after comparison
- "Terapkan" creates new artifact version
- Toast notification confirms success

**Files to Modify:**
```
src/components/chat/ArtifactViewer.tsx
```

---

### Testing & QA

#### Task Group 5: Test Review & Gap Analysis
**Dependencies:** Task Groups 0-4

- [ ] 5.0 Review existing tests and fill critical gaps only
  - [ ] 5.1 Review tests dari Task Groups 0-4
    - Review tests dari database layer (Task 0.1): ~4 tests
    - Review tests dari API layer (Task 1.1): ~5 tests
    - Review tests dari Admin UI (Task 2.1): ~3 tests
    - Review tests dari User UI (Task 3.1): ~4 tests
    - Review tests dari Integration (Task 4.1): ~4 tests
    - Total existing tests: approximately 20 tests
  - [ ] 5.2 Analyze test coverage gaps untuk Refrasa feature only
    - Identify critical user workflows yang lack test coverage
    - Focus ONLY on gaps related to Refrasa feature
    - Prioritize end-to-end workflows
    - **Verify categorization works saat issues muncul**
  - [ ] 5.3 Write up to 8 additional strategic tests maximum
    - E2E test: Full flow dari button click sampai artifact update
    - Integration test: LLM provider fallback scenario
    - Edge case: Constitution not found (fallback behavior)
    - Edge case: LLM returns invalid schema
    - Admin flow: Create constitution -> activate -> verify used by API
    - **Test: UI handle empty issues list tanpa error**
    - **Test: Markdown structure preserved setelah refrasa**
    - Do NOT write exhaustive tests untuk semua scenarios
  - [ ] 5.4 Run feature-specific tests only
    - Run ONLY tests related to Refrasa feature
    - Expected total: approximately 22-28 tests maximum
    - Do NOT run entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (~22-28 tests total)
- Critical user workflows untuk Refrasa feature covered
- No more than 8 additional tests added
- Testing focused exclusively on Refrasa feature
- **Naturalness criteria evaluation verified**

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 0: Database Schema** - Foundation layer
   - Schema definition
   - CRUD functions
   - Seed migration

2. **Task Group 1: API Endpoint** - Core business logic
   - Types dan schemas (with category support)
   - **Prompt builder dengan two-layer structure (CRITICAL)**
   - Route handler dengan fallback

3. **Task Group 2: Admin UI** - Admin management
   - StyleConstitutionManager
   - Form dialogs
   - Tab integration

4. **Task Group 3: User UI Components** - User-facing UI
   - RefrasaButton
   - RefrasaConfirmDialog (with categorized issues)
   - useRefrasa hook

5. **Task Group 4: Integration** - Connect everything
   - ArtifactViewer integration
   - Apply changes flow
   - Loading states

6. **Task Group 5: Testing** - Quality assurance
   - Review existing tests
   - Fill critical gaps
   - Verify end-to-end
   - **Verifikasi kriteria naturalness selalu dievaluasi**

---

## File Structure Summary

```
convex/
├── schema.ts                              # Modified: add styleConstitutions
├── styleConstitutions.ts                  # New: CRUD functions
└── migrations/
    └── seedDefaultStyleConstitution.ts    # New: seed migration

src/
├── app/
│   └── api/
│       └── refrasa/
│           └── route.ts                   # New: API endpoint
├── components/
│   ├── admin/
│   │   └── StyleConstitutionManager.tsx   # New: admin UI
│   ├── chat/
│   │   └── ArtifactViewer.tsx             # Modified: add Refrasa button
│   └── refrasa/
│       ├── RefrasaButton.tsx              # New
│       ├── RefrasaIssueItem.tsx           # New (with category support)
│       ├── RefrasaConfirmDialog.tsx       # New (with grouped issues)
│       ├── RefrasaLoadingIndicator.tsx    # New: educational loading states
│       └── index.ts                       # New: barrel export
└── lib/
    ├── hooks/
    │   └── useRefrasa.ts                  # New: state management hook
    └── refrasa/
        ├── types.ts                       # New: type definitions (with category)
        ├── schemas.ts                     # New: Zod schemas (with category)
        ├── prompt-builder.ts              # New: TWO-LAYER prompt (QUALITATIVE)
        ├── loading-messages.ts            # New: educational loading messages
        └── index.ts                       # New: barrel export
```

---

## Key Patterns to Follow

### Database (Convex)
- Copy `systemPrompts.ts` pattern untuk versioning dan single-active constraint
- Use `requireRole(db, userId, "admin")` untuk permission check
- Indexes: by_active, by_root, by_createdAt

### API Endpoint
- Use `generateObject` dari ai package untuk structured output
- Primary provider dengan try-catch fallback pattern dari `streaming.ts`
- Zod schema untuk request validation dan LLM output parsing
- **Two-layer prompt: Core Naturalness (hardcoded) + Style Constitution (dynamic)**

### Prompt Builder (FR-10 Implementation)
**CRITICAL - Two-Layer Architecture dengan QUALITATIVE Instructions:**

⚠️ **LLM Limitation:** Gunakan instruksi KUALITATIF, bukan kuantitatif (LLM buruk dalam counting)

```
Layer 1 (Hardcoded - CANNOT be overridden):
├── Vocabulary Diversity (QUALITATIVE: "avoid repeating close together")
├── Sentence Pattern Variance (QUALITATIVE: "vary naturally, mix short and long")
├── Paragraph Rhythm (QUALITATIVE: "some brief for emphasis, others developed")
├── Hedging Balance (markers: cenderung, kemungkinan, tampaknya)
└── Burstiness (mix technical precision with accessible explanations)

ACADEMIC ESCAPE CLAUSE:
└── SELALU pertahankan istilah teknis, sitasi, proper nouns

Layer 2 (Dynamic - Admin editable):
└── Style Constitution content
```

### UI Components
- Reuse Dialog, Button, Badge dari shadcn/ui
- Follow existing admin UI patterns dari SystemPromptsManager
- Responsive design dengan Tailwind breakpoints
- **Issues grouped by category (naturalness/style)**

### Integration
- Add button ke existing toolbar pattern di ArtifactViewer
- Use `api.artifacts.update` mutation untuk apply changes
- Toast notifications via sonner

---

## Known Limitations

### 1. "Hardcoded" = Prompt Instructions, Bukan Enforcement
- Core Naturalness Criteria di-hardcode di prompt, tapi tidak ada mekanisme yang memaksa LLM comply
- Mitigasi: Accept limitation untuk v1

### 2. Self-Grading Bias → Score Dihapus
- Score dihapus karena model yang sama analyze + rewrite + re-analyze = bias
    - UI menggunakan issue count sebagai gantinya: "X masalah terdeteksi → Tinjau hasil perbaikan"

### 3. Constitution Fallback
- Jika tidak ada active constitution, proceed dengan Layer 1 only
- Style Constitution adalah enhancement, bukan requirement
