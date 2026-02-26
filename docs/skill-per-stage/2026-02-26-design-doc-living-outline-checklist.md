# Design Doc: Living Outline Checklist

Tanggal: 26 Februari 2026
Status: Draft Implementable
Scope: Outline sebagai living checklist yang mengiringi progress penulisan paper lintas stage, dengan auto-check saat stage approved dan mid-course edit terbatas

---

## 1) Latar Belakang

Saat ini outline dibuat di stage 3 dan langsung "mati" setelah di-approve. Setiap stage instruction bilang "ELABORASI SESUAI OUTLINE - Jadikan outline sebagai checklist utama", tapi tidak ada mekanisme runtime yang:
1. Melacak section outline mana yang sudah selesai berdasarkan stage approval.
2. Mengizinkan revisi minor outline di tengah perjalanan (menambah/mengurangi subbab, memperbaiki kalimat).
3. Menampilkan progress outline secara visual ke user.

Akibatnya, outline hanya berfungsi sebagai teks referensi di prompt — bukan sebagai instrumen tracking aktif.

---

## 2) Tujuan dan Non-Goal

## 2.1 Tujuan

1. Outline menjadi living checklist yang auto-update status section berdasarkan stage approval.
2. User bisa melakukan minor edit outline di stage mana pun setelah stage 3 (outline) approved.
3. Progress outline terintegrasi di UI `SidebarProgress` (progress timeline sidebar desktop).
4. Perubahan outline tercatat untuk traceability.

## 2.2 Non-Goal

1. Tidak mengubah urutan 13 stage.
2. Tidak mengubah mekanisme approve/revise existing.
3. Tidak menambah icon baru di activity bar (embed di progress timeline existing).
4. Tidak mengubah `PaperStageProgress` (horizontal header bar) atau `MobileProgressBar` di V1.

---

## 3) Arsitektur Solusi

## 3.1 Fitur A: Auto-Check on Stage Approval

Saat `approveStage` mutation berjalan untuk stage X:
1. Cari semua outline sections yang root parent ID match stage X.
2. Update status section tersebut dari `empty`/`partial` menjadi `complete`.
3. Hitung ulang `completenessScore` berdasarkan jumlah section complete / total section.

## 3.2 Fitur B: Mid-Course Edit (Minor Revisions)

Mutation khusus `updateOutlineSections` yang:
1. Bisa dipanggil dari stage mana pun setelah outline approved.
2. Hanya mengizinkan perubahan pada level 2/3 sections (subbab dan poin).
3. Menolak perubahan pada level 1 sections (bab utama).
4. Mencatat setiap edit ke audit trail.

## 3.3 Stage-ID Matching (Mapping Mechanism)

Outline level-1 section IDs match ke stage IDs secara konvensi:

| Outline Section ID | Stage ID | Catatan |
| --- | --- | --- |
| `pendahuluan` | `pendahuluan` | Direct match |
| `tinjauan_literatur` | `tinjauan_literatur` | Direct match (underscore) |
| `metodologi` | `metodologi` | Direct match |
| `hasil` | `hasil` | Direct match |
| `diskusi` | `diskusi` | Direct match |
| `kesimpulan` | `kesimpulan` | Direct match |
| `daftar_pustaka` | `daftar_pustaka` | Direct match |
| `lampiran` | `lampiran` | Direct match |

Stage tanpa outline section (tidak ada sub-items di timeline):

| Stage | Alasan |
| --- | --- |
| `gagasan` | Pre-outline stage |
| `topik` | Pre-outline stage |
| `outline` | Meta stage (outline sendiri) |
| `abstrak` | Umumnya bukan bab terpisah di outline; jika user include, mapping tetap works |
| `judul` | Meta stage (pemilihan judul) |

Fallback: Jika outline section ID tidak match ke stage ID mana pun, section tersebut tetap tampil di timeline tapi tanpa auto-check trigger. User bisa manual update via mid-course edit.

## 3.4 Enforcement Konvensi Section ID (Critical Path)

Agar Stage-ID Matching berfungsi, outline creation di stage 3 HARUS menghasilkan level-1 section IDs yang match stage IDs. Ini perlu di-enforce di dua titik:

1. **Stage 3 instruction update**: Instruksi outline (`OUTLINE_INSTRUCTIONS` di `finalization.ts`) harus eksplisit mewajibkan level-1 section ID menggunakan stage ID resmi (`pendahuluan`, `tinjauan_literatur`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, `daftar_pustaka`, `lampiran`).

2. **Backend validation**: Mutation `updateStageData` untuk stage `outline` harus validate bahwa setiap level-1 section ID ada di whitelist stage IDs. Jika tidak match, kembalikan warning (bukan error, agar tidak blocking).

3. **Skill instruction**: `outline-skill` (SKILL.md) harus menyebut konvensi ini di section "Output Contract" dan "Guardrails".

Tanpa enforcement ini, auto-check mapping bisa miss semua sections jika AI/user memakai ID non-standar (misal "bab1" instead of "pendahuluan").

---

## 4) Perubahan Data Model

## 4.1 Perubahan pada OutlineSection (Existing)

Existing type di `src/lib/paper/stage-types.ts`:

```ts
interface OutlineSection {
  id: string
  judul?: string
  level?: number
  parentId?: string | null
  estimatedWordCount?: number
  status?: "complete" | "partial" | "empty"
}
```

Field tambahan:

```ts
interface OutlineSection {
  // ... existing fields
  checkedAt?: number        // Timestamp saat di-check (auto atau manual)
  checkedBy?: "auto" | "user"  // Sumber check: auto (stage approval) atau user (mid-course edit)
  editHistory?: Array<{     // Audit trail untuk mid-course edits (lightweight)
    action: "add" | "edit" | "remove"
    timestamp: number
    fromStage: string       // Stage mana saat edit dilakukan
  }>
}
```

Catatan: Field baru bersifat optional dan backward-compatible. Outline lama tanpa field ini tetap berfungsi normal.

## 4.2 Perubahan pada OutlineData (Existing)

```ts
interface OutlineData {
  // ... existing fields
  lastEditedAt?: number          // Timestamp edit terakhir (termasuk auto-check)
  lastEditedFromStage?: string   // Stage terakhir yang trigger edit
}
```

## 4.3 Tidak Perlu Tabel Baru

Semua data outline tetap di `stageData.outline` dalam `paperSessions` collection. Tidak perlu collection baru karena outline data bersifat embedded document, bukan entitas independen.

---

## 5) Perubahan Mutation

## 5.1 Modifikasi `approveStage` (Existing)

Lokasi: `convex/paperSessions.ts`

Tambahan logic setelah line "Mark current stage validated" (line ~1116):

```
// === Auto-check outline sections ===
// 1. Baca outline sections dari stageData.outline.sections
// 2. Filter sections yang root parent ID match currentStage
// 3. Update status menjadi "complete" + set checkedAt + checkedBy: "auto"
// 4. Hitung ulang completenessScore
// 5. Persist updated outline data ke stageData.outline
```

Guard:
1. Hanya jalankan jika `stageData.outline` ada (outline sudah pernah dibuat).
2. Hanya jalankan jika currentStage bukan stage pre-outline (`gagasan`, `topik`, `outline`).
3. Jika outline sections tidak punya match untuk currentStage, skip tanpa error.

## 5.2 Mutation Baru: `updateOutlineSections`

Lokasi: `convex/paperSessions.ts`

Input:

```ts
{
  sessionId: Id<"paperSessions">,
  userId: Id<"users">,
  edits: Array<{
    action: "add" | "edit" | "remove",
    sectionId: string,           // Target section ID
    parentId?: string,           // Required for "add"
    judul?: string,              // Required for "add" dan "edit"
    estimatedWordCount?: number, // Optional
  }>
}
```

Validasi:

1. Session harus ada dan user harus owner.
2. Outline harus sudah exist (`stageData.outline.sections` tidak kosong).
3. `currentStage` harus setelah `outline` (index > 2 di STAGE_ORDER).
4. Setiap edit harus target level 2 atau level 3 section:
   - `add`: parentId wajib merujuk section yang sudah ada. Section baru harus level 2 atau 3.
   - `edit`: sectionId harus exist dan level 2 atau 3. Hanya boleh ubah `judul` dan `estimatedWordCount`.
   - `remove`: sectionId harus exist dan level 2 atau 3. Tidak boleh remove jika section punya children (remove children dulu).
5. Menolak edit pada level 1 sections (bab utama) dengan error message jelas.
6. Maximum 5 edits per mutation call (prevent abuse).

Output:

```ts
{
  success: true,
  updatedSectionCount: number,
  newCompleteness: number,     // Recalculated completenessScore
  warnings?: string[]
}
```

Post-processing:
1. Recalculate `totalWordCount` dari semua sections.
2. Recalculate `completenessScore`.
3. Set `lastEditedAt` dan `lastEditedFromStage`.
4. Append edit entry ke section's `editHistory`.

## 5.3 Tidak Perlu Tool AI Baru di V1

Mid-course edit di V1 hanya dari UI (user klik edit di sidebar). AI tidak perlu tool baru karena:
1. AI sudah bisa baca outline dari prompt context.
2. Edit yang AI suggest bisa dilakukan user lewat UI.
3. Menambah AI tool untuk outline edit meningkatkan risiko AI mengubah outline tanpa persetujuan user.

Evaluasi AI tool untuk outline edit di V2 setelah usage data tersedia.

---

## 6) Perubahan UI

## 6.1 SidebarProgress Enhancement

Lokasi: `src/components/chat/sidebar/SidebarProgress.tsx`

Perubahan pada `MilestoneItem`:

```
SEBELUM:
● 5. Pendahuluan
  Sedang berjalan

SESUDAH (stage dengan outline sections):
● 5. Pendahuluan
  Sedang berjalan
    ✓ Latar Belakang
    ✓ Rumusan Masalah
    ○ Research Gap Analysis
    ○ Tujuan Penelitian

SESUDAH (stage tanpa outline sections):
● 1. Gagasan Paper
  Selesai
  (tidak ada sub-items — sama seperti sekarang)
```

Behavior expand/collapse:
1. **Current stage**: auto-expanded, sub-items visible.
2. **Completed stages**: collapsed by default, tampil summary count (misal "4/4 ✓"). Klik untuk expand.
3. **Pending stages**: collapsed, tampil total count (misal "0/3"). Klik untuk expand.

Interaksi:
1. Klik stage header toggle expand/collapse.
2. Checkbox status TIDAK bisa di-toggle manual oleh user — status hanya berubah via auto-check (stage approval). Ini mencegah user menandai section "complete" tanpa approval.
3. Struktur outline (tambah/edit/hapus subbab) BISA diedit via tombol "Edit Outline" kecil di header section (hanya visible saat expand). Lihat Section 6.2.

## 6.2 Edit Outline UI (V1 Minimal)

Saat user klik "Edit Outline" pada stage yang di-expand:
1. Inline edit mode: sub-items menjadi editable text fields.
2. Tombol `+` untuk tambah subbab.
3. Tombol `×` untuk hapus subbab.
4. Tombol "Simpan" untuk persist perubahan via `updateOutlineSections` mutation.
5. Tombol "Batal" untuk discard.

Guard UI:
1. Level 1 sections (bab utama) tidak bisa diedit/dihapus — tampil disabled dengan tooltip "Bab utama tidak bisa diubah".
2. Tombol edit hanya muncul jika `currentStage` setelah `outline` (index > 2).

## 6.3 Tidak Ubah Komponen Lain di V1

Komponen berikut tidak diubah:
1. `PaperStageProgress` (horizontal header bar) — tetap badge-only.
2. `MobileProgressBar` — tetap circle-only.
3. Pertimbangkan enhancement di V2 setelah desktop sidebar terbukti stabil.

---

## 7) Helper Functions

## 7.1 Outline Section Utilities

Lokasi yang disarankan: `src/lib/paper/outline-utils.ts` (baru)

```ts
// Cari root parent stage ID dari sebuah section
function getRootStageId(sectionId: string, sections: OutlineSection[]): string | null

// Filter sections yang belong ke stage tertentu
function getSectionsForStage(stageId: string, sections: OutlineSection[]): OutlineSection[]

// Hitung completeness score
function calculateCompleteness(sections: OutlineSection[]): number

// Validate edit: apakah edit ini legal (level 2/3 only, parent exists, dll)
function validateOutlineEdit(edit: OutlineEdit, sections: OutlineSection[]): { valid: boolean, reason?: string }

// Recalculate total word count
function recalculateTotalWordCount(sections: OutlineSection[]): number
```

## 7.2 Root Stage ID Resolution

Logika `getRootStageId`:
1. Dari section ID, traverse parentId chain sampai level 1.
2. Level 1 section ID = root stage ID.
3. Jika section ID sendiri adalah level 1 (parentId null), return section ID langsung.

Contoh:
- `"pendahuluan.latarBelakang"` → parent `"pendahuluan"` → level 1 → return `"pendahuluan"`
- `"hasil.temuan1.point1"` → parent `"hasil.temuan1"` → parent `"hasil"` → level 1 → return `"hasil"`

---

## 8) Prioritas Aturan dan Constraint

1. `approveStage` mutation tetap authority utama — auto-check outline adalah side-effect, bukan prasyarat.
2. Jika auto-check gagal (outline data corrupt/missing), `approveStage` tetap sukses — auto-check di-skip dan warning di-log.
3. Mid-course edit tidak boleh mengubah level 1 sections — ini enforced di mutation, bukan hanya UI.
4. Rewind stage meng-reset checklist: jika user rewind ke stage X, outline sections yang di-check oleh stage X+1 s/d currentStage di-reset ke status sebelumnya.

---

## 9) Interaksi dengan Rewind

Saat `rewindToStage(targetStage)`:
1. Identifikasi stages yang di-invalidate (targetStage+1 s/d currentStage).
2. Untuk setiap invalidated stage, cari outline sections yang `checkedBy: "auto"` dan `checkedAt` setelah stage approval.
3. Reset sections tersebut: `status` kembali ke `partial` atau `empty`, `checkedAt` dan `checkedBy` di-clear.
4. Recalculate `completenessScore`.
5. Sections yang di-edit manual (`checkedBy: "user"`) TIDAK di-reset oleh rewind.

---

## 10) Observability

1. `console.log` saat auto-check:
   - `[autoCheckOutline] stage=pendahuluan sections_checked=4 new_completeness=38%`
2. `console.log` saat mid-course edit:
   - `[updateOutlineSections] stage=metodologi edits=2 (add:1, edit:1) new_completeness=42%`
3. `console.warn` saat auto-check di-skip:
   - `[autoCheckOutline] SKIPPED: outline data not found for session=<id>`

---

## 11) Rencana Implementasi Bertahap

## Phase 1: Auto-Check (Fitur A)

1. Buat helper functions (`outline-utils.ts`).
2. Unit test helper functions.
3. Update stage 3 instruction + `outline-skill` untuk enforce konvensi section ID (Section 3.4).
4. Modifikasi `approveStage` mutation untuk auto-check outline sections.
5. Modifikasi `rewindToStage` mutation untuk reset auto-checked sections (basic: reset sections dari invalidated stages yang `checkedBy: "auto"`).
6. Enhance `SidebarProgress` UI: tampil sub-items dengan expand/collapse.
7. Test end-to-end: approve stage → auto-check → rewind → reset → UI update.

## Phase 2: Mid-Course Edit (Fitur B)

1. Implement `updateOutlineSections` mutation dengan validasi.
2. Unit test mutation (add/edit/remove, guard level 1, max edits).
3. Build inline edit UI di `SidebarProgress`.
4. Extend rewind handler: tambah logic untuk preserve manual edits (`checkedBy: "user"`) saat reset.
5. Test end-to-end: edit outline → rewind → verify manual edits preserved + auto-checks reset.

---

## 12) Acceptance Criteria

1. Saat stage X di-approve, outline sections yang root parent match X otomatis berubah status ke `complete`.
2. `completenessScore` di-recalculate setelah setiap auto-check.
3. User bisa tambah/edit/hapus subbab (level 2/3) dari stage mana pun setelah outline approved.
4. Level 1 sections (bab utama) tidak bisa diubah — enforced di backend dan UI.
5. Rewind me-reset auto-checked sections yang berasal dari invalidated stages.
6. `SidebarProgress` menampilkan outline sub-items dengan expand/collapse behavior:
   - Current stage: auto-expanded
   - Completed stages: collapsed, klik untuk expand
   - Pending stages: collapsed, klik untuk expand
7. Jika outline belum ada (stage 1-3), timeline tampil sama seperti sekarang.
8. Auto-check failure tidak memblokir `approveStage` (graceful skip + log).

---

## 13) Dampak ke File/Modul

1. `src/lib/paper/stage-types.ts` — tambah field `checkedAt`, `checkedBy`, `editHistory` ke `OutlineSection`; tambah `lastEditedAt`, `lastEditedFromStage` ke `OutlineData`.
2. `src/lib/paper/outline-utils.ts` (baru) — helper functions.
3. `src/lib/paper/outline-utils.test.ts` (baru) — unit tests.
4. `convex/paperSessions.ts` — modifikasi `approveStage`, tambah `updateOutlineSections` mutation.
5. `src/components/chat/sidebar/SidebarProgress.tsx` — enhance `MilestoneItem` dengan sub-items, expand/collapse, edit UI.
6. `src/lib/hooks/usePaperSession.ts` — mungkin perlu expose outline data dan edit mutation.

---

## 14) Risiko dan Mitigasi

| Risiko | Level | Mitigasi |
| --- | --- | --- |
| Outline section IDs tidak match stage IDs | Medium | Enforce konvensi saat outline creation (stage 3 instruction). Fallback: no-match = no auto-check, bukan error. |
| Timeline jadi terlalu panjang | Low | Expand/collapse behavior (A). Hanya current stage expanded by default. |
| Mid-course edit bikin outline diverge dari konten | Medium | Level 1 locked. Audit trail per edit. User responsibility. |
| Auto-check gagal karena outline data corrupt | Low | Graceful skip + warning log. approveStage tidak terblokir. |
| Rewind + outline reset logic complex | Medium | Unit test extensive untuk combinatorial cases (rewind + auto-check + manual edit). |

---

## 15) Open Questions

1. Apakah `MobileProgressBar` perlu enhancement serupa di V2? (Rekomendasi: ya, setelah desktop stabil.)
2. Apakah AI perlu tool `updateOutlineSections` di V2? (Rekomendasi: evaluasi setelah usage data.)
3. Apakah outline edit perlu approval flow tersendiri? (Rekomendasi: tidak di V1, user langsung save.)

---

## 16) Referensi

1. `src/lib/paper/stage-types.ts` — OutlineSection dan OutlineData types
2. `convex/paperSessions.ts` — approveStage mutation (line ~1050)
3. `convex/paperSessions/constants.ts` — STAGE_ORDER
4. `src/components/chat/sidebar/SidebarProgress.tsx` — MilestoneItem sub-component
5. `src/components/paper/PaperStageProgress.tsx` — horizontal stage badges
6. `src/lib/hooks/usePaperSession.ts` — paper session hook
7. `docs/skill-per-stage/README.md` — skill-per-stage design overview
