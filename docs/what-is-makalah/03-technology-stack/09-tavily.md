# Tavily: Domain-Specific Extraction & Fallback

Makalah AI menggunakan **Tavily AI** bukan hanya sebagai mesin pencari, tetapi secara spesifik sebagai **mesin ekstraksi konten** tingkat lanjut. Tavily berperan krusial dalam menembus proteksi bot dan mengekstrak data dari format dokumen yang kompleks seperti PDF.

## 1. Rute Khusus `journal_direct_tavily`

Dalam modul `src/lib/ai/web-search/content-fetcher.ts`, sistem secara otomatis mengarahkan URL tertentu ke Tavily melalui klasifikasi rute.

- **Kriteria Otomatis**: URL yang memiliki domain `.ac.id` (akademik Indonesia) atau `.sch.id` (sekolah), serta mengandung kata kunci seperti `journal`, `jurnal`, atau `ejournal`, akan diklasifikasikan sebagai `journal_direct_tavily`.
- **Rasional**: Situs jurnal akademik sering kali memiliki struktur HTML yang kompleks atau proteksi yang memblokir pemanggilan `fetch` standar dari server. Tavily mampu mengekstrak konten Markdown bersih dari situs-situs ini dengan tingkat keberhasilan yang jauh lebih tinggi.

## 2. Ekstraksi PDF & Dokumen

Tavily adalah mesin utama yang digunakan Makalah AI untuk memproses referensi dalam format PDF.

- **PDF Route**: Jika sistem mendeteksi rute `pdf_or_download`, permintaan akan langsung dikirim ke *endpoint* ekstraksi Tavily.
- **Markdown Conversion**: Tavily mengonversi dokumen PDF yang berat menjadi teks Markdown yang ringkas, memungkinkan AI untuk "membaca" isi jurnal tanpa harus memproses file biner secara langsung.

## 3. Mekanisme Fallback Dua Lapis

Makalah AI menerapkan strategi ekstraksi dua lapis untuk efisiensi biaya dan performa:

1. **Tier 1 (Standard Fetch)**: Sistem mencoba mengambil konten menggunakan `fetch` standar dengan library `@mozilla/readability`. Ini gratis dan sangat cepat untuk situs web umum.
2. **Tier 2 (Tavily Fallback)**: Jika Tier 1 gagal karena *timeout*, proteksi bot (seperti Cloudflare), atau konten yang terlalu pendek, sistem akan secara otomatis melakukan *fallback* ke Tavily.

## 4. Implementasi Teknis

- **Library**: `@tavily/core`
- **Metode**: Menggunakan fungsi `client.extract(urls, { extractDepth: "basic" })`.
- **Latency Management**: Pemanggilan Tavily dilakukan secara *batch* untuk meminimalkan jeda waktu tunggu saat memproses banyak URL sekaligus dalam satu turn pencarian.

---
**Rujukan Kode:**
- [src/lib/ai/web-search/content-fetcher.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/content-fetcher.ts): Logika klasifikasi `isSlowJournalHost` dan integrasi `fetchViaTavily`.
- [src/lib/ai/web-search/orchestrator.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/orchestrator.ts): Koordinasi fase 1.5 (Content Fetching) yang memicu pemanggilan Tavily.
