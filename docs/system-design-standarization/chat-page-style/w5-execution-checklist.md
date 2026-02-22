# W5 Execution Checklist (Chat Style Standardization)

Dokumen ini adalah panduan eksekusi operasional untuk `Wave W5 (P2)` pada standardisasi style halaman chat.

## 1. Tujuan W5

- Menyelesaikan migrasi token untuk indikator dan status UI pendukung chat tanpa mengubah baseline visual.
- Menetapkan bukti faktual bahwa file W5 memenuhi:
- `0 hardcoded color`
- `0 dark:` untuk warna/border/shadow
- seluruh warna/border/shadow memakai semantic token `--ds-*` dalam scope `data-ds-scope="chat-v1"`

## 2. Scope W5 (Wajib Tuntas)

File target W5:

- `src/components/chat/InlineCitationChip.tsx`
- `src/components/chat/QuotaWarningBanner.tsx`
- `src/components/chat/SearchStatusIndicator.tsx`
- `src/components/chat/SourcesIndicator.tsx`
- `src/components/chat/ToolStateIndicator.tsx`

## 3. Prasyarat Sebelum Eksekusi

- W1, W2, W3, dan W4 sudah stabil atau minimal tidak ada regresi open pada shell + artifact + paper + refrasa flow.
- Kontrak token dan blueprint sudah jadi acuan:
- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- Root chat sudah punya scope selector: `data-ds-scope="chat-v1"`.

## 4. Strategi Eksekusi (Urutan Tetap)

1. Validasi token W5 yang dibutuhkan tersedia di `src/app/globals-new.css`.
2. Migrasikan file W5 satu per satu (jangan paralel banyak file sekaligus).
3. Setelah tiap file selesai, jalankan validasi per-file (lihat Seksi 5).
4. Setelah semua file W5 selesai, jalankan gate regresi W5 (lihat Seksi 6).

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

## 6. Regression Gate Setelah W5 Selesai

Wajib lulus untuk 4 matrix:

- M1: Desktop + Dark
- M2: Desktop + Light
- M3: Mobile + Dark
- M4: Mobile + Light

Skenario minimum W5:

- Inline citation chip tetap terbaca, hover state stabil, dan tidak kontras berlebih di dark/light.
- Quota warning banner (warning/depleted) tetap jelas, hierarki informasi tetap terbaca.
- Search status indicator (loading/success/error) tetap konsisten dan tidak ambigu di dark/light.
- Sources indicator tetap menjaga sinyal visual sumber eksternal dengan kontras aman.
- Tool state indicator tetap menunjukkan status tool dengan warna/status yang konsisten.

Referensi gate:

- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 7. Checklist Eksekusi W5

| File | Migrasi Token | Validasi A/B/C | Visual M1-M4 | Status |
|---|---|---|---|---|
| `src/components/chat/InlineCitationChip.tsx` | [x] | [x] | M1-M4 [x] | [x] |
| `src/components/chat/QuotaWarningBanner.tsx` | [x] | [x] | M1-M4 [x] | [x] |
| `src/components/chat/SearchStatusIndicator.tsx` | [x] | [x] | M1-M4 [x] | [x] |
| `src/components/chat/SourcesIndicator.tsx` | [x] | [x] | M1-M4 [x] | [x] |
| `src/components/chat/ToolStateIndicator.tsx` | [x] | [x] | M1-M4 [x] | [x] |

## 8. Evidence Template (Wajib Diisi)

## W5 Execution Evidence

- Date: 2026-02-23 02:56:41 WIB
- Commit/Branch: `499468e` / `main`
- Scope: W5

| File | A (`dark:`) | B (hardcoded) | C (`var(--ds-)`) | Visual M1-M4 | Result |
|---|---|---|---|---|---|
| `src/components/chat/InlineCitationChip.tsx` | 0 | 0 | 1 | M1-M4 PASS | PASS |
| `src/components/chat/QuotaWarningBanner.tsx` | 0 | 0 | 10 | M1-M4 PASS | PASS |
| `src/components/chat/SearchStatusIndicator.tsx` | 0 | 0 | 8 | M1-M4 PASS | PASS |
| `src/components/chat/SourcesIndicator.tsx` | 0 | 0 | 5 | M1-M4 PASS | PASS |
| `src/components/chat/ToolStateIndicator.tsx` | 0 | 0 | 2 | M1-M4 PASS | PASS |

### Notes
- Screenshot evidence:
- `screenshots/w5-m1-dark-static.png`
- `screenshots/w5-m1-dark-generating.png`
- `screenshots/w5-m2-light-static.png`
- `screenshots/w5-m2-light-generating.png`
- `screenshots/w5-m3-mobile-dark-static.png`
- `screenshots/w5-m3-mobile-dark-generating.png`
- `screenshots/w5-m4-mobile-light-static.png`
- `screenshots/w5-m4-mobile-light-generating.png`
- Runtime check: tidak terdeteksi string error `Galat: tidak diketahui` pada sesi verifikasi ini.
- Catatan viewport mobile: verifikasi dilakukan pada viewport aktif browser dengan `window.innerWidth=500` dan `window.innerHeight=736`.

## 9. Aturan Stop

Eksekusi W5 harus berhenti sementara jika:

- Ada perubahan visual mayor dibanding baseline UI indicator/status chat.
- Ada kebutuhan token baru yang belum terdefinisi di `token-mapping-v1.md`.
- Ada konflik aturan dengan `context-rules.md`.
- Ada regresi fungsional pada alur indikator status (citation/search/tool/quota/sources).

Saat stop, keputusan baru wajib ditulis dulu di dokumen aturan sebelum lanjut.

## 10. Definition of Done W5

W5 dianggap selesai jika:

- 5/5 file W5 status `PASS`.
- Validasi A dan B nol temuan di semua file W5.
- Semua item visual M1-M4 untuk scope W5 lulus.
- Tidak ada regresi fungsional pada indicator/status flow di chat.
- Evidence template terisi lengkap.

## 11. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/system-design-standarization/chat-page-style/w1-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w2-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w3-execution-checklist.md`
- `docs/system-design-standarization/chat-page-style/w4-execution-checklist.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
