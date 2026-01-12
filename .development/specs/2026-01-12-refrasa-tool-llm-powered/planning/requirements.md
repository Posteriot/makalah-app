# Spec Requirements: Refrasa Tool - LLM Powered

## Initial Description

Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai oleh LLM (bukan deteksi programatik).

**Dual Goal:**
1. **Humanize Writing Standard** - Standar penulisan akademis yang natural dan manusiawi
2. **Target Anti-Deteksi LLM (upaya terbaik)** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos detektor)

**Arsitektur: Separation of Concerns**
- **Layer 1: Core Naturalness Criteria (Hardcoded)** - Metrik anti-deteksi yang TIDAK BISA di-override admin
- **Layer 2: Style Constitution (Editable)** - Style rules yang bisa dikustomisasi admin
- LLM evaluate KEDUA layer dalam satu request

**Insight Kunci:**
- Target Anti-Deteksi LLM = heuristik upaya terbaik → Hardcoded di prompt (bukan enforcement)
- Humanize/Academic Style = ART (subjektif, kontekstual) → Editable
- **LLM LIMITATION:** LLM buruk dalam counting → gunakan instruksi KUALITATIF

**Komponen:**
1. Output: `{ issues: RefrasaIssue[], refrasedText: string }` (tanpa score - lihat Known Limitations)
2. Output language: issues/suggestion/refrasedText harus Bahasa Indonesia (kecuali istilah teknis/rujukan)
3. Code location: `src/lib/refrasa` (types, schemas, prompt-builder)
4. Validation timing: Hanya saat user klik tombol Refrasa
5. Constitution: Style guidance only (naturalness hardcoded in prompt builder)
6. Constitution fallback: Jika tidak ada active constitution, proceed dengan Layer 1 only

## Requirements Discussion

### First Round Questions

User sudah memberikan keputusan desain lengkap tanpa perlu clarifying questions tambahan. Keputusan sudah mencakup:

**Q1:** Arsitektur deteksi dan refrasa?
**Answer:** LLM-first dengan two-layer evaluation. Layer 1 (Core Naturalness) hardcoded, Layer 2 (Style Constitution) editable.

**Q2:** Bagaimana style rules dikelola?
**Answer:** Style Constitution editable di admin panel untuk STYLE rules. Naturalness criteria hardcoded di prompt builder.

**Q3:** Kapan validasi dijalankan?
**Answer:** Hanya saat user klik tombol Refrasa (on-demand, bukan auto-trigger).

**Q4:** Di mana Refrasa tool diintegrasikan?
**Answer:** Toolbar button DAN context menu di ArtifactViewer (bukan chat messages).

**Q5:** Bagaimana UI konfirmasi ditampilkan?
**Answer:** Confirmation dialog dengan side-by-side layout (kiri: original, kanan: refrasaed).

**Q6:** Bagaimana improvement ditampilkan?
**Answer:** Issues list (bukan score) - "X masalah terdeteksi → Tinjau hasil perbaikan". Score dihapus karena self-grading bias (lihat Known Limitations).

**Q7:** Bagaimana hasil refrasa di-apply?
**Answer:** Langsung update artifact via `api.artifacts.update`.

**Q8:** Kapan tombol Refrasa disabled?
**Answer:** Saat isEditing, artifact null/loading, content < 50 chars.

**Q9:** Bagaimana memastikan kapabilitas anti-deteksi LLM?
**Answer:** Core Naturalness Criteria di-hardcode di prompt builder dengan instruksi KUALITATIF (bukan kuantitatif karena LLM buruk dalam counting).

**Q10:** Bagaimana handle latensi untuk teks panjang?
**Answer:** Educational loading states + peringatan batas kata (batas lunak) untuk teks panjang.

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

- Feature: AI Provider dengan Fallback - Path: `src/lib/ai/streaming.ts`
  - Pattern: getGatewayModel() dengan try-catch fallback ke getOpenRouterModel()
  - generateObject untuk structured JSON output

- Feature: Default Constitution Source - Path: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
  - Template lengkap untuk seed migration (STYLE rules only)

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

**FR-2: Context Menu untuk Refrasa**
- Context menu muncul saat right-click di ArtifactViewer content area
- Menu item "Refrasa" untuk trigger refrasa pada seluruh content
- Tidak untuk selected text saja (full content refrasa)

**FR-3: Confirmation Dialog dengan Before/After**
- Side-by-side layout:
  - Kiri: Original content dengan issues list (grouped by category)
  - Kanan: teks hasil refrasa (bersih)
- Improvement indicator: "X masalah terdeteksi → Tinjau hasil perbaikan" (issue count, bukan score)
- Issues list collapsible, grouped by category (naturalness/style)
- Buttons: "Terapkan" (apply) dan "Batal" (cancel)

**FR-4: API Endpoint POST /api/refrasa**
- Input: `{ content: string, artifactId?: string }`
- Output schema:
  ```typescript
  {
    issues: RefrasaIssue[],  // Categorized issues terdeteksi (upaya terbaik)
    refrasedText: string     // Improved text
  }

  RefrasaIssue: {
    type: 'vocabulary_repetition' | 'sentence_pattern' | 'paragraph_rhythm' |
          'hedging_balance' | 'burstiness' | 'style_violation',
    category: 'naturalness' | 'style',
    message: string,
    severity: 'info' | 'warning' | 'critical',
    suggestion?: string
  }
  ```
- **Note:** Score dihapus karena self-grading bias (lihat Known Limitations)
- LLM call dengan TWO-LAYER prompt (Core Criteria + Style Constitution)
- Primary provider dengan fallback (sama seperti chat API pattern)
- **Constitution fallback:** Jika tidak ada active constitution, proceed dengan Layer 1 only
- **Bahasa output:** `issues.message`, `issues.suggestion`, dan `refrasedText` wajib Bahasa Indonesia (kecuali istilah teknis/rujukan)
- **Empty issues:** `issues` boleh kosong, UI harus handle empty state
- **Timeout config:** Tambah `export const maxDuration = 300` di route (Vercel Functions)
- **Catatan dependency:** Durasi efektif tergantung status fluid compute di Vercel

**FR-5: Admin UI untuk Style Constitution**
- Tab baru di Admin Panel: "Style Constitution"
- Menggunakan pattern yang sama dengan SystemPromptsManager
- Features:
  - View active constitution
  - Edit constitution (creates new version)
  - View version history
  - Activate/deactivate constitution
- Note: Constitution hanya untuk STYLE rules (naturalness hardcoded)

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

**FR-8: styleConstitutions Table di Convex**
- Schema mengikuti pattern systemPrompts (versioning, single-active)
- Fields: name, content, description, version, isActive, parentId, rootId, createdBy, createdAt, updatedAt
- Indexes: by_active, by_root, by_createdAt
- CRUD functions di `convex/styleConstitutions.ts`

**FR-9: Migration Seed Default Constitution**
- File: `convex/migrations/seedDefaultStyleConstitution.ts`
- Source content: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
- Auto-activate setelah seed

**FR-10: Core Naturalness Criteria (Hardcoded in Prompt Builder)**

**PENTING: Gunakan instruksi KUALITATIF, bukan kuantitatif (LLM buruk dalam counting)**

Prompt builder HARUS include mandatory naturalness evaluation criteria:

1. **Vocabulary Diversity**
   - ❌ JANGAN: "No word >3x per 500 words"
   - ✅ GUNAKAN: "Strictly avoid repeating non-technical vocabulary close together. Use synonyms aggressively for common words."

2. **Sentence Pattern Variance**
   - ❌ JANGAN: "Mix lengths (short <10, medium 10-20, long >20 words)"
   - ✅ GUNAKAN: "Vary sentence structures naturally. Mix short punchy sentences with longer explanatory ones. Avoid starting consecutive sentences with the same word or phrase."

3. **Paragraph Rhythm**
   - ❌ JANGAN: "Vary 2-6 sentences per paragraph"
   - ✅ GUNAKAN: "Create natural paragraph flow. Some paragraphs should be brief for emphasis, others more developed for detailed explanation."

4. **Hedging Balance**
   - ✅ GUNAKAN: "Include appropriate academic hedging language where claims are not absolute. Use markers like 'cenderung', 'kemungkinan', 'tampaknya', 'dapat diargumentasikan'."

5. **Burstiness**
   - ✅ GUNAKAN: "Write with variable complexity like humans do. Mix technical precision with accessible explanations. Maintain academic formality throughout."

**ACADEMIC ESCAPE CLAUSE (CRITICAL):**
```
SELALU PERTAHANKAN:
- Technical terminology consistency (istilah teknis TIDAK diganti sinonim)
- Academic rigor and formality
- Markdown formatting structure (heading, list, bold/italic, link, code block, blockquote)
- Citation/reference formatting
- Citation keys ([@...], [1], [2])
- Discipline-specific conventions
- Proper nouns and named entities

Jika ragu apakah kata ini istilah teknis atau bukan,
pilih untuk MENGULANG. Konsistensi > variasi.

Ubah isi teks, jangan ubah struktur.
```

- Criteria ini TIDAK BISA di-override oleh Style Constitution
- Style Constitution adalah ADDITIONAL guidance untuk style, bukan replacement untuk naturalness
- Issues dari naturalness criteria categorized sebagai `category: 'naturalness'`
- RefrasedText HARUS mempertahankan struktur markdown dan citation keys dari input

**FR-11: Educational Loading States**
- Loading UI saat API call in progress HARUS memberikan feedback edukatif
- Rotating messages yang menjelaskan proses:
  - "Menganalisis pola kalimat..."
  - "Memeriksa variasi kosa kata..."
  - "Menyesuaikan ritme paragraf..."
  - "Memperbaiki gaya penulisan..."
- Tujuan: User tidak bosan menunggu proses yang bisa 10-20+ detik untuk teks panjang
- Implementation: Array of messages dengan interval rotation (2-3 detik per message)

**FR-12: Batas Kata (Batas Lunak)**
- Batas lunak: 2.000 kata (peringatan saja, tidak memblokir)
- Unit: kata (lebih intuitif bagi user)
- Hitung kata: `content.trim().split(/\s+/).length`
- Peringatan sebelum klik Refrasa (tooltip di button)
- Teks peringatan: "Teks panjang (X kata) mungkin butuh waktu lebih lama"

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
- Confirmation dialog side-by-side dengan categorized issues
- POST /api/refrasa endpoint dengan two-layer evaluation
- styleConstitutions table di Convex
- Admin UI untuk Style Constitution
- Migration seed default constitution
- Primary + fallback AI provider pattern
- **Core Naturalness Criteria hardcoded di prompt builder (QUALITATIVE)**
- **Academic Escape Clause untuk preserve technical terminology**
- **Educational loading states**

**Out of Scope (v1):**
- Batch refrasa untuk multiple artifacts
- Undo/rollback hasil refrasa
- Analytics untuk track refrasa usage
- Preview test untuk constitution
- Score caching/display saat artifact load
- Highlight perubahan di comparison dialog (diff view) - *prioritas v1.1*
- Selection-based partial refrasa (hanya selected text)
- Integration ke chat messages (hanya ArtifactViewer)
- Context awareness (artifact tidak tahu konteks bab lain)

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
- Prompt: Two-layer structure (Core Naturalness + Style Constitution)
- Access control: `getActive` dipakai server-side (API) saja, query list/history tetap admin-only

**LLM Prompt Structure (Two-Layer) - QUALITATIVE:**
```
## CORE EVALUATION CRITERIA (MANDATORY - LAYER 1)

You MUST evaluate and improve the text against these naturalness metrics.
Use QUALITATIVE assessment - do not count words or sentences precisely.

### 1. Vocabulary Diversity
Strictly avoid repeating non-technical vocabulary close together.
Use synonyms aggressively for common words.
**EXCEPTION:** Technical terms (istilah teknis) MUST remain consistent - do NOT replace with synonyms.

### 2. Sentence Pattern Variance
Vary sentence structures naturally. Mix short punchy sentences with longer explanatory ones.
Avoid starting consecutive sentences with the same word or phrase.

### 3. Paragraph Rhythm
Create natural paragraph flow. Some paragraphs should be brief for emphasis,
others more developed for detailed explanation.

### 4. Hedging & Uncertainty Balance
Include appropriate academic hedging language where claims are not absolute.
Use markers like: "cenderung", "kemungkinan", "tampaknya", "dapat diargumentasikan".

### 5. Burstiness (Human Writing Pattern)
Write with variable complexity like humans do.
Mix technical precision with accessible explanations.
Maintain academic formality throughout.

## ACADEMIC ESCAPE CLAUSE (MUST FOLLOW)

SELALU PERTAHANKAN:
- Technical terminology consistency (istilah teknis TIDAK diganti sinonim)
- Academic rigor and formality
- Markdown formatting structure (heading, list, bold/italic, link, code block, blockquote)
- Citation/reference formatting (e.g., "Menurut Smith (2020)...")
- Citation keys ([@...], [1], [2])
- Discipline-specific conventions
- Proper nouns and named entities

Jika ragu apakah kata ini istilah teknis atau bukan,
pilih untuk mengulang. Konsistensi > variasi.

Ubah isi teks, jangan ubah struktur.

## STYLE CONSTITUTION (Contextual Guidelines - LAYER 2)

${constitution}

## STYLE CONSTITUTION FALLBACK

If no Style Constitution is provided, proceed with Layer 1 (Core Naturalness Criteria) only.
Style Constitution is an optional enhancement, not a requirement.

## YOUR TASK

Analyze the following text and:
1. Identify specific issues with type, category (naturalness/style), and severity
2. Rewrite the text to improve both naturalness AND style compliance

Output JSON with schema:
{
  "issues": [
    {
      "type": "vocabulary_repetition" | "sentence_pattern" | "paragraph_rhythm" |
              "hedging_balance" | "burstiness" | "style_violation",
      "category": "naturalness" | "style",
      "message": string,
      "severity": "info" | "warning" | "critical",
      "suggestion": string
    }
  ],
  "refrasedText": string  // Improved text
}

## TEXT TO ANALYZE

${content}
```

**Migration:**
- File: `convex/migrations/seedDefaultStyleConstitution.ts`
- Source: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`

**Code Organization:**
```
src/lib/refrasa/
  - index.ts (exports)
  - types.ts (TypeScript interfaces)
  - schemas.ts (Zod schemas)
  - prompt-builder.ts (LLM prompt with two-layer structure + qualitative)
  - loading-messages.ts (Educational loading message array)

src/app/api/refrasa/
  - route.ts (API handler)

src/components/admin/
  - StyleConstitutionManager.tsx
  - StyleConstitutionFormDialog.tsx

src/components/refrasa/
  - RefrasaButton.tsx
  - RefrasaIssueItem.tsx
  - RefrasaConfirmDialog.tsx
  - RefrasaLoadingIndicator.tsx (Educational loading states)
  - index.ts

src/lib/hooks/
  - useRefrasa.ts

convex/
  - styleConstitutions.ts (CRUD)
  - schema.ts (table definition)
  - migrations/seedDefaultStyleConstitution.ts
```

**UI Component Dependencies:**
- Dialog dari @/components/ui/dialog
- Button dari @/components/ui/button
- ContextMenu dari @/components/ui/context-menu
- AlertDialog untuk konfirmasi
- Toast dari sonner
- Badge untuk severity/category display
- Collapsible/Accordion untuk issues list

---

## Known Limitations

### 1. "Hardcoded" = Prompt Instructions, Bukan Enforcement
- Core Naturalness Criteria di-hardcode di prompt, tapi tidak ada mekanisme yang **memaksa** LLM comply
- Ini inherent limitation dari LLM-first approach
- Mitigasi: Accept limitation untuk v1, future bisa tambah post-processing validation

### 2. Self-Grading Bias → Score Dihapus
- Awalnya direncanakan `score` dan `newScore` untuk before/after comparison
- **Problem:** Model yang sama analyze + rewrite + re-analyze = bias (selalu kasih skor lebih tinggi untuk output sendiri)
- **Keputusan:** Hapus score, fokus ke issues list yang konkret dan verifiable
- **UI alternative:** "X masalah terdeteksi → Tinjau hasil perbaikan" (issue count, bukan arbitrary score)

### 3. Constitution Dependency
- Jika tidak ada Style Constitution aktif, API tetap jalan dengan Layer 1 only
- Style Constitution adalah enhancement, bukan requirement

### 4. Target Anti-Deteksi LLM = Upaya Terbaik
- Tidak ada jaminan lolos detektor AI eksternal
- Tidak ada external validation pada v1

### 5. Risiko Timeout Teks Panjang
- Durasi efektif tergantung status fluid compute di Vercel
- Teks sangat panjang tetap berisiko timeout meski `maxDuration` diset

### 6. Issue List Tidak Menjamin Semua Teratasi
- Issues bisa kosong atau sebagian tidak terselesaikan
- UI tidak boleh menyatakan "semua diperbaiki"
