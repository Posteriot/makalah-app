# W3 Execution Checklist (Chat Style Standardization)

Dokumen ini adalah panduan eksekusi operasional untuk `Wave W3 (P1)` pada standardisasi style halaman chat.

## 1. Tujuan W3

- Menyelesaikan migrasi token untuk paper/rewind UI pada chat tanpa mengubah baseline visual.
- Menetapkan bukti faktual bahwa file W3 memenuhi:
- `0 hardcoded color`
- `0 dark:` untuk warna/border/shadow
- seluruh warna/border/shadow memakai semantic token `--ds-*` dalam scope `data-ds-scope="chat-v1"`

## 2. Scope W3 (Wajib Tuntas)

File target W3:

- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- `src/components/paper/RewindConfirmationDialog.tsx`
- `src/components/paper/PaperSessionBadge.tsx`
- `src/components/paper/PaperStageProgress.tsx`
- `src/components/chat/VersionHistoryDialog.tsx`

## 3. Prasyarat Sebelum Eksekusi

- W1 dan W2 sudah stabil atau minimal tidak ada regresi open pada shell + artifact utama.
- Kontrak token dan blueprint sudah jadi acuan:
- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- Root chat sudah punya scope selector: `data-ds-scope="chat-v1"`.

## 4. Strategi Eksekusi (Urutan Tetap)

1. Validasi token W3 yang dibutuhkan tersedia di `src/app/globals-new.css`.
2. Migrasikan file W3 satu per satu (jangan paralel banyak file sekaligus).
3. Setelah tiap file selesai, jalankan validasi per-file (lihat Seksi 5).
4. Setelah semua file W3 selesai, jalankan gate regresi W3 (lihat Seksi 6).

## 5. Validasi Per-File (Hard Rule)

Gunakan query berikut pada file yang sedang dimigrasi:

```bash
# A. pastikan tidak ada dark: untuk warna/border/shadow
rg -n "dark:(bg|text|border|shadow)-" <FILE>

# B. pastikan tidak ada hardcoded color class
rg -n "(^|\\s)(bg|text|border|ring|shadow)-(slate|stone|zinc|gray|neutral|red|rose|amber|yellow|green|emerald|sky|blue|indigo|purple|pink|black|white)-" <FILE>

# C. pastikan semantic token benar-benar dipakai
rg -n "var\\(--ds-" <FILE>
```

Lulus per-file jika:

- Query A: `0 match`
- Query B: `0 match`
- Query C: `>= 1 match` (atau N/A untuk file yang tidak mengatur warna)

## 6. Regression Gate Setelah W3 Selesai

Wajib lulus untuk 4 matrix:

- M1: Desktop + Dark
- M2: Desktop + Light
- M3: Mobile + Dark
- M4: Mobile + Light

Skenario minimum W3:

- Sidebar progress dan paper sessions tetap sinkron dengan state sesi paper.
- Paper validation panel (approve/revisi) tetap jelas, readable, dan tidak kehilangan state visual.
- Rewind confirmation dialog tetap punya hierarki visual benar (overlay, panel, tombol aksi).
- Stage badge/current stage indicator tetap terbaca jelas untuk status drafting/pending/approved.
- Version history dialog chat tetap stabil saat open/close/switch item.
- Invalidation warning/state paper-artifact tetap terlihat konsisten di dark/light.

Referensi gate:

- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 7. Checklist Eksekusi W3

| File | Migrasi Token | Validasi A/B/C | Visual M1-M4 | Status |
|---|---|---|---|---|
| `src/components/chat/sidebar/SidebarProgress.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/chat/sidebar/SidebarPaperSessions.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/paper/PaperValidationPanel.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/paper/RewindConfirmationDialog.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/paper/PaperSessionBadge.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/paper/PaperStageProgress.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/VersionHistoryDialog.tsx` | [ ] | [ ] | [ ] | [ ] |

## 8. Evidence Template (Wajib Diisi)

```md
## W3 Execution Evidence

- Date:
- Commit/Branch:
- Scope: W3

| File | A (`dark:`) | B (hardcoded) | C (`var(--ds-)`) | Visual M1-M4 | Result |
|---|---|---|---|---|---|
| src/components/chat/sidebar/SidebarProgress.tsx | 0 | 0 | 5 | PASS | PASS |

### Notes
- mismatch kecil:
- keputusan:
```

### W3 Execution Evidence (Current)

- Date: 2026-02-23 03:05:09 WIB
- Scope: W3-A + W3-B (`SidebarProgress.tsx`, `SidebarPaperSessions.tsx`, `PaperValidationPanel.tsx`, `RewindConfirmationDialog.tsx`)
- Result summary:
- `src/components/chat/sidebar/SidebarProgress.tsx`: A=0, B=0, C=11
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`: A=0, B=0, C=11
- `src/components/paper/PaperValidationPanel.tsx`: A=0, B=0, C=6
- `src/components/paper/RewindConfirmationDialog.tsx`: A=0, B=0, C=5
- Visual gate M1-M4 untuk W3: belum dijalankan (pending setelah semua file W3 selesai).

## 9. Aturan Stop

Eksekusi W3 harus berhenti sementara jika:

- Ada perubahan visual mayor dibanding baseline UI paper/rewind.
- Ada kebutuhan token baru yang belum terdefinisi di `token-mapping-v1.md`.
- Ada konflik aturan dengan `context-rules.md`.
- Ada regresi fungsional pada approval, rewind, atau history flow.

Saat stop, keputusan baru wajib ditulis dulu di dokumen aturan sebelum lanjut.

## 10. Definition of Done W3

W3 dianggap selesai jika:

- 7/7 file W3 status `PASS`.
- Validasi A dan B nol temuan di semua file W3.
- Semua item visual M1-M4 untuk scope W3 lulus.
- Tidak ada regresi fungsional pada flow paper validation/rewind/history.
- Evidence template terisi lengkap.

## 11. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/system-design-standarization/chat-page-style/w1-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w2-execution-checklist.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
