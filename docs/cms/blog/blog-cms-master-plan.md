# Blog CMS Docs Index (Makalah)

Tanggal update: 9 Februari 2026  
Owner: Codex (execution context)  
Scope: Peta dokumen untuk implementasi blog publik dan roadmap CMS blog

Dokumen blog CMS dipisah menjadi dua dokumen utama agar tracking perubahan lebih presisi:

1. `docs/cms/blog/state-current.md`
   - Sumber kebenaran kondisi implementasi blog publik yang sudah berjalan di kode.
   - Fokus: route, komponen, behavior UI, dan integrasi data publik saat ini.

2. `docs/cms/blog/future-cms-plan.md`
   - Rencana evolusi ke CMS internal (schema, API admin, dashboard, hardening).
   - Fokus: gap, fase implementasi, dan acceptance criteria target.

Catatan operasional:
1. Perubahan pada `src/app/(marketing)/blog/**` atau `src/components/marketing/blog/**` wajib diikuti update `state-current.md`.
2. Perubahan prioritas atau strategi CMS wajib diikuti update `future-cms-plan.md`.
3. Dokumen ini hanya index, bukan spesifikasi teknis detail.
