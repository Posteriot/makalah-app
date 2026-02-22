# W4 Execution Checklist (Chat Style Standardization)

Dokumen ini adalah panduan eksekusi operasional untuk `Wave W4 (P1)` pada standardisasi style halaman chat.

## 1. Tujuan W4

- Menyelesaikan migrasi token untuk Refrasa integration UI pada chat tanpa mengubah baseline visual.
- Menetapkan bukti faktual bahwa file W4 memenuhi:
- `0 hardcoded color`
- `0 dark:` untuk warna/border/shadow
- seluruh warna/border/shadow memakai semantic token `--ds-*` dalam scope `data-ds-scope="chat-v1"`

## 2. Scope W4 (Wajib Tuntas)

File target W4:

- `src/components/refrasa/RefrasaToolbar.tsx`
- `src/components/refrasa/RefrasaTabContent.tsx`
- `src/components/refrasa/RefrasaIssueItem.tsx`
- `src/components/refrasa/RefrasaLoadingIndicator.tsx`

## 3. Prasyarat Sebelum Eksekusi

- W1, W2, dan W3 sudah stabil atau minimal tidak ada regresi open pada shell + artifact + paper flow.
- Kontrak token dan blueprint sudah jadi acuan:
- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- Root chat sudah punya scope selector: `data-ds-scope="chat-v1"`.

## 4. Strategi Eksekusi (Urutan Tetap)

1. Validasi token W4 yang dibutuhkan tersedia di `src/app/globals-new.css`.
2. Migrasikan file W4 satu per satu (jangan paralel banyak file sekaligus).
3. Setelah tiap file selesai, jalankan validasi per-file (lihat Seksi 5).
4. Setelah semua file W4 selesai, jalankan gate regresi W4 (lihat Seksi 6).

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

## 6. Regression Gate Setelah W4 Selesai

Wajib lulus untuk 4 matrix:

- M1: Desktop + Dark
- M2: Desktop + Light
- M3: Mobile + Dark
- M4: Mobile + Light

Skenario minimum W4:

- Refrasa toolbar state (action aktif/nonaktif) tetap jelas dan konsisten.
- Refrasa tab content tetap readable untuk konten panjang dan status campuran.
- Refrasa issue item (severity, selection, status) tetap jelas di dark/light.
- Refrasa loading indicator tetap terbaca dan tidak mengganggu layout utama.
- Integrasi tampilan Refrasa dengan artifact workspace tetap konsisten saat tab switch.

Referensi gate:

- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 7. Checklist Eksekusi W4

| File | Migrasi Token | Validasi A/B/C | Visual M1-M4 | Status |
|---|---|---|---|---|
| `src/components/refrasa/RefrasaToolbar.tsx` | [x] | [x] | [x] | [x] |
| `src/components/refrasa/RefrasaTabContent.tsx` | [x] | [x] | [x] | [x] |
| `src/components/refrasa/RefrasaIssueItem.tsx` | [x] | [x] | [x] | [x] |
| `src/components/refrasa/RefrasaLoadingIndicator.tsx` | [x] | [x] | [x] | [x] |

## 8. Evidence Template (Wajib Diisi)

## W4 Execution Evidence

- Date: 2026-02-23 04:29:41 WIB
- Commit/Branch: `5aabdc1` / `main`
- Scope: W4

| File | A (`dark:`) | B (hardcoded) | C (`var(--ds-)`) | Visual M1-M4 | Result |
|---|---|---|---|---|---|
| `src/components/refrasa/RefrasaToolbar.tsx` | 0 | 0 | 15 | M1-M4 PASS | PASS |
| `src/components/refrasa/RefrasaTabContent.tsx` | 0 | 0 | 13 | M1-M4 PASS | PASS |
| `src/components/refrasa/RefrasaIssueItem.tsx` | 0 | 0 | 7 | M1-M4 PASS | PASS |
| `src/components/refrasa/RefrasaLoadingIndicator.tsx` | 0 | 0 | 2 | M1-M4 PASS | PASS |

### Notes
- Screenshot evidence:
- `screenshots/w4-m1-dark-refrasa-main.png`
- `screenshots/w4-m1-dark-refrasa-issues.png`
- `screenshots/w4-m1-dark-refrasa-compare.png`
- `screenshots/w4-m2-light-refrasa-issues.png`
- `screenshots/w4-m2-light-refrasa-compare.png`
- `screenshots/w4-m3-mobile-dark-main.png`
- `screenshots/w4-m3-mobile-dark-issues.png`
- `screenshots/w4-m4-mobile-light-main.png`
- `screenshots/w4-m4-mobile-light-issues.png`
- Lint check file W4: PASS (0 error, 0 warning) pada 4 file scope.
- Runtime check: setelah reload, error duplicate key di Refrasa toolbar tidak muncul lagi di console.
- Penyesuaian keterbacaan: tombol `Terapkan` Refrasa digelapkan dengan token khusus `--ds-refrasa-apply-*` (light: emerald-700/600, dark: emerald-600/500) agar kontras teks lebih kuat.
- Catatan mobile: pada viewport mobile saat ini, panel artifak/refrasa collapse ke lebar `0px`; verifikasi M3/M4 dilakukan pada state chat + indikator related dan dipastikan tidak crash/regresi fungsional.

## 9. Aturan Stop

Eksekusi W4 harus berhenti sementara jika:

- Ada perubahan visual mayor dibanding baseline UI Refrasa.
- Ada kebutuhan token baru yang belum terdefinisi di `token-mapping-v1.md`.
- Ada konflik aturan dengan `context-rules.md`.
- Ada regresi fungsional pada flow Refrasa (issue selection, apply, tab integration).

Saat stop, keputusan baru wajib ditulis dulu di dokumen aturan sebelum lanjut.

## 10. Definition of Done W4

W4 dianggap selesai jika:

- 4/4 file W4 status `PASS`.
- Validasi A dan B nol temuan di semua file W4.
- Semua item visual M1-M4 untuk scope W4 lulus.
- Tidak ada regresi fungsional pada flow Refrasa di artifact workspace.
- Evidence template terisi lengkap.

## 11. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/system-design-standarization/chat-page-style/w1-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w2-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w3-execution-checklist.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
