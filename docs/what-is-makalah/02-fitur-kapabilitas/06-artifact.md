# Artifak (The Living Document)

Artifak adalah representasi visual dari draf paper per section/subbab yang sedang dikerjakan. Jika Chat adalah tempat User berdiskusi, maka Artifak adalah "meja kerja" tempat draf tersebut diwujudkan secara formal.

## Karakteristik Artifak
Berdasarkan sistem teknis Makalah AI, Artifak memiliki beberapa sifat utama:
1.  **Bukti Transisi Tahapan**: Setiap tahapan (stage) dalam Makalah AI wajib menghasilkan minimal satu Artifak. Artifak ini berfungsi sebagai "milestone" atau bukti nyata bahwa diskusi di tahap tersebut telah difinalisasi menjadi draf formal sebelum beralih ke tahap berikutnya.
2.  **Modular & Spesifik**: Tiap artifak mewakili satu unit konten (misal: hanya Bab Metodologi), memungkinkan User fokus menyempurnakan satu bagian sebelum pindah ke bagian lain.
2.  **Independent Versioning**: Setiap seksi memiliki riwayat versinya masing-masing (v1, v2, dst). Revisi pada satu subbab tidak akan memengaruhi integritas versi pada subbab lainnya.
3.  **Multi-Format & Visual**: Artifak mendukung berbagai format mulai dari teks (Markdown), rumus matematika (LaTeX), hingga diagram alir atau bagan organisasi melalui **Mermaid Diagram** yang dirender secara interaktif.
4.  **Sumber Terintegrasi**: Artifak menyimpan referensi sumber (URL & judul) yang digunakan Agent saat menyusun draf tersebut, memastikan transparansi asal-usul informasi.

## Indikator Artifak (The Card)
Setiap kali Agent menghasilkan draf, sebuah **Kartu Artifak** akan muncul di area chat. Kartu ini memiliki status visual:
-   **Artifak Baru**: Ditandai dengan ikon centang, menandakan draf pertama untuk tahap tersebut.
-   **Revisi**: Ditandai dengan ikon pensil dan label "Revisi", muncul saat draf diperbarui berdasarkan feedback User.
-   **Versi (vX)**: Menampilkan nomor urut draf untuk memudahkan pelacakan.

## Panel Artifak (Sisi Kanan)
Dengan mengeklik kartu di chat, User akan membuka **Panel Artifak** di sisi kanan layar. Panel ini memungkinkan User untuk:
-   Meninjau draf seksi yang sedang aktif secara utuh tanpa terganggu oleh riwayat chat.
-   Melihat teks yang diformat secara profesional (WYSIWYG/Markdown).
-   Melakukan inspeksi detail terhadap isi sebelum melakukan validasi.

## Fitur Manajemen Draf
Di dalam Panel Artifak, User dibekali dengan berbagai alat kendali:
-   **Edit Manual**: User memiliki kebebasan untuk menyunting teks secara langsung di dalam panel untuk perbaikan cepat.
-   **Fullscreen Mode**: Memperluas tampilan draf hingga memenuhi layar untuk pengalaman membaca dan menyunting yang lebih fokus.
-   **Download & Ekspor**: Mengunduh draf seksi dalam format **TXT** (plain text). Pilihan DOCX dan PDF tersedia di toolbar, namun di `ArtifactViewer.tsx` keduanya saat ini mengunduh file markdown (`.md`) — konversi format nyata ke DOCX/PDF belum diimplementasikan di artifact biasa (berbeda dari Naskah yang memiliki server-side PDF/DOCX builder).
-   **Copy & Refrasa**: Tombol cepat untuk menyalin teks atau langsung memprosesnya melalui fitur Refrasa (Konverter Gaya Bahasa).

## Teknologi di Balik Layar
Sistem Artifak Makalah AI dibangun secara *custom* dengan komponen React yang terintegrasi dengan Convex.
-   **Structured Container**: Panel Artifak memisahkan area ArtifactTabs (navigasi tab), ArtifactToolbar (metadata + aksi), dan ArtifactViewer (konten draf) — komponen-komponen ini dibangun secara *custom* oleh tim Makalah AI, bukan merupakan standar bawaan dari Vercel AI SDK.
-   **Composable Architecture**: Satu sistem artifak yang sama menangani berbagai jenis output (teks markdown, diagram Mermaid via deteksi konten, kode dengan syntax highlighting, LaTeX) secara konsisten melalui branching di `ArtifactViewer`.
-   **Built-in Actions**: Toolbar aksi (edit, copy, download, refrasa, fullscreen) diimplementasikan di `ArtifactToolbar.tsx` dan dikontrol melalui `ArtifactViewerRef` (imperative handle).

## Mekanisme Invalidation (Rewind)

Sistem memiliki fitur keamanan bernama _Invalidation_. Jika User memutuskan untuk "mundur" ke tahapan sebelumnya (_Rewind_), Artifak-artifak yang sudah dibuat di tahapan yang lebih maju akan secara otomatis ditandai sebagai **Invalid** (usang) untuk mencegah terjadinya inkonsistensi data dalam paper.

## Rujukan Kode

- `convex/schema.ts`: Definisi tabel `artifacts` beserta sistem _versioning_, format, sources, dan _invalidation_.
- `src/components/chat/ArtifactIndicator.tsx`: Komponen kartu pemicu artifak di dalam area chat (CheckCircle untuk new, EditPencil untuk revision).
- `src/components/chat/ArtifactPanel.tsx`: Komponen panel container — mengelola tab, toolbar, viewer, dan fullscreen modal.
- `src/components/chat/ArtifactViewer.tsx`: Komponen rendering utama — menangani tampilan konten (Markdown, Mermaid, LaTeX), mode edit inline, dan logika download.
