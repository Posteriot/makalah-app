---
name: content-writer
description: Menulis konten pages aplikasi berdasarkan konteks UI/UX dan struktur kode (src/app/**), mencakup headline, subheadline, dan section copy. Gunakan saat diminta membuat/merevisi copy untuk page marketing, dashboard, settings, atau empty state dengan bahasa Indonesia dan istilah teknis English.
---

# Content Writer

## Overview

Skill ini buat lo nulis **konten page/UI** (headline, subhead, section copy, empty state) yang nyambung sama struktur kode dan desain. Jangan asal nulis copy marketing kalau codenya nggak support fitur itu. Tulis copy yang *grounded* di reality codebase.

## Workflow

1.  **Pahami Konteks & Scope**
    *   Tanya user kejelasan page mana yang mau diisi/direvisi.
    *   Pastikan dulu lo tau tujuan page-nya: Marketing? Dashboard? Error page?

2.  **Audit Struktur Page (Code First)**
    *   Baca file `page.tsx` atau component terkait di `src/app`.
    *   Identifikasi slot konten yang tersedia:
        *   Ada berapa section?
        *   Ada card apa aja?
        *   Butuh label tombol (CTA) apa aja?
    *   Kalau pusing strukturnya, jalanin `scripts/scan_pages.py`.

3.  **Drafting Konten**
    *   Tulis copy pake format di `references/page-templates.md`.
    *   Sesuaikan tone copy (Bukan tone lo ke user, tapi tone aplikasi ke end-user) pake `references/style-guide.md`.
    *   **PENTING**: Copy harus actionable. Jangan bertele-tele.

4.  **Verifikasi & Evidence**
    *   Pas lo ngasih output copy, kasih tau ini buat section mana di code.
    *   Misal: "Buat Hero Section di `src/app/page.tsx`, ganti headlinenya jadi..."

5.  **Output**
    *   Kasih markdown yang gampang dicopas user.

## Panduan & Resources

*   `references/style-guide.md`: Kitab gaya bahasa aplikasi (ID + Inggris Teknis).
*   `references/page-templates.md`: Contekan struktur konten per jenis page.

## Tools

*   `scripts/scan_pages.py`: Buat ngelist semua route/page yang ada di aplikasi biar lo tau peta lokasinya.
    *   Usage: `python3 .agent/skills/content-writer/scripts/scan_pages.py --root .`
