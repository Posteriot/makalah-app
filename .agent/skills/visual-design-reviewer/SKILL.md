---
name: visual-design-reviewer
description: Review, refactor, penguatan, dan efisiensi desain/styling/layout di kode TypeScript, CSS, dan JavaScript dalam folder src tanpa mengubah desain utama yang sudah disediakan. Gunakan saat diminta mengecek soliditas visual, konsistensi styling, dan efisiensi struktur styling/layout pada UI yang sudah ada.
---

# Visual Design Reviewer

## Overview

Skill ini buat lo ngereview, nge-audit, dan ngerapihin styling/layout di folder `src/`.
**POIN PENTING**: Jangan pernah ubah desain utama (warna, grid, tipografi) kecuali diminta eksplisit. Tugas lo itu bikin kode styling-nya lebih efisien, konsisten, dan solid, bukan jadi desainer baru.

## Workflow

1.  **Pahami Konteks**
    *   Tanya user dulu: "Mau review bagian mana?" "Desain utamanya yang mana?"
    *   Jangan jalan kalau scope-nya belum jelas.

2.  **Mapping & Audit**
    *   Baca file di `src/` yang relevan.
    *   Kalau butuh mapping luas, pake `scripts/scan_src.py`.
    *   Cari masalah kayak:
        *   **Inkonsistensi**: Padding beda-beda dikit, warna nggak pake token variable.
        *   **Redundansi**: Class CSS yang diulang-ulang padahal bisa di-merge.
        *   **Struktur**: Wrapper `div` kebanyakan yang nggak guna.

3.  **Action (Review vs Refactor)**
    *   **Review Only**: List temuan lo pake bukti (line number/code snippet).
    *   **Refactor**: Lakuin perbaikan minimal yang amannya 100%. Jangan ubah tampilan visual pixel-nya kalau bisa.

4.  **Verifikasi & Evidence (WAJIB)**
    *   Jangan bilang "udah rapi" kalau nggak ada buktinya.
    *   Kasih liat diff code sebelum vs sesudah.
    *   Kalau lo refactor, pastiin lo jelasin kenapa itu aman dan nggak ngerusak UI.

5.  **Laporan**
    *   Pake format ringkas. Poin-poin aja.
    *   Fokus ke "Apa yang salah" dan "Apa yang udah lo benerin".

## Panduan Visual

*   Ikuti `references/style-guide.md` buat prinsip styling.
*   Cek `references/checklist.md` biar nggak ada yang kelewat.

## Tools

*   `scripts/scan_src.py`: Gunain buat ngelist file frontend (`.tsx`, `.css`) di `src/`.
    *   Usage: `python3 .agent/skills/visual-design-reviewer/scripts/scan_src.py --root . --ext tsx,css`

