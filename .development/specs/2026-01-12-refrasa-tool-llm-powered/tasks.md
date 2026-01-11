# Task Breakdown: Refrasa Tool - LLM Powered

## Overview
Total Tasks: 37 sub-tasks across 6 task groups

Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai LLM dan dipandu oleh Style Constitution yang editable di admin panel.

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
    - Test successful refrasa returns structured output (score, issues, refrasedText, newScore)
    - Test auth required (401 for unauthenticated)
    - Test validation (content required, minimum length)
    - Test fallback to OpenRouter when Gateway fails
  - [ ] 1.2 Create type definitions di `src/lib/refrasa/types.ts`
    - RefrasaIssue: { type, message, severity, suggestion? }
    - RefrasaRequest: { content, artifactId? }
    - RefrasaResponse: { needsRefrasa, original, refrasad?, mode }
    - OriginalAnalysis: { score }
    - RefrasaResult: { score, issues, refrasedText }
  - [ ] 1.3 Create Zod schemas di `src/lib/refrasa/schemas.ts`
    - RefrasaIssueSchema: type, message, severity (info|warning|critical), suggestion?
    - RefrasaOutputSchema: score (0-100), newScore (0-100), issues[], refrasedText
    - RequestBodySchema: content (min 50 chars), artifactId?
  - [ ] 1.4 Create prompt builder di `src/lib/refrasa/prompt-builder.ts`
    - Function buildRefrasaPrompt(constitution: string, content: string)
    - System prompt dengan constitution sebagai guidelines
    - Task instruction untuk analyze + rephrase
    - Output format specification (JSON structure)
  - [ ] 1.5 Create API route `src/app/api/refrasa/route.ts`
    - Auth: Clerk authentication required (getAuth dari @clerk/nextjs/server)
    - Request validation dengan Zod schema
    - Fetch active Style Constitution via `fetchQuery(api.styleConstitutions.getActive)`
    - LLM call dengan `generateObject` dari ai package
    - Primary provider (getGatewayModel) dengan try-catch fallback (getOpenRouterModel)
    - Return structured response
  - [ ] 1.6 Ensure API layer tests pass
    - Run ONLY tests dari 1.1
    - Verify endpoint returns correct schema
    - Verify auth dan validation bekerja

**Acceptance Criteria:**
- Tests dari 1.1 pass
- Endpoint returns { needsRefrasa, original: { score }, refrasad: { score, issues, refrasedText }, mode: 'full' }
- Auth required dan validation enforced
- Fallback ke OpenRouter bekerja saat Gateway fail

**Files to Create:**
```
src/
├── lib/
│   └── refrasa/
│       ├── types.ts
│       ├── schemas.ts
│       ├── prompt-builder.ts
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
  - [ ] 3.2 Create `src/components/refrasa/RefrasaButton.tsx`
    - Icon: WandSparkles dari lucide-react
    - Props: onClick, disabled, isLoading
    - Disabled conditions: isEditing, artifact === null, content.length < 50
    - Loading state: Loader2 spinning icon
    - Tooltip dengan disabled reason
  - [ ] 3.3 Create `src/components/refrasa/RefrasaIssueItem.tsx`
    - Props: issue (RefrasaIssue type)
    - Badge warna berdasarkan severity: info=blue, warning=yellow, critical=red
    - Display type, message, dan suggestion (if exists)
  - [ ] 3.4 Create `src/components/refrasa/RefrasaConfirmDialog.tsx`
    - Dialog dari shadcn/ui dengan max-w-3xl
    - Side-by-side layout: CSS grid dengan gap-4
    - Left panel (Original): content dengan score badge
    - Right panel (Refrasad): refrasedText dengan newScore badge
    - Score badges: hijau >= 80, kuning 50-79, merah < 50
    - Collapsible issues list (Accordion atau Collapsible)
    - Buttons: "Terapkan" (primary) dan "Batal" (outline)
    - Responsive: stack vertikal pada mobile (md:grid-cols-2)
  - [ ] 3.5 Create `src/lib/hooks/useRefrasa.ts`
    - State: isLoading, result (RefrasaResponse | null), error
    - Function: analyzeAndRefrasa(content: string, artifactId?: string)
    - Calls POST /api/refrasa
    - Handles loading dan error states
  - [ ] 3.6 Create barrel export `src/components/refrasa/index.ts`
    - Export all components
  - [ ] 3.7 Ensure User UI tests pass
    - Run ONLY tests dari 3.1
    - Verify disabled states dan dialog render correctly

**Acceptance Criteria:**
- Tests dari 3.1 pass
- RefrasaButton shows correct disabled states dengan tooltip
- Dialog shows side-by-side comparison dengan score badges
- Issues list collapsible untuk minimize visual noise
- Responsive design works

**Files to Create:**
```
src/
├── components/
│   └── refrasa/
│       ├── RefrasaButton.tsx
│       ├── RefrasaIssueItem.tsx
│       ├── RefrasaConfirmDialog.tsx
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
  - [ ] 4.6 Add loading states
    - Loading spinner saat API call in progress
    - Disable button dan show Loader2
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
    - Review tests dari API layer (Task 1.1): ~4 tests
    - Review tests dari Admin UI (Task 2.1): ~3 tests
    - Review tests dari User UI (Task 3.1): ~4 tests
    - Review tests dari Integration (Task 4.1): ~3 tests
    - Total existing tests: approximately 18 tests
  - [ ] 5.2 Analyze test coverage gaps untuk Refrasa feature only
    - Identify critical user workflows yang lack test coverage
    - Focus ONLY on gaps related to Refrasa feature
    - Prioritize end-to-end workflows
  - [ ] 5.3 Write up to 8 additional strategic tests maximum
    - E2E test: Full flow dari button click sampai artifact update
    - Integration test: LLM provider fallback scenario
    - Edge case: Constitution not found (fallback behavior)
    - Edge case: LLM returns invalid schema
    - Admin flow: Create constitution -> activate -> verify used by API
    - Do NOT write exhaustive tests untuk semua scenarios
  - [ ] 5.4 Run feature-specific tests only
    - Run ONLY tests related to Refrasa feature
    - Expected total: approximately 20-26 tests maximum
    - Do NOT run entire application test suite
    - Verify critical workflows pass

**Acceptance Criteria:**
- All feature-specific tests pass (~20-26 tests total)
- Critical user workflows untuk Refrasa feature covered
- No more than 8 additional tests added
- Testing focused exclusively on Refrasa feature

---

## Execution Order

Recommended implementation sequence:

1. **Task Group 0: Database Schema** - Foundation layer
   - Schema definition
   - CRUD functions
   - Seed migration

2. **Task Group 1: API Endpoint** - Core business logic
   - Types dan schemas
   - Prompt builder
   - Route handler dengan fallback

3. **Task Group 2: Admin UI** - Admin management
   - StyleConstitutionManager
   - Form dialogs
   - Tab integration

4. **Task Group 3: User UI Components** - User-facing UI
   - RefrasaButton
   - RefrasaConfirmDialog
   - useRefrasa hook

5. **Task Group 4: Integration** - Connect everything
   - ArtifactViewer integration
   - Apply changes flow
   - Loading states

6. **Task Group 5: Testing** - Quality assurance
   - Review existing tests
   - Fill critical gaps
   - Verify end-to-end

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
│       ├── RefrasaIssueItem.tsx           # New
│       ├── RefrasaConfirmDialog.tsx       # New
│       └── index.ts                       # New: barrel export
└── lib/
    ├── hooks/
    │   └── useRefrasa.ts                  # New: state management hook
    └── refrasa/
        ├── types.ts                       # New: type definitions
        ├── schemas.ts                     # New: Zod schemas
        ├── prompt-builder.ts              # New: LLM prompt construction
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

### UI Components
- Reuse Dialog, Button, Badge dari shadcn/ui
- Follow existing admin UI patterns dari SystemPromptsManager
- Responsive design dengan Tailwind breakpoints

### Integration
- Add button ke existing toolbar pattern di ArtifactViewer
- Use `api.artifacts.update` mutation untuk apply changes
- Toast notifications via sonner
