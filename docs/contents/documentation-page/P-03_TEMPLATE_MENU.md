# P-03 - Template Markdown Konten Menu Dokumentasi

Gunakan template ini untuk semua menu dokumentasi sebelum ingest ke database/CMS.

```md
---
doc_id: "Sx"
slug: "ganti-dengan-slug"
title: "Ganti dengan Judul Menu"
group: "Mulai"
order: 1
icon: "BookOpen"
headerIcon: "Lightbulb"
isPublished: true
status: "draft"
lastVerifiedAt: "YYYY-MM-DD"
---

# Ganti dengan Judul Menu

## Ringkasan

Tulis 1 paragraf ringkas tentang tujuan halaman ini.

## Konten Utama

### Subbagian 1

Paragraf pembuka subbagian.

- Poin penting 1
- Poin penting 2
- Poin penting 3

### Subbagian 2

Paragraf pembuka subbagian.

1. Langkah 1
2. Langkah 2
3. Langkah 3

### Subbagian 3

Paragraf pembuka subbagian.

## Rujukan Kode (Wajib)

- src/path/file-a.tsx:10 - bukti klaim A
- src/path/file-b.ts:25 - bukti klaim B
- convex/path/file-c.ts:40 - bukti klaim C

## Catatan Verifikasi

- [ ] Route/URL sudah dicek
- [ ] Fitur sudah cocok dengan implementasi saat ini
- [ ] Batasan klaim sudah sesuai aturan P-02
- [ ] Istilah lintas section sudah konsisten

## Riwayat Revisi

- Draft:
  - Tanggal:
  - Ringkasan perubahan:
- Revisi User:
  - Tanggal:
  - Catatan revisi dari user:
- Final:
  - Tanggal:
  - Ringkasan finalisasi:
```

## Catatan Pemakaian

1. Untuk setiap menu baru, salin template ini lalu sesuaikan frontmatter.
2. Jangan ubah urutan heading wajib.
3. Bagian `Rujukan Kode` wajib terisi sebelum status `final`.
