# Search Orchestration: Multi-Retriever & Reactive Flow

Makalah AI menerapkan arsitektur penelusuran web yang kompleks dan reaktif untuk memastikan AI selalu bekerja dengan data terbaru dan terverifikasi. Alur ini dikelola oleh modul utama `src/lib/ai/web-search/orchestrator.ts`.

## 1. Arsitektur Multi-Retriever

Sistem tidak bergantung pada satu mesin pencari saja, melainkan menggunakan rangkaian (*chain*) *retriever* yang akan dicoba secara berurutan jika terjadi kegagalan (contoh: 0 hasil atau timeout).

Hierarki Retriever:
1. **Google Grounding (Primary)**: Terintegrasi langsung dengan Gemini API. Memberikan akurasi tinggi namun sering kali mengembalikan URL proxy Vertex AI yang memerlukan resolusi tambahan.
2. **Grok (Fallback 1)**: Digunakan melalui OpenRouter. Berfungsi sebagai jalur cadangan pertama jika Google Grounding gagal memberikan sitasi.
3. **Perplexity (Fallback 2)**: Digunakan untuk ekstraksi penelusuran spesifik atau jika kedua *provider* di atas mengalami kendala.

## 2. Alur Kerja Tiga Fase (Three-Phase Flow)

Orkestrator membagi proses penelusuran menjadi tiga tahap utama untuk optimasi latensi dan kualitas:

### Fase 1: Silent Search
Sistem menjalankan penelusuran di latar belakang menggunakan rantai *retriever*. Pada tahap ini, teks yang dihasilkan AI pencari dibuang, dan sistem hanya mengambil **sitasi (sources)** serta metadata. Jika satu *retriever* mengembalikan 0 sumber, sistem otomatis pindah ke *retriever* berikutnya.

### Fase 1.5: Content Fetching
Setelah daftar URL didapatkan, sistem melakukan:
- **Proxy Resolution**: Mengubah URL proxy Vertex AI menjadi URL asli secara paralel (konkurensi 10).
- **Multi-Route Extraction**: Menggunakan strategi ekstraksi berlapis:
    - **Tier 1 (Standard Fetch)**: Menggunakan `@mozilla/readability` untuk memproses situs web umum secara cepat.
    - **Tier 2 (Tavily Fallback)**: Digunakan jika Tier 1 gagal atau untuk rute khusus `journal_direct_tavily` (situs jurnal akademik) dan ekstraksi PDF.
- **Markdown Conversion**: Mengonversi konten HTML/PDF menjadi Markdown yang bersih melalui `turndown` atau ekstraksi asli Tavily.

### Fase 2: Compose (Sintesis)
Tahap akhir di mana model AI (sering kali model yang lebih kuat/besar) menerima seluruh konten halaman yang sudah di- *fetch* dan menyusun jawaban final untuk User.

## 3. Kontrol Integritas: COMPOSE_PHASE_DIRECTIVE

Untuk mencegah AI melakukan "halusinasi penelusuran" (berjanji akan mencari padahal data sudah ada), orkestrator menyuntikkan instruksi ketat `COMPOSE_PHASE_DIRECTIVE`:

- **Zero Fabrication**: AI dilarang keras menambahkan fakta yang tidak ada di dalam teks halaman yang diverifikasi.
- **Phase Awareness**: Memberitahu AI bahwa ia sedang berada di fase sintesis, bukan fase pencarian, sehingga ia tidak boleh menggunakan *tools* atau menjanjikan pencarian baru.
- **Citation Integrity**: Mewajibkan AI untuk menggunakan sitasi yang sudah disediakan dan melarang penggabungan profil entitas yang berbeda meskipun memiliki nama yang sama.

## 4. Observability & Latency Monitoring

Setiap langkah dalam orkestrasi ini dipantau secara ketat melalui log latensi (`[⏱ RETRIEVER]`, `[⏱ LATENCY]`). Sistem melacak waktu mulai dari inisiasi stream, penerimaan token pertama, hingga durasi ekstraksi sumber untuk mendeteksi *bottleneck* pada tiap *provider*.

---
**Rujukan Kode:**
- [src/lib/ai/web-search/orchestrator.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/orchestrator.ts): Logika utama orkestrasi dan directive fase compose.
- [src/lib/ai/web-search/retrievers/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/web-search/retrievers/): Implementasi spesifik untuk Google Grounding, Grok, dan Perplexity.
