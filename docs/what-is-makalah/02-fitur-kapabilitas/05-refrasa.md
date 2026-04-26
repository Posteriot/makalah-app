# Tool Refrasa (Humanizer)

Refrasa adalah fitur unggulan Makalah AI yang berfungsi sebagai **"konverter" gaya bahasa**. Fitur ini dirancang khusus untuk memastikan paper User tidak terasa seperti **"tulisan robotik"** yang kaku. Ini adalah sebuah **transformasi gaya bahasa secara struktural**, bukan cuma sekadar moles sedikit, guna menghasilkan ritme dan ekspresi yang natural layaknya ditulis oleh manusia.

## Konstitusi Mandiri (System Prompt Khusus)
Berbeda dengan chat biasa, fitur Refrasa diatur oleh **System Prompt (Konstitusi)** tersendiri yang didesain khusus untuk pemrosesan teks akademik:
-   **Academic Escape Clause**: Aturan baku yang melarang AI mengubah istilah teknis, rumus, dan format sitasi demi menjaga integritas ilmiah.
-   **Style Constitution**: Kumpulan aturan gaya bahasa yang bisa disesuaikan untuk memastikan output tetap formal namun tetap terasa manusiawi (*natural*).
-   **Dedicated Agent Persona**: Saat memproses teks, model AI menjalankan peran sebagai **"Refrasa"** (nama sistem yang dideklarasikan dalam system prompt) — asisten perbaikan gaya penulisan akademis, bukan asisten chat umum.

## Tujuan Utama
Bukan sekadar mengganti kata, Refrasa fokus pada:
-   **Variasi Kosakata**: Mencari kata-kata yang terlalu sering diulang dan memperkaya sinonim ketimbang redundan kata.
-   **Ritme Paragraf**: Memperbaiki panjang pendek kalimat agar paragraf terasa lebih dinamis.
-   **Hedging Balance**: Menyeimbangkan penggunaan kata-kata "hati-hati" (seperti *mungkin, tampaknya, cenderung*) agar argumen tetap kuat namun tetap rendah hati secara akademik.

## Integrasi Panel Artifak
Fitur Refrasa bekerja langsung di dalam **Panel Artifak**, memberikan kenyamanan pengelolaan draf yang seragam:
-   **Compare Mode**: Melihat perbandingan *side-by-side* antara draf asli dan hasil konversi untuk memastikan pesan tidak berubah.
-   **Apply Directly**: Sekali klik untuk menerapkan hasil refrasa ke draf utama, yang secara otomatis akan menciptakan versi baru di riwayat artifak.
-   **Alat Manajemen**: Mendukung fitur *Fullscreen*, *Copy to Clipboard*, serta *Download* hasil konversi. Format yang tersedia di toolbar: **TXT, DOCX, PDF** — namun per kode saat ini, **hanya TXT yang benar-benar diimplementasikan**; DOCX dan PDF masih bertanda `TODO` (`console.log("not yet implemented")`) di `RefrasaTabContent.tsx`.

## Output Transparan
Refrasa tidak hanya mengubah teks secara diam-diam. User akan mendapatkan laporan **Issues** yang merinci bagian mana saja yang diperbaiki, mulai dari tingkat *Info*, *Warning*, hingga *Critical*, sehingga User tetap memiliki kendali penuh atas hasil akhirnya.

## Detail Teknis & Arsitektur
Fitur Refrasa dibangun dengan kombinasi teknologi canggih untuk menjamin kualitas output:
-   **AI Engine**: Menggunakan **Vercel AI SDK** dengan skema **Zod** untuk menghasilkan *Structured Output* (JSON), memungkinkan AI memberikan laporan *Issues* yang terperinci.
-   **State Management**: Terintegrasi dengan **Convex** untuk penyimpanan draf konversi yang persisten dan sinkron secara *real-time*.
-   **Rendering**: Menggunakan `MarkdownRenderer` untuk tampilan teks akademik yang rapi dan logika *Compare Engine* untuk tampilan perbandingan draf.

## Rujukan Kode
- `src/lib/refrasa/prompt-builder.ts`: Implementasi *Academic Escape Clause* dan pembangunan prompt Refrasa (system + user split).
- `src/lib/refrasa/schemas.ts`: Definisi Zod schema untuk validasi request (`RequestBodySchema`) dan structured output LLM (`RefrasaOutputSchema`, `RefrasaIssueSchema`).
- `src/app/api/refrasa/route.ts`: Endpoint API utama — autentikasi, fetch constitution, build prompt, panggil LLM (Gateway primary, OpenRouter fallback), return structured JSON.
- `src/components/refrasa/RefrasaTabContent.tsx`: Komponen UI utama Refrasa di Panel Artifak — mengelola Apply, Compare, Copy, Download, dan sinkronisasi state via Convex.
