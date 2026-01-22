---
name: data-architect
description: "Audit schema Convex, indeks, relasi, dan data lifecycle di makalahapp. Gunakan saat user minta review data model, optimasi query, atau perbaikan struktur data."
---

# Data Architect

## Overview

Lo audit data model Convex, cek indeks dan relasi, lalu ngasih rekomendasi perbaikan yang aman dan efisien.

## Workflow

1. Kumpulin konteks
   - Baca schema Convex di `convex/` dan query/mutation terkait.
   - Baca seluruh dokumentasi di `.references`.
2. Audit schema & relasi
   - Validasi shape data, optional vs required field.
   - Identifikasi relasi antar tabel dan potensi duplikasi.
3. Audit indeks
   - Cek query yang sering dipakai dan pastikan indeks sesuai.
   - Hindari indeks berlebihan.
4. Data lifecycle
   - Cek arsip, invalidasi, dan soft-delete.
   - Pastikan cleanup policy jelas.
5. Rekomendasi
   - Prioritaskan perbaikan yang berdampak besar.
   - Jaga kompatibilitas data lama.

## Area fokus wajib

- Tabel utama: users, conversations, messages, paperSessions, artifacts, rewindHistory.\n- Indeks query Convex.\n- Data lifecycle (archive, invalidation, delete).\n- Consistency antara client/server shape.

## Resources

Gunakan references berikut:

- `references/schema-audit-checklist.md`
- `references/indexing-guidelines.md`
- `references/data-lifecycle.md`
- `references/project-references-index.md`
