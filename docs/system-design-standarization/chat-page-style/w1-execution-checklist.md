# W1 Execution Checklist (Chat Style Standardization)

Dokumen ini adalah panduan eksekusi operasional untuk `Wave W1 (P0)` pada standardisasi style halaman chat.

## 1. Tujuan W1

- Menyelesaikan migrasi token untuk shell chat + entry interaction tanpa mengubah baseline visual.
- Menetapkan bukti faktual bahwa file W1 memenuhi:
- `0 hardcoded color`
- `0 dark:` untuk warna/border/shadow
- seluruh warna/border/shadow memakai semantic token `--ds-*` dalam scope `data-ds-scope="chat-v1"`

## 2. Scope W1 (Wajib Tuntas)

File target W1:

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/layout/TopBar.tsx`
- `src/components/chat/layout/ActivityBar.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/ChatInput.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/layout/PanelResizer.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/messages/TemplateGrid.tsx`
- `src/components/chat/ChatProcessStatusBar.tsx`
- `src/components/chat/ThinkingIndicator.tsx`
- `src/components/chat/QuickActions.tsx`

## 3. Prasyarat Sebelum Eksekusi

- Keputusan DQ-01 sudah locked.
- Kontrak token dan blueprint sudah jadi acuan:
- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- Root chat sudah punya scope selector: `data-ds-scope="chat-v1"`.

## 4. Strategi Eksekusi (Urutan Tetap)

1. Siapkan semantic token di `src/app/globals-new.css` sesuai `token-mapping-v1.md`.
2. Migrasikan file W1 satu per satu (jangan paralel banyak file sekaligus).
3. Setelah tiap file selesai, jalankan validasi per-file (lihat Seksi 5).
4. Setelah semua file W1 selesai, jalankan gate regresi W1 (lihat Seksi 6).

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

## 6. Regression Gate Setelah W1 Selesai

Wajib lulus untuk 4 matrix:

- M1: Desktop + Dark
- M2: Desktop + Light
- M3: Mobile + Dark
- M4: Mobile + Light

Skenario minimum W1:

- Empty state di `/chat` tetap tampil benar.
- Open conversation `/chat/[conversationId]` tetap stabil saat stream.
- Sidebar desktop/mobile tetap berfungsi (expand/collapse/sheet).
- Input, bubble, quick actions, thinking indicator, status bar tetap terbaca dan interaktif.

Referensi gate:

- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 7. Checklist Eksekusi W1

| File | Migrasi Token | Validasi A/B/C | Visual M1-M4 | Status |
|---|---|---|---|---|
| `src/components/chat/layout/ChatLayout.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/layout/TopBar.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/layout/ActivityBar.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ChatSidebar.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ChatWindow.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ChatInput.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/MessageBubble.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/layout/PanelResizer.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/messages/TemplateGrid.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ChatProcessStatusBar.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/ThinkingIndicator.tsx` | [ ] | [ ] | [ ] | [ ] |
| `src/components/chat/QuickActions.tsx` | [ ] | [ ] | [ ] | [ ] |

## 8. Evidence Template (Wajib Diisi)

```md
## W1 Execution Evidence

- Date:
- Commit/Branch:
- Scope: W1

| File | A (`dark:`) | B (hardcoded) | C (`var(--ds-)`) | Visual M1-M4 | Result |
|---|---|---|---|---|---|
| src/components/chat/layout/ChatLayout.tsx | 0 | 0 | 6 | PASS | PASS |

### Notes
- mismatch kecil:
- keputusan:
```

## 9. Aturan Stop

Eksekusi W1 harus berhenti sementara jika:

- Ada perubahan visual mayor dibanding baseline.
- Ada kebutuhan token baru yang belum terdefinisi di `token-mapping-v1.md`.
- Ada konflik aturan dengan `context-rules.md`.

Saat stop, keputusan baru wajib ditulis dulu di dokumen aturan sebelum lanjut.

## 10. Definition of Done W1

W1 dianggap selesai jika:

- 13/13 file W1 status `PASS`.
- Validasi A dan B nol temuan di semua file W1.
- Semua item visual M1-M4 untuk scope W1 lulus.
- Evidence template terisi lengkap.

## 11. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
