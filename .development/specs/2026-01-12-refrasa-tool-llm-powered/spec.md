# Specification: Refrasa Tool - LLM Powered

## Goal
Tool "Refrasa" untuk memperbaiki gaya penulisan akademis Bahasa Indonesia, sepenuhnya ditenagai LLM (bukan programmatic detection) dan dipandu oleh Style Constitution yang editable di admin panel.

## User Stories
- Sebagai penulis makalah, saya ingin memformat ulang tulisan agar sesuai gaya akademis Indonesia sehingga tulisan saya lebih profesional dan natural
- Sebagai admin, saya ingin mengelola aturan gaya penulisan (Style Constitution) agar AI mengikuti standar penulisan yang saya tentukan

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
- Call LLM dengan `generateObject` untuk structured JSON output
- Primary provider dengan fallback (pattern dari streaming.ts: getGatewayModel/getOpenRouterModel)
- Response: `{ needsRefrasa: boolean, original: {...}, refrasad?: {...}, mode: 'full' }`

**FR-4: LLM Output Schema dengan Zod**
- score: `z.number().min(0).max(100)` - skor kepatuhan teks original
- newScore: `z.number().min(0).max(100)` - skor teks setelah refrasa
- issues: `z.array(RefrasaIssueSchema)` - list masalah yang ditemukan
- refrasedText: `z.string()` - teks yang sudah diperbaiki
- RefrasaIssue: `{ type, message, severity: 'info'|'warning'|'critical', suggestion? }`

**FR-5: Confirmation Dialog dengan Before/After**
- Component: `RefrasaConfirmationDialog.tsx` di `src/components/chat/`
- Layout: side-by-side (kiri: original dengan score, kanan: refrasad dengan newScore)
- Score display format: "Skor: 45 -> 82" dengan visual indicator (Badge warna)
- Issues list collapsible untuk transparency
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

**FR-9: Migration Seed Default Constitution**
- File: `convex/migrations/seedDefaultStyleConstitution.ts`
- Source content: `.development/knowledge-base/writing_style_tool/makalah-style-constitution.md`
- Auto-activate setelah seed

## Visual Design
Tidak ada visual assets yang di-upload.

**UI Guidelines berdasarkan existing patterns:**
- RefrasaConfirmationDialog: gunakan Dialog dari shadcn/ui dengan max-width-3xl
- Score badges: hijau untuk skor >= 80, kuning untuk 50-79, merah untuk < 50
- Side-by-side layout: CSS grid dengan gap-4
- Original panel: border-muted, Refrasad panel: border-primary/50
- Issues list: Accordion atau Collapsible untuk minimalisasi visual noise

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
- Gunakan untuk RefrasaConfirmationDialog
- Pattern: DialogContent, DialogHeader, DialogFooter

## Out of Scope
- Batch refrasa untuk multiple artifacts sekaligus
- Undo/rollback hasil refrasa (user bisa pakai version history)
- Analytics untuk track refrasa usage dan statistics
- Preview/test mode untuk constitution di admin panel
- Score caching/display saat artifact pertama kali di-load
- Highlight visual perubahan di comparison dialog (diff view)
- Selection-based partial refrasa (hanya selected text, bukan full content)
- Integration ke chat messages (hanya ArtifactViewer untuk v1)
- Real-time score calculation saat typing

## Note on Existing Code
**`src/tools/bahasa_style/`** - Existing programmatic linter code. DIABAIKAN untuk fitur ini. Tidak digunakan, tidak dihapus. Fitur Refrasa ini menggunakan arsitektur LLM-first yang completely berbeda.
