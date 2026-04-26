# Search Orchestrator (Otak Riset AI)

Search Orchestrator adalah pusat kendali intelijen yang mengatur strategi riset Agent secara dinamis. Sistem ini mengintegrasikan fitur **Google Search Grounding** (dipanggil langsung via `@ai-sdk/google`, bukan melalui AI Gateway) untuk validasi fakta secara *real-time* langsung dari indeks pencarian Google, dengan fallback ke Grok dan Perplexity via OpenRouter jika Google Grounding gagal memberikan sitasi.

## Alur Kerja Tiga Fase (Reactive Search)

Sistem membagi proses riset menjadi tiga tahap untuk optimasi latensi dan akurasi:
1.  **Fase 1: Silent Search**: Menjalankan rangkaian pencarian di latar belakang untuk mengumpulkan sitasi dan metadata tanpa memblokir aliran awal teks.
2.  **Fase 1.5: Content Fetching**: Mengambil konten mentah dari URL terpilih, termasuk resolusi URL proxy Vertex AI secara paralel.
3.  **Fase 2: Compose (Sintesis)**: Model AI menyusun jawaban final berdasarkan konten halaman yang sudah diverifikasi, dipandu oleh instruksi ketat untuk mencegah halusinasi.

## Mekanisme Multi-Retriever

Aplikasi mengelola **Retriever Registry** yang mencoba berbagai mesin riset secara berurutan jika terjadi kegagalan. Urutan prioritas ditentukan oleh konfigurasi admin (field `priority`), bukan hardcoded:
1.  **Google Search Grounding**: Terintegrasi langsung dengan `@ai-sdk/google` untuk kutipan teks yang presisi via `google.tools.googleSearch()`.
2.  **Perplexity & Grok**: Digunakan melalui OpenRouter (`@openrouter/ai-sdk-provider`) sebagai jalur cadangan jika retriever di atasnya gagal atau mengembalikan 0 sitasi.

> **Catatan:** Pada legacy config path (sebelum admin array retriever), urutan default adalah Perplexity sebagai primary dan Grok sebagai fallback — Google Grounding **tidak aktif** di path ini.

## Teknologi Pengambilan Konten (Fetch)

Untuk mendapatkan isi dokumen yang berkualitas tinggi, orkestrator menggunakan pendekatan berlapis di Fase 1.5:
-   **Readability & Turndown**: Menggunakan `@mozilla/readability` untuk membuang "sampah" web dan mengonversi HTML menjadi Markdown bersih.
-   **Tavily AI (Extraction Engine)**: Bertugas sebagai (a) jalur utama untuk rute `pdf_or_download` dan `journal_direct_tavily` (situs jurnal dengan proteksi bot), serta (b) **fallback umum** untuk URL bertipe `html_standard` atau `academic_wall_risk` yang gagal di-fetch secara langsung — menggunakan `@tavily/core` dengan metode `extract`.
-   **Deferred Resolution**: Resolusi URL proxy Vertex AI dilakukan secara paralel dalam kelompok (*batch*) konkurensi 10 untuk meminimalkan jeda waktu riset.

## Kontrol Integritas & Anti-Halusinasi

Sistem menyuntikkan **COMPOSE_PHASE_DIRECTIVE** pada tahap akhir untuk memastikan:
-   **Zero Fabrication**: AI dilarang keras menambahkan fakta yang tidak ada dalam dokumen referensi.
-   **Phase Awareness**: AI sadar bahwa ia berada di fase sintesis dan dilarang menjanjikan pencarian baru di tengah jawaban.

---
**Rujukan Kode:**
- [src/lib/ai/web-search/orchestrator.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/orchestrator.ts): Logika pusat alur tiga fase dan orkestrasi riset.
- [src/lib/ai/web-search/content-fetcher.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/content-fetcher.ts): Strategi ekstraksi konten (Tavily/Readability).
- [src/lib/ai/web-search/retrievers/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/retrievers/): Koleksi mesin pencari (Google, Grok, Perplexity).
