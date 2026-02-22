# W2 Execution Checklist (Chat Style Standardization)

Dokumen ini adalah panduan eksekusi operasional untuk `Wave W2 (P0)` pada standardisasi style halaman chat.

## 1. Tujuan W2

- Menyelesaikan migrasi token untuk artifact workspace utama tanpa mengubah baseline visual.
- Menetapkan bukti faktual bahwa file W2 memenuhi:
- `0 hardcoded color`
- `0 dark:` untuk warna/border/shadow
- seluruh warna/border/shadow memakai semantic token `--ds-*` dalam scope `data-ds-scope="chat-v1"`

## 2. Scope W2 (Wajib Tuntas)

File target W2:

- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/ArtifactTabs.tsx`
- `src/components/chat/ArtifactToolbar.tsx`
- `src/components/chat/ArtifactViewer.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/ArtifactEditor.tsx`
- `src/components/chat/ArtifactIndicator.tsx`
- `src/components/chat/ArtifactList.tsx`
- `src/components/chat/MarkdownRenderer.tsx`

## 3. Prasyarat Sebelum Eksekusi

- W1 sudah stabil atau minimal tidak ada regresi open di shell chat.
- Kontrak token dan blueprint sudah jadi acuan:
- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- Root chat sudah punya scope selector: `data-ds-scope="chat-v1"`.

## 4. Strategi Eksekusi (Urutan Tetap)

1. Validasi token W2 yang dibutuhkan tersedia di `src/app/globals-new.css`.
2. Migrasikan file W2 satu per satu (jangan paralel banyak file sekaligus).
3. Setelah tiap file selesai, jalankan validasi per-file (lihat Seksi 5).
4. Setelah semua file W2 selesai, jalankan gate regresi W2 (lihat Seksi 6).

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

## 6. Regression Gate Setelah W2 Selesai

Wajib lulus untuk 4 matrix:

- M1: Desktop + Dark
- M2: Desktop + Light
- M3: Mobile + Dark
- M4: Mobile + Light

Skenario minimum W2:

- Artifact indicator tampil konsisten saat AI membuat/memperbarui artifact.
- Artifact panel bisa open/close tanpa glitch layout.
- Tab lifecycle stabil: open tab, switch tab, close tab, close all.
- Toolbar state (action enabled/disabled) tetap terbaca dan tidak hilang di mode dark/light.
- Viewer dan editor tetap readable untuk konten panjang.
- Fullscreen modal: backdrop, border, focus, close action, dan unsaved guard tetap berfungsi.
- Markdown renderer: heading/list/table/code block/citation visual tetap konsisten di dark/light.

Referensi gate:

- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 7. Checklist Eksekusi W2

| File | Migrasi Token | Validasi A/B/C | Visual M1-M4 | Status |
|---|---|---|---|---|
| `src/components/chat/ArtifactPanel.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/chat/ArtifactTabs.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/chat/ArtifactToolbar.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/chat/ArtifactViewer.tsx` | [x] | [x] | [ ] | [x] |
| `src/components/chat/FullsizeArtifactModal.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ArtifactEditor.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ArtifactIndicator.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ArtifactList.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/MarkdownRenderer.tsx` | [ ] | [ ] | [ ] | [ ] |

## 8. Evidence Template (Wajib Diisi)

```md
## W2 Execution Evidence

- Date:
- Commit/Branch:
- Scope: W2

| File | A (`dark:`) | B (hardcoded) | C (`var(--ds-)`) | Visual M1-M4 | Result |
|---|---|---|---|---|---|
| src/components/chat/ArtifactPanel.tsx | 0 | 0 | 8 | PASS | PASS |

### Notes
- mismatch kecil:
- keputusan:
```

## 9. Aturan Stop

Eksekusi W2 harus berhenti sementara jika:

- Ada perubahan visual mayor dibanding baseline artifact workspace.
- Ada kebutuhan token baru yang belum terdefinisi di `token-mapping-v1.md`.
- Ada konflik aturan dengan `context-rules.md`.
- Ada regresi fungsional pada open/switch/close artifact tab.

Saat stop, keputusan baru wajib ditulis dulu di dokumen aturan sebelum lanjut.

## 10. Definition of Done W2

W2 dianggap selesai jika:

- 9/9 file W2 status `PASS`.
- Validasi A dan B nol temuan di semua file W2.
- Semua item visual M1-M4 untuk scope W2 lulus.
- Tidak ada regresi fungsional artifact workspace pada alur utama.
- Evidence template terisi lengkap.

## 11. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/system-design-standarization/chat-page-style/w1-execution-checklist.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
