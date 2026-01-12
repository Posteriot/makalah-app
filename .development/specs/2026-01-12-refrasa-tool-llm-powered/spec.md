# Specification: Refrasa Tool - LLM Powered

## Goal
Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai LLM (bukan deteksi programatik).

**Dual Goal:**
1. **Humanize Writing Standard** - Standar penulisan akademis yang natural dan manusiawi
2. **Target Anti-Deteksi LLM (upaya terbaik)** - Upaya mengurangi pola deteksi AI (tanpa jaminan lolos detektor)

**Arsitektur: Two-Layer Evaluation**
- **Layer 1: Core Naturalness Criteria (Hardcoded)** - Metrik anti-deteksi yang TIDAK BISA di-override admin
- **Layer 2: Style Constitution (Editable)** - Style rules yang bisa dikustomisasi admin di admin panel

**LLM Limitation Note:**
- LLM buruk dalam counting → gunakan instruksi KUALITATIF, bukan kuantitatif

## User Stories
- Sebagai penulis makalah, saya ingin memformat ulang tulisan agar sesuai gaya akademis Indonesia sehingga tulisan saya lebih profesional dan natural
- Sebagai penulis makalah, saya ingin tulisan saya terlihat ditulis oleh manusia (anti-deteksi AI)
- Sebagai admin, saya ingin mengelola aturan gaya penulisan (Style Constitution) untuk customizable style rules

## Specific Requirements

**FR-1: Tombol Refrasa di ArtifactViewer Toolbar**
- Tambah tombol "Refrasa" di toolbar ArtifactViewer (sejajar dengan Edit, Download, Copy)
- Icon: gunakan `WandSparkles` dari lucide-react
- Disabled conditions: `isEditing`, `artifact === null`, `artifact.content.length < 50`
- Loading state dengan Loader2 saat request sedang berjalan
- Trigger: klik tombol membuka RefrasaConfirmationDialog

**FR-2: Context Menu Refrasa di ArtifactViewer**
- Context menu muncul saat right-click di ArtifactViewer content area
- Menu item "Refrasa" dengan icon WandSparkles
- Trigger refrasa pada seluruh artifact content (bukan selection)
- Gunakan Radix UI ContextMenu dari `src/components/ui/context-menu.tsx`

**FR-3: POST /api/refrasa Endpoint**
- Auth: Clerk authentication required (ambil userId dari token)
- Request body: `{ content: string, artifactId?: string }`
- Fetch active Style Constitution dari `api.styleConstitutions.getActive`
- **Constitution fallback:** Jika tidak ada active constitution, proceed dengan Layer 1 only
- Build TWO-LAYER prompt: Core Naturalness Criteria (hardcoded) + Style Constitution (dynamic/optional)
- Call LLM dengan `generateObject` untuk structured JSON output
- Primary provider dengan fallback (pattern dari streaming.ts: getGatewayModel/getOpenRouterModel)
- Response: `{ issues: RefrasaIssue[], refrasedText: string }`
- **Access control:** `getActive` dipakai server-side (API) saja; list/history tetap admin-only
- **Bahasa output:** `issues.message`, `issues.suggestion`, dan `refrasedText` wajib Bahasa Indonesia (kecuali istilah teknis/rujukan)
- **Empty issues:** `issues` boleh kosong, UI harus handle empty state
- **Timeout config:** Tambah `export const maxDuration = 300` di route (Vercel Functions)
- **Catatan dependency:** Durasi efektif tergantung status fluid compute di Vercel

**FR-4: LLM Output Schema dengan Zod**
- issues: `z.array(RefrasaIssueSchema)` - list masalah yang ditemukan dan diperbaiki
- refrasedText: `z.string()` - teks yang sudah diperbaiki
- **Note:** Score dihapus karena self-grading bias (lihat Known Limitations)
- RefrasaIssue schema:
  ```typescript
  {
    type: 'vocabulary_repetition' | 'sentence_pattern' | 'paragraph_rhythm' |
          'hedging_balance' | 'burstiness' | 'style_violation',
    category: 'naturalness' | 'style',  // Categorize issue source
    message: string,
    severity: 'info' | 'warning' | 'critical',
    suggestion?: string
  }
  ```

**FR-5: Confirmation Dialog dengan Before/After**
- Component: `RefrasaConfirmDialog.tsx` di `src/components/refrasa/`
- Layout: side-by-side (kiri: original dengan issues, kanan: refrasedText clean)
- Improvement indicator: "X masalah terdeteksi → Tinjau hasil perbaikan" (issue count, bukan score)
- Issues list collapsible untuk transparency, grouped by category (naturalness/style)
- Buttons: "Terapkan" (primary) dan "Batal" (outline)
- Responsive: stack vertikal pada mobile

**FR-6: Apply Changes ke Artifact**
- Saat user klik "Terapkan", call `api.artifacts.update` dengan refrasedText
- Artifact versioning: creates new version (immutable pattern)
- Close dialog setelah sukses
- Toast success: "Tulisan berhasil diperbaiki ke v{version}"

**FR-7: styleConstitutions Table di Convex**
- Schema mengikuti pattern systemPrompts (versioning, single-active)
- Fields: name, content, description, version, isActive, parentId, rootId, createdBy, createdAt, updatedAt
- Indexes: by_active, by_root, by_createdAt
- CRUD functions di `convex/styleConstitutions.ts`

**FR-8: Admin UI untuk Style Constitution**
- Tab baru di Admin Panel: "Style Constitution"
- Component: `StyleConstitutionManager.tsx` di `src/components/admin/`
- Features: list, create, edit (new version), view history, activate/deactivate, delete
- Gunakan pattern yang sama dengan SystemPromptsManager
- Note: Constitution hanya untuk STYLE rules (naturalness hardcoded di prompt builder)

**FR-9: Migration Seed Default Constitution**
- File: `convex/migrations/seedDefaultStyleConstitution.ts`
- Source content: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
- Auto-activate setelah seed

**FR-10: Core Naturalness Criteria (Hardcoded in Prompt Builder)**

**PENTING: Gunakan instruksi KUALITATIF, bukan kuantitatif (LLM buruk dalam counting)**

Prompt builder di `src/lib/refrasa/prompt-builder.ts` HARUS include mandatory evaluation criteria:

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
- Citation/reference formatting (e.g., "Menurut Smith (2020)...")
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
- Issues dari style constitution categorized sebagai `category: 'style'`
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
- Component: `RefrasaLoadingIndicator.tsx` di `src/components/refrasa/`

**FR-12: Batas Kata (Batas Lunak)**
- Batas lunak: 2.000 kata (peringatan saja, tidak memblokir)
- Unit: kata (lebih intuitif bagi user)
- Hitung kata: `content.trim().split(/\s+/).length`
- Peringatan sebelum klik Refrasa (tooltip di button)
- Teks peringatan: "Teks panjang (X kata) mungkin butuh waktu lebih lama"

## Visual Design
Tidak ada visual assets yang di-upload.

**UI Guidelines berdasarkan existing patterns:**
- RefrasaConfirmDialog: gunakan Dialog dari shadcn/ui dengan max-width-3xl
- Side-by-side layout: CSS grid dengan gap-4
- Original panel: border-muted dengan issues list, Refrased panel: border-primary/50 (clean)
- Severity badges: critical=red, warning=yellow, info=blue
- Category badges: naturalness=purple, style=teal
- Issues list: Accordion atau Collapsible untuk minimalisasi visual noise
- Issues grouped by category with visual distinction (naturalness vs style)
- Improvement indicator: "X masalah terdeteksi → Tinjau hasil perbaikan"
- Loading indicator: Centered dengan rotating educational messages

## Existing Code to Leverage

**convex/systemPrompts.ts - CRUD + Versioning Pattern**
- Copy struktur query/mutation untuk styleConstitutions
- Pattern: getActive, list, getVersionHistory, create, update, activate, deactivate, delete
- Permission check dengan `requireRole(db, userId, "admin")`

**src/components/admin/SystemPromptsManager.tsx - Admin UI Pattern**
- Copy dan modifikasi untuk StyleConstitutionManager
- Table dengan action buttons, AlertDialog konfirmasi, FormDialog
- Loading state dengan skeleton animation

**src/lib/ai/streaming.ts - AI Provider Pattern**
- Import `getGatewayModel()` dan `getOpenRouterModel()` untuk primary + fallback
- Pattern try-catch fallback untuk resilience

**src/components/chat/ArtifactViewer.tsx - Integration Point**
- Tambah tombol Refrasa di toolbar actions (line 376-410)
- Gunakan existing pattern disabled states dan loading handling
- Existing mutation `api.artifacts.update` untuk apply changes

**src/components/ui/dialog.tsx + AlertDialog - Dialog Patterns**
- Gunakan untuk RefrasaConfirmDialog
- Pattern: DialogContent, DialogHeader, DialogFooter

## Out of Scope
- Batch refrasa untuk multiple artifacts sekaligus
- Undo/rollback hasil refrasa (user bisa pakai version history)
- Analytics untuk track refrasa usage dan statistics
- Preview/test mode untuk constitution di admin panel
- Highlight visual perubahan di comparison dialog (diff view) - *prioritas v1.1*
- Selection-based partial refrasa (hanya selected text, bukan full content)
- Integration ke chat messages (hanya ArtifactViewer untuk v1)
- Context awareness (artifact tidak tahu konteks bab lain)
- Validasi deteksi AI eksternal (GPTZero, dll) - gunakan penilaian mandiri untuk v1

## Note on Existing Code
**`src/tools/bahasa_style/`** - Kode linter programatik yang sudah ada. DIABAIKAN untuk fitur ini. Tidak digunakan, tidak dihapus. Fitur Refrasa ini menggunakan arsitektur LLM-first yang sepenuhnya berbeda.

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
- Efektivitas tergantung kualitas prompt dan konteks teks
- Tidak ada external validation pada v1

### 5. Issue List Tidak Menjamin Semua Teratasi
- Issues bisa kosong atau sebagian tidak terselesaikan
- UI tidak boleh menyatakan "semua diperbaiki"

### 6. Risiko Timeout Teks Panjang
- Durasi efektif tergantung status fluid compute di Vercel
- Teks sangat panjang tetap berisiko timeout meski `maxDuration` diset
