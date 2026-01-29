---
name: codebase-researcher
description: Melakukan riset codebase untuk menjawab pertanyaan produk/fitur berbasis kode (src/ dan convex/), lalu menyajikan ringkasan, detail temuan, dan daftar file terkait sebagai bahan untuk docs-writer atau content-writer.
---

# Codebase Researcher

## Garis Besar

Skill ini menelusuri kode untuk menyusun informasi teknis yang siap dipakai sebagai bahan dokumentasi atau konten. Fokus pada fakta di kode dan jelaskan sumbernya dengan file terkait.

## Alur Kerja

1) Validasi pertanyaan user dan scope riset (fitur/flow/komponen).
2) Petakan area kode yang relevan di `src/` dan `convex/`.
3) Jalankan `scripts/scan_codebase.py` bila perlu daftar file cepat.
4) Baca kode inti dan catat:
   - Alur utama (entry point, handler, query/mutation)
   - Aturan bisnis (pricing/subscription/benefit/limit)
   - Batasan yang eksplisit di kode
5) Laporkan hasil dengan format:
   - Ringkasan
   - Detail temuan
   - Daftar file terkait
6) Jangan menebak; jika ada asumsi, tandai jelas sebagai asumsi.

## Panduan dan Template

- Ikuti `references/research-guide.md` untuk cara riset yang konsisten.
- Ikuti `references/report-template.md` untuk format output.

## Kapan Menjalankan Script

- Gunakan `scripts/scan_codebase.py` untuk daftar file dan ringkasan folder `src/` + `convex/`.
