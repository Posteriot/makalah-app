# Footer Migration Checklist

Checklist ini menurunkan findings audit footer menjadi urutan kerja migrasi yang bisa dieksekusi.

Dokumen ini belum memuat patch implementasi rinci.
Fungsinya adalah menjembatani:

- audit findings
- design keputusan migrasi
- implementation plan

## Objective

Membersihkan footer non-chat agar:

- benar-benar terpusat lewat satu kontrak shell yang konsisten
- tidak lagi bertopang diam-diam pada fallback `globals.css`
- lebih disiplin terhadap semantic token di `globals-new.css`
- punya authority konten yang jelas antara CMS dan frontend
- tidak lagi menampilkan fallback yang tampak final tetapi sebenarnya placeholder
- punya safety net test minimum sebelum redesign visual dilakukan

## Phase 1: Stabilize Footer Shell Contract

Tujuan fase:

- memastikan footer non-chat yang memang memakai footer global berjalan di bawah kontrak shell yang sama

Checklist:

- [ ] Petakan seluruh layout non-chat yang saat ini merender `Footer`.
- [ ] Pastikan shell yang memakai `Footer` memberi kontrak token yang eksplisit dan seragam.
- [ ] Verifikasi footer tidak lagi bergantung pada kebetulan fallback utility dari `globals.css`.
- [ ] Catat route family non-chat yang memang tetap berada di luar shell footer global sebagai boundary, bukan inkonsistensi.

Done jika:

- footer marketing dan dashboard membaca kontrak shell yang sama
- tidak ada ambiguity apakah footer sedang berjalan lewat jalur `core` atau jalur legacy

## Phase 2: Normalize Footer Styling Contract

Tujuan fase:

- memastikan footer memakai semantic token layer secara konsisten

Checklist:

- [ ] Inventaris semua akses token footer yang masih menembus langsung ke token mentah `core`.
- [ ] Ganti penggunaan token mentah yang seharusnya sudah punya semantic alias.
- [ ] Verifikasi utility seperti `text-narrative`, `text-interface`, `gap-comfort`, `icon-interface`, dan hairline footer tetap bekerja di semua shell footer non-chat.
- [ ] Pastikan styling footer tidak menambah dependency baru ke `globals.css`.

Done jika:

- footer memakai jalur token semantik yang konsisten
- tidak ada akses token mentah yang tersisa tanpa alasan eksplisit

## Phase 3: Clean Up CMS and Frontend Authority

Tujuan fase:

- memperjelas sumber kebenaran konten footer

Checklist:

- [ ] Putuskan apakah `Lapor Masalah` adalah link CMS, link sistem, atau hybrid contract yang eksplisit.
- [ ] Selaraskan perilaku render footer dengan ekspektasi editor CMS.
- [ ] Pastikan struktur yang disimpan admin sesuai dengan struktur final yang dirender user, kecuali override sistem yang memang disepakati.
- [ ] Dokumentasikan aturan injeksi atau proteksi link footer yang tidak boleh diubah CMS.

Done jika:

- authority footer tidak lagi campuran secara implisit
- admin dapat memprediksi hasil render footer dari kontrak yang jelas

## Phase 4: Harden Fallback and Placeholder Behavior

Tujuan fase:

- memastikan fallback footer tidak memberi affordance palsu

Checklist:

- [ ] Audit semua fallback footer yang masih tampak seperti state final.
- [ ] Putuskan apakah social placeholder `#` harus dihilangkan, disembunyikan, atau diganti ke state non-interaktif.
- [ ] Putuskan default behavior untuk company description dan copyright saat CMS belum mengisi field.
- [ ] Verifikasi fallback logo, link section, dan socials tetap aman untuk user dan tidak misleading.

Done jika:

- footer fallback tidak lagi terlihat “selesai” padahal masih placeholder
- tidak ada affordance interaktif palsu di bottom section footer

## Phase 5: Add Safety Net Verification

Tujuan fase:

- memberi pembuktian otomatis untuk kontrak footer yang sudah dibersihkan

Checklist:

- [ ] Tambah test yang memverifikasi footer tetap terpusat di layout non-chat yang memang menggunakannya.
- [ ] Tambah test untuk auth-gated `Lapor Masalah`.
- [ ] Tambah test untuk fallback CMS/footer social behavior.
- [ ] Tambah test untuk shell/token contract yang menjadi syarat footer migration state.
- [ ] Siapkan QA manual minimum untuk marketing dan dashboard.

Done jika:

- perubahan footer punya safety net otomatis
- verifikasi footer tidak lagi hanya mengandalkan inspeksi visual manual

## Suggested Execution Order

Urutan yang direkomendasikan:

1. Phase 1 terlebih dulu karena shell contract menentukan semua fase lain.
2. Phase 2 sesudah shell stabil agar cleanup token tidak menempel pada scope yang salah.
3. Phase 3 sesudah styling contract cukup jelas agar authority CMS dibersihkan di atas struktur final.
4. Phase 4 sesudah authority CMS jelas, karena fallback yang benar bergantung pada kontrak data yang benar.
5. Phase 5 terakhir untuk mengunci hasil migrasi dengan test dan QA.

## Deliverables

Deliverable minimum dari checklist ini:

- design doc migrasi footer
- implementation plan footer
- patch cleanup footer yang mengikuti urutan fase di atas

## Related Docs

- [`readme-footer.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/readme-footer.md)
- [`audit-findings.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/docs/marketing-ui-redesign/footer/audit-findings.md)

