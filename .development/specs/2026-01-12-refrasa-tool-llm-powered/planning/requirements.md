# Spec Requirements: Refrasa Tool - LLM Powered

## Initial Description

Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai oleh LLM (bukan programmatic detection).

**Arsitektur:**
- LLM-first: LLM yang detect DAN refrasa sekaligus
- Guided by Style Constitution yang editable di admin panel
- Tidak ada hardcoded regex/rules/thresholds

**Komponen:**
1. Score: LLM output score 0-100 + issues + refrasedText
2. Code location: `src/tools/refrasa`
3. Validation timing: Hanya saat user klik tombol Refrasa
4. Constitution: Single document dengan structured markdown template

## Requirements Discussion

### First Round Questions

User sudah memberikan keputusan desain lengkap tanpa perlu clarifying questions tambahan. Keputusan sudah mencakup:

**Q1:** Arsitektur deteksi dan refrasa?
**Answer:** LLM-first. LLM yang detect DAN refrasa sekaligus dalam satu request.

**Q2:** Bagaimana style rules dikelola?
**Answer:** Style Constitution yang editable di admin panel, single document dengan structured markdown template.

**Q3:** Kapan validasi dijalankan?
**Answer:** Hanya saat user klik tombol Refrasa (on-demand, bukan auto-trigger).

**Q4:** Di mana Refrasa tool diintegrasikan?
**Answer:** Context menu HANYA di ArtifactViewer (bukan chat messages).

**Q5:** Bagaimana UI konfirmasi ditampilkan?
**Answer:** Confirmation dialog dengan side-by-side layout (kiri: original, kanan: refrasaed).

**Q6:** Bagaimana score ditampilkan?
**Answer:** Format "Skor: 45 -> 82" (sebelum dan sesudah).

**Q7:** Bagaimana hasil refrasa di-apply?
**Answer:** Langsung update artifact via `api.artifacts.update`.

**Q8:** Kapan tombol Refrasa disabled?
**Answer:** Saat isEditing, artifact null/loading, content < 50 chars.

### Existing Code to Reference

**Similar Features Identified:**

- Feature: Style Constitution Admin - Path: `convex/systemPrompts.ts`
  - Pattern CRUD + versioning untuk single-active document
  - Query: getActive, list, getVersionHistory
  - Mutation: create, update, activate, deactivate, delete

- Feature: Admin UI Editor - Path: `src/components/admin/SystemPromptsManager.tsx`
  - Table dengan action buttons (edit, history, activate, delete)
  - AlertDialog untuk konfirmasi
  - FormDialog untuk create/edit
  - VersionHistoryDialog untuk riwayat

- Feature: ArtifactViewer Integration - Path: `src/components/chat/ArtifactViewer.tsx`
  - Toolbar actions (Edit, Download, Copy)
  - Version dropdown
  - Existing mutation: `api.artifacts.update`

- Feature: Dialog Pattern - Path: `src/components/chat/VersionHistoryDialog.tsx`
  - Dialog dengan diff view
  - Side-by-side comparison pattern

- Feature: Context Menu - Path: `src/components/ui/context-menu.tsx`
  - Radix UI ContextMenu primitives

- Feature: AI Provider dengan Fallback - Path: `src/app/api/chat/route.ts`
  - Pattern: getGatewayModel() dengan try-catch fallback ke getOpenRouterModel()
  - generateObject untuk structured JSON output

- Feature: Default Constitution Source - Path: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
  - Template lengkap untuk seed migration

### Follow-up Questions

Tidak diperlukan follow-up questions karena user sudah memberikan keputusan desain yang komprehensif.

## Visual Assets

### Files Provided:
Tidak ada visual assets yang di-upload.

### Visual Insights:
Tidak ada visual untuk dianalisis.

## Requirements Summary

### Functional Requirements

**FR-1: Tombol Refrasa di ArtifactViewer Toolbar**
- Tambah tombol "Refrasa" di toolbar ArtifactViewer
- Disabled conditions:
  - `isEditing === true`
  - `artifact === null` atau loading
  - `artifact.content.length < 50` chars

**FR-2: Context Menu untuk Selection Refrasa**
- Context menu muncul saat right-click di ArtifactViewer content area
- Menu item "Refrasa" untuk trigger refrasa pada seluruh content
- Tidak untuk selected text saja (full content refrasa)

**FR-3: Confirmation Dialog dengan Before/After + Score**
- Side-by-side layout:
  - Kiri: Original content
  - Kanan: Refrasaed content
- Score display: "Skor: [before] -> [after]" (e.g., "Skor: 45 -> 82")
- Issues list dari LLM (optional display)
- Buttons: "Terapkan" (apply) dan "Batal" (cancel)

**FR-4: API Endpoint POST /api/refrasa**
- Input: `{ content: string }`
- Output: `{ score: number, issues: string[], refrasedText: string, newScore: number }`
- LLM call dengan Style Constitution sebagai context
- Primary provider dengan fallback (sama seperti chat API pattern)

**FR-5: Admin UI untuk Style Constitution**
- Tab baru di Admin Panel: "Style Constitution"
- Menggunakan pattern yang sama dengan SystemPromptsManager
- Features:
  - View active constitution
  - Edit constitution (creates new version)
  - View version history
  - Activate/deactivate constitution

**FR-6: Style Constitution Versioning**
- Schema mengikuti pattern systemPrompts:
  - name, content, description
  - version, isActive
  - parentId, rootId (untuk version chain)
  - createdBy, createdAt, updatedAt

**FR-7: Apply Changes ke Artifact**
- Saat user klik "Terapkan":
  - Call `api.artifacts.update` dengan refrasedText
  - Create new version (immutable versioning)
  - Close dialog
  - Toast success message

### Reusability Opportunities

- **convex/systemPrompts.ts** - Copy dan modifikasi untuk styleConstitutions table
- **SystemPromptsManager.tsx** - Copy dan modifikasi untuk StyleConstitutionManager
- **api.artifacts.update** - Sudah ada, tinggal pakai
- **getGatewayModel/getOpenRouterModel** - Import dari streaming.ts
- **VersionHistoryDialog** - Pattern untuk comparison view

### Scope Boundaries

**In Scope:**
- Tombol Refrasa di ArtifactViewer toolbar
- Context menu Refrasa di ArtifactViewer
- Confirmation dialog side-by-side
- POST /api/refrasa endpoint
- styleConstitutions table di Convex
- Admin UI untuk Style Constitution
- Migration seed default constitution
- Primary + fallback AI provider pattern

**Out of Scope (v1):**
- Batch refrasa untuk multiple artifacts
- Undo/rollback hasil refrasa
- Analytics untuk track refrasa usage
- Preview test untuk constitution
- Score caching/display saat artifact load
- Highlight perubahan di comparison dialog
- Selection-based partial refrasa (hanya selected text)
- Integration ke chat messages (hanya ArtifactViewer)

### Technical Considerations

**Database Schema:**
```
styleConstitutions: defineTable({
  name: v.string(),
  content: v.string(),
  description: v.optional(v.string()),
  version: v.number(),
  isActive: v.boolean(),
  parentId: v.optional(v.id("styleConstitutions")),
  rootId: v.optional(v.id("styleConstitutions")),
  createdBy: v.id("users"),
  createdAt: v.number(),
  updatedAt: v.number(),
})
  .index("by_active", ["isActive"])
  .index("by_root", ["rootId", "version"])
  .index("by_createdAt", ["createdAt"])
```

**API Route Structure:**
- Location: `src/app/api/refrasa/route.ts`
- Auth: Clerk authentication required
- LLM: generateObject dengan Zod schema untuk structured output
- Constitution: Fetch active dari `api.styleConstitutions.getActive`

**LLM Prompt Structure:**
```
System: [Style Constitution content]

Task: Analyze and rephrase the following text according to the style constitution.
Output JSON with:
- score: 0-100 (original text compliance)
- issues: array of detected issues
- refrasedText: improved text
- newScore: 0-100 (refrasaed text compliance)

Text to analyze:
[artifact content]
```

**Migration:**
- File: `convex/migrations/seedDefaultStyleConstitution.ts`
- Source: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`

**Code Organization:**
```
src/tools/refrasa/
  - index.ts (exports)
  - types.ts (TypeScript interfaces)
  - prompt.ts (LLM prompt construction)

src/app/api/refrasa/
  - route.ts (API handler)

src/components/admin/
  - StyleConstitutionManager.tsx
  - StyleConstitutionFormDialog.tsx

src/components/chat/
  - RefrasaConfirmationDialog.tsx

convex/
  - styleConstitutions.ts (CRUD)
  - schema.ts (table definition)
```

**UI Component Dependencies:**
- Dialog dari @/components/ui/dialog
- Button dari @/components/ui/button
- ContextMenu dari @/components/ui/context-menu
- AlertDialog untuk konfirmasi
- Toast dari sonner
- Badge untuk score display
