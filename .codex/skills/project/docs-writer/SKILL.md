---
name: docs-writer
description: Menulis dokumentasi berbasis kode untuk penjelasan high level dan detail pada file/fitur/komponen/pages tertentu di codebase (src dan convex). Gunakan saat diminta membuat docs yang merangkum struktur, alur, dan detail implementasi dengan daftar file terkait.
---

# Docs Writer

## Garis Besar

Skill ini membantu menulis dokumentasi berbasis kode dengan gaya ringkas + detail per file/fitur/komponen. Fokus pada pembacaan kode aktual, bukan asumsi, dan selalu sertakan daftar file terkait.

## Alur Kerja

1) Validasi permintaan user: cakupan (file/fitur/komponen/pages), level detail, dan output yang diinginkan.
2) Pemetaan file terkait: gunakan struktur folder `src/` dan `convex/`. Jika perlu, jalankan `scripts/scan_codebase.py`.
3) Baca kode yang relevan dan catat:
   - Tujuan file/komponen
   - Data flow utama (props/state/hooks, atau query/mutation Convex)
   - Dependensi penting
   - Edge case/constraint yang terlihat di kode
4) Tulis dokumentasi dengan format:
   - Ringkasan (1 paragraf)
   - Detail per file/fitur/komponen (poin-poin)
   - Daftar file terkait
5) Jangan klaim hal yang tidak terlihat di kode. Jika asumsi dibutuhkan, tandai sebagai asumsi.
6) Jangan ubah kode kecuali diminta eksplisit.

## Panduan Bahasa dan Struktur

- Ikuti `references/style-guide.md` untuk aturan bahasa campur (ID + technical English).
- Ikuti `references/templates.md` untuk format output.

## Kapan Menjalankan Script

- Gunakan `scripts/scan_codebase.py` untuk daftar file dan ringkasan struktur jika scope luas atau user minta daftar file lengkap.
