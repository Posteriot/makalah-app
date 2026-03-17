# Makalah Trace - Brainstorming Notes

Tanggal: 2026-02-27
Branch: makalah-trace
Status: Discovery notes (non-normative)

## Catatan Penting
Dokumen ini adalah ringkasan discovery.
Aturan final implementasi ada di:
`docs/makalah-trace/editor-organization-management.md`

## Goal Utama
Makalah Trace diposisikan sebagai alat audit keterlibatan intelektual siswa/mahasiswa saat berkolaborasi dengan AI, bukan alat vonis otomatis.

## Ringkasan Keputusan Discovery
1. Target utama: dosen/guru (Editor) untuk audit proses belajar.
2. Fungsi v1: bahan pertimbangan manual, tanpa auto-penalti nilai.
3. Audit dijalankan per stage, bukan sekali di akhir.
4. Trigger audit bersifat on-demand oleh Editor (klik Mulai Audit).
5. `conversation ID` dipakai sebagai pointer audit; otorisasi akses tetap mengikuti kebijakan akses ketat.
6. Privasi: yang terlihat hanya evidence snippets, bukan full raw chat.
7. Evaluator audit memakai prompt khusus `audit-evaluator` tanpa free tool-calling.
8. PDF final hanya dibuat jika audit run `completed` sesuai dokumen acuan.

## Opsi Arsitektur yang Dibahas
1. Opsi A: On-demand Stage Audit Pipeline.
2. Opsi B: Auto Precompute + Manual Review.
3. Opsi C: Hybrid (prefilter + deep audit saat klik).

Keputusan untuk v1: Opsi A.

## Definisi Peran (Ringkas)
1. Admin Organisasi: mengelola anggota, editor, dan assignment.
2. Editor: menjalankan audit per stage.
3. User: siswa/mahasiswa pengguna chat.
4. Superadmin: internal platform untuk support insiden, bukan operasional harian.

## Catatan
Dokumen design dan implementation plan dapat ditaruh di folder `docs/makalah-trace`.
