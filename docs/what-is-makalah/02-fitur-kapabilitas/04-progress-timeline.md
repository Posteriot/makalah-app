# Progress Timeline (Pelacakan 14 Tahap)

Progress Timeline adalah representasi visual langsung dari [Workflow 14 Stage](workflow-14-stage.md). Terletak di dalam **Sidebar** aplikasi, fitur ini berfungsi sebagai instrumen pelacakan *real-time* yang memastikan setiap langkah dalam alur kerja paper terpantau dengan transparan, mulai dari ide awal hingga naskah siap ekspor.

## Akses Melalui Activity Bar
Untuk melihat linimasa progres, User dapat mengaksesnya melalui **Activity Bar** (bilah navigasi vertikal di sisi paling kiri).
-   **Ikon**: Menggunakan ikon cabang (**Git Branch**).
-   **Label**: Dinamai sebagai **"Linimasa progres"**.
-   **Mekanisme**: Mengklik ikon ini akan membuka panel Sidebar yang menampilkan daftar 14 tahapan pengerjaan paper secara vertikal.

## Status Tahapan (Milestones)
Setiap poin dalam linimasa mewakili satu tahapan kerja. Terdapat tiga status visual utama:

1.  **Selesai (Completed)**: 
    -   Ditandai dengan **titik bulat berwarna Teal/Emerald** (`oklch(0.777 0.152 181.912)`) — tidak ada ikon centang, hanya dot terisi penuh.
    -   Menandakan seksi tersebut sudah disetujui (Approved) dan masuk ke dalam naskah final.
2.  **Aktif (Active)**: 
    -   Ditandai dengan **titik bulat Teal/Emerald** (`--chat-success`) disertai efek ring/glow di sekelilingnya, dan teks status **"Sedang berjalan"** di bawah label tahap.
    -   Menunjukkan tahapan yang saat ini sedang diproses oleh Agent atau menunggu masukan User.
3.  **Mendatang (Future)**: 
    -   Ditandai dengan warna **Abu-abu** pudar.
    -   Menunjukkan langkah-langkah yang akan dikerjakan di masa depan.

## Fitur "Rewind" (Rollback)
Timeline ini mendukung kemampuan untuk **Kembali ke Masa Lalu** (Rollback):
-   **Cara Kerja**: User dapat mengklik tahapan yang sudah berstatus "Selesai" di dalam daftar sidebar.
-   **Aksi**: Sistem akan memicu dialog konfirmasi untuk melakukan *rollback* ke tahap tersebut.
-   **Tujuan**: Berguna jika User ingin mengubah arah riset atau memperbaiki data di bab yang sudah lewat.

## Detail Teknis & Arsitektur
Progress Timeline dibangun dengan komponen **React** yang terintegrasi erat dengan *State Management* aplikasi:
-   **Real-time Sync (Convex)**: Status setiap tahapan diperbarui secara instan melalui sistem reaktif Convex begitu Agent atau User melakukan aksi tertentu.
-   **UI Framework**: Menggunakan **Tailwind CSS** untuk layout vertikal yang rapi dan animasi indikator yang halus.
-   **Interaktivitas**: Menggunakan komponen **Shadcn/UI (Tooltip & AlertDialog)** untuk memberikan umpan balik informasi dan gerbang konfirmasi saat melakukan *Rewind*. `RewindConfirmationDialog` menggunakan `AlertDialog` (bukan `Dialog`) dari Shadcn/UI — komponen yang dirancang khusus untuk aksi destruktif yang memerlukan konfirmasi eksplisit.
-   **Ikonografi**: Menggunakan **Iconoir** — `GitBranch` untuk navigasi Activity Bar dan empty state, `Undo` + `WarningTriangle` untuk dialog konfirmasi Rewind. Tidak ada ikon centang; status visual milestone menggunakan dot (titik bulat) dengan warna dan ring CSS.

## Rujukan Kode
- `src/components/chat/shell/ActivityBar.tsx`: Pengatur navigasi ikon untuk membuka panel progres.
- `src/components/chat/sidebar/SidebarProgress.tsx`: Komponen visual utama yang merender linimasa vertikal di sidebar.
- `src/components/paper/RewindConfirmationDialog.tsx`: Dialog konfirmasi untuk fitur rollback.
- `convex/paperSessions/constants.ts`: Berisi definisi urutan 14 tahapan (`STAGE_ORDER`).
