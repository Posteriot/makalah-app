# Documentation CMS Docs Index (Makalah)

Tanggal update: 10 Februari 2026
Owner: Codex (execution context)
Scope: Peta dokumen untuk implementasi halaman dokumentasi publik dan roadmap CMS dokumentasi

Dokumen CMS dokumentasi dipisah menjadi dua dokumen utama agar tracking perubahan lebih presisi:

1. `docs/cms/documentation/state-current.md`
   - Sumber kebenaran kondisi implementasi halaman dokumentasi publik yang sudah berjalan di kode.
   - Fokus: route, komponen, behavior UI, search architecture, dan integrasi data publik saat ini.

2. `docs/cms/documentation/future-cms-plan.md`
   - Rencana evolusi ke CMS internal (schema, API admin, dashboard, hardening).
   - Fokus: gap, fase implementasi, dan acceptance criteria target.

Catatan operasional:
1. Perubahan pada `src/app/(marketing)/documentation/**` atau `src/components/marketing/documentation/**` wajib diikuti update `state-current.md`.
2. Perubahan prioritas atau strategi CMS wajib diikuti update `future-cms-plan.md`.
3. Dokumen ini hanya index, bukan spesifikasi teknis detail.
