---
name: docs-writer
description: Menulis dokumentasi berbasis kode untuk penjelasan high level dan detail pada file/fitur/komponen/pages tertentu di codebase (src dan convex). Gunakan saat diminta membuat docs yang merangkum struktur, alur, dan detail implementasi dengan daftar file terkait.
---

# Docs Writer

## Overview

Skill ini buat lo nulis dokumentasi berbasis kode yang ringkas tapi detail per file/fitur/komponen. Kuncinya: lo harus baca **kode aktual**, jangan berasumsi, dan selalu kasih daftar file yang relevan. Gaya bahasa output dokumentasinya tetep formal/semi-formal (sesuai template), tapi proses mikir lo harus tetep kritis.

## Workflow

1.  **Validasi Request User**
    *   Pahami dulu maunya user apa: scope-nya (file/fitur/komponen/pages), butuh sedetail apa, dan output-nya mau kayak gimana.

2.  **Mapping File**
    *   Cek struktur folder `src/` dan `convex/` buat nemuin file-file yang relevan.
    *   Kalau scope-nya luas atau lo bingung, **WAJIB** jalanin `scripts/scan_codebase.py` buat dapet gambaran strukturnya.

3.  **Pelajari Kode**
    *   Baca kodenya bener-bener. Catet hal-hal penting:
        *   Tujuan file/komponen ini apa.
        *   Alur datanya gimana (props, state, hooks, query/mutation Convex).
        *   Dependensi pentingnya ke mana aja.
        *   Ada edge case atau batasan (constraint) yang jelas tertulis di kode nggak?

4.  **Tulis Dokumentasi**
    *   Pake format di `references/templates.md`.
    *   **Ringkasan**: 1 paragraf padat.
    *   **Detail**: Breakdown per file/fitur pake poin-poin.
    *   **File Terkait**: List file absolute path-nya.

5.  **Verifikasi & Evidence**
    *   Jangan ngadi-ngadi. Kalau nggak ada di kode, jangan ditulis atau tandain sebagai asumsi.
    *   Tunjukin kalau lo udah baca kodenya (misal: "Gue nemu logic ini di line X").

6.  **Larangan**
    *   Jangan ubah kode di skill ini kecuali diminta eksplisit. Tugas lo cuma nulis docs.

## Panduan Bahasa

*   Ikuti `references/style-guide.md` buat aturan campur bahasa (Indo + Technical English).
*   Output dokumen tetep rapi, tapi interaksi lo sama user (kalau ada tanya jawab) pake gaya santai (gue-lo).

## Tools & Scripts

*   `scripts/scan_codebase.py`: Pake ini kalau lo butuh list file lengkap atau mau mapping struktur folder secara cepet.
    *   Usage: `python3 .agent/skills/docs-writer/scripts/scan_codebase.py --root . --targets src,convex`

