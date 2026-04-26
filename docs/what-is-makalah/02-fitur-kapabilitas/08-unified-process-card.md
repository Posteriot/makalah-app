# Unified Process Card

Unified Process Card adalah fitur transparansi yang menampilkan rencana kerja dan status proses Agent secara *real-time* di dalam area chat. Fitur ini memastikan User selalu tahu apa yang sedang, sudah, dan akan dilakukan oleh AI.

## Struktur Informasi
Di dalam Unified Process Card, informasi dibagi menjadi beberapa bagian utama:

1.  **Deskripsi Tahapan**: Penjelasan singkat mengenai tujuan dari tahapan (stage) yang sedang dikerjakan (misal: "Eksplorasi ide awal dan analisis kelayakan").
2.  **Daftar Langkah (Tasks)**: Rencana kerja konkret yang disusun oleh Agent. Setiap langkah memiliki status:
    -   ✅ **Selesai**: Langkah yang sudah berhasil dieksekusi.
    -   🔄 **Sedang Berjalan**: Langkah yang sedang diproses saat ini.
    -   ○ **Menunggu**: Antrean langkah selanjutnya.
3.  **Indikator Proses (Tools & Search)**: Status teknis penggunaan alat pendukung, seperti:
    -   **Web Search** (`SearchStatusIndicator`): Melaporkan jumlah sumber yang ditemukan (e.g. "Pencarian selesai (5 sumber)").
    -   **Tool Calls** (`ToolStateIndicator`): Menampilkan status alat AI yang sedang aktif (e.g. `createArtifact`, `updateStageData`).
    -   **Catatan**: Indikator durasi reasoning *tidak* ditampilkan di sini; reasoning trace dirender terpisah oleh `MessageBubble.tsx`.

## Karakteristik Interaksi
-   **Collapsible (Bisa Diciutkan)**: Secara default, Unified Process Card tampil ringkas. User bisa membukanya untuk melihat detail langkah yang lebih mendalam.
-   **Live Updates**: Status langkah dan indikator proses diperbarui secara otomatis seiring dengan kemajuan kerja Agent.
-   **Observability**: Memberikan kepastian pada User bahwa sistem sedang bekerja dan tidak dalam kondisi macet (*hang*), terutama saat proses analisis yang memakan waktu lama.

## Detail Teknis & Arsitektur
Unified Process Card dirancang sebagai komponen **React** yang bertugas sebagai orkestrator status visual:
-   **UI & Styling**: Menggunakan **Tailwind CSS** untuk layout dan **Shadcn/UI (Collapsible)** untuk mekanisme buka-tutup konten.
-   **Komponen Terintegrasi**: Menggabungkan beberapa indikator status sekaligus, termasuk `SearchStatusIndicator` (untuk pencarian web) dan `ToolStateIndicator` (untuk status penggunaan alat AI).
-   **Animasi Real-time**: Menggunakan animasi *pulse* kustom untuk memberikan umpan balik visual instan saat Agent sedang dalam proses *streaming* data.

## Rujukan Kode
- `src/components/chat/UnifiedProcessCard.tsx`: Komponen utama yang merender tampilan rencana kerja dan indikator proses.
- `src/lib/paper/task-derivation.ts`: Logika yang menurunkan (derive) daftar langkah kerja berdasarkan tahapan aktif. Mendukung dua path: model-driven via `_plan` (jika Agent mengisi `stageData._plan`) dan fallback hardcoded `STAGE_TASKS`.
