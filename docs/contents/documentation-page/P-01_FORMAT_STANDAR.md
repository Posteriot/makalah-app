# P-01 - Format Standar File Markdown Dokumentasi

Dokumen ini mengunci format standar file markdown untuk konten halaman `/documentation`.

## 1) Lokasi dan Penamaan File

Semua file konten harus disimpan di:

- `docs/contents/documentation-page`

Format nama file:

- `{urutan-2-digit}-{slug}.md`

Contoh:

- `01-welcome.md`
- `02-installation.md`
- `03-quickstart.md`

## 2) Frontmatter Wajib

Setiap file wajib punya frontmatter YAML berikut:

```yaml
---
doc_id: "S1"
slug: "welcome"
title: "Selamat Datang"
group: "Mulai"
order: 1
icon: "BookOpen"
headerIcon: "Lightbulb"
isPublished: true
status: "draft"
lastVerifiedAt: "2026-02-18"
---
```

## 3) Aturan Field Frontmatter

Field wajib:

- `doc_id`: ID proses (`S1` sampai `S8`).
- `slug`: wajib konsisten dengan slug section di data `documentationSections`.
- `title`: judul menu.
- `group`: grup navigasi (contoh: `Mulai`, `Fitur Utama`, `Panduan Lanjutan`).
- `order`: urutan tampil.
- `icon`: key icon untuk sidebar.
- `isPublished`: status publish untuk ingest ke database.
- `status`: `draft` | `reviewed` | `final`.
- `lastVerifiedAt`: tanggal verifikasi berbasis kode.

Field opsional:

- `headerIcon`: icon header section (boleh kosong).

## 4) Struktur Heading Wajib

Urutan heading standar:

1. `# {Judul Halaman}`
2. `## Ringkasan`
3. `## Konten Utama`
4. `### {Subbagian 1}`
5. `### {Subbagian 2}` (ulang sesuai kebutuhan)
6. `## Rujukan Kode (Wajib)`
7. `## Catatan Verifikasi`
8. `## Riwayat Revisi`

## 5) Aturan Isi Tiap Heading

- `## Ringkasan`:
  - 1 paragraf ringkas untuk makna halaman.
- `## Konten Utama`:
  - Seluruh materi user-facing.
  - Wajib dipecah ke beberapa `###` subbagian.
- `## Rujukan Kode (Wajib)`:
  - Daftar file/path sebagai bukti klaim teknis.
- `## Catatan Verifikasi`:
  - Catatan apa yang sudah dicek, apa yang belum.
- `## Riwayat Revisi`:
  - Jejak perubahan draft -> revisi user -> final.

## 6) Mapping Dasar ke Database/CMS

Mapping awal saat ingest:

- `slug` -> `documentationSections.slug`
- `title` -> `documentationSections.title`
- `group` -> `documentationSections.group`
- `order` -> `documentationSections.order`
- `icon` -> `documentationSections.icon`
- `headerIcon` -> `documentationSections.headerIcon`
- `isPublished` -> `documentationSections.isPublished`
- Konten markdown -> dibreakdown ke `summary`, `blocks`, dan `searchText`

Catatan:

- Mekanisme transform markdown -> `blocks` diproses terpisah pada tahap ingest.
