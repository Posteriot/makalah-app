# File Extraction: Multi-Format Content Ingestion

Makalah AI memungkinkan pengguna untuk mengunggah dokumen riset mereka sendiri sebagai referensi tambahan. Sistem ekstraksi ini dirancang untuk mengubah berbagai format file mentah menjadi teks Markdown bersih yang dapat dipahami oleh AI.

## 1. Arsitektur Pemrosesan File

Karena keterbatasan lingkungan eksekusi pada database Convex (yang tidak mendukung library biner berat), Makalah AI menggunakan rute API Next.js (`src/app/api/extract-file/route.ts`) sebagai mesin ekstraksi.

1. **Upload**: File diunggah oleh *client* ke Convex Storage.
2. **Trigger**: *Client* memanggil API `/api/extract-file` dengan ID file tersebut.
3. **Download**: Server Next.js mengambil file dari *storage* menggunakan URL rahasia.
4. **Extraction**: Server menjalankan ekstraktor yang sesuai berdasarkan tipe MIME file.
5. **Update**: Hasil ekstraksi disimpan kembali ke database Convex.

## 2. Ekstraktor Berdasarkan Format

Sistem mendukung berbagai format dokumen melalui library khusus:

- **PDF**: Menggunakan `pdf-parse` atau Tavily (untuk PDF yang sangat berat/kompleks) guna mengekstrak teks dan struktur dasar.
- **DOCX (Word)**: Menggunakan library `mammoth` untuk konversi dokumen Word ke Markdown yang mempertahankan struktur paragraf.
- **XLSX (Excel)**: Mengekstrak data dari tabel hingga 10 sheet dan 1000 baris per sheet.
- **PPTX (PowerPoint)**: Mengambil teks dari slide presentasi.
- **Images (OCR)**: Menggunakan **GPT-4o Vision via OpenRouter** untuk membaca teks dari gambar riset (grafik, pindaian jurnal) atau memberikan deskripsi visual jika tidak ada teks yang terbaca.
- **TXT/CSV**: Ekstraksi teks sederhana dengan normalisasi encoding.

## 3. Pembersihan & Ingest RAG (Retrieval-Augmented Generation)

Teks yang berhasil diekstrak tidak langsung diberikan ke AI, melainkan melalui tahap pemrosesan lanjut:

- **`cleanForIngestion`**: Menghapus karakter sampah, menormalkan spasi, dan membersihkan elemen non-konten (seperti header/footer yang berulang).
- **RAG Ingest**: Teks yang sudah bersih dikirim ke modul `ingestToRag` untuk dipecah menjadi *chunks* dan disimpan ke dalam indeks pencarian internal percakapan. Hal ini memungkinkan AI untuk mencari bagian spesifik dari dokumen referensi yang diunggah pengguna.

## 4. Resilience & Reliability

- **Retry Logic**: Setiap proses ekstraksi dilengkapi dengan mekanisme `retryWithBackoff` (maksimal 3 kali) untuk menangani kesalahan jaringan atau beban server yang bersifat sementara.
- **Status Tracking**: Status ekstraksi (`pending`, `success`, `failed`) dilacak di database, memungkinkan UI memberikan umpan balik *real-time* kepada pengguna jika terjadi kegagalan.

---
**Rujukan Kode:**
- [src/app/api/extract-file/route.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/api/extract-file/route.ts): Handler utama ekstraksi file.
- [src/lib/file-extraction/](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/file-extraction/): Koleksi modul ekstraktor spesifik format.
- [src/lib/ingestion/clean-for-ingestion.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ingestion/clean-for-ingestion.ts): Logika pembersihan teks pasca-ekstraksi.
