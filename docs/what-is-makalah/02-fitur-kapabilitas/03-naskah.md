# Naskah (The Final Paper Preview)

Naskah adalah pratinjau (*preview*) final bagaimana paper akan ditampilkan secara utuh. Jika Artifak adalah draf per seksi, maka Naskah adalah "jahitan" lengkap dari seluruh seksi yang telah disetujui oleh User, dirancang dengan format profesional layaknya dokumen Microsoft Word atau Google Docs.

## Sifat "Naskah Bertumbuh"
Naskah Makalah AI tidak dibuat sekaligus di akhir, melainkan **bertumbuh secara organik**. Setiap kali User menyetujui sebuah seksi draf (melalui Validation Panel), bagian tersebut akan langsung ditambahkan ke dalam naskah utama secara otomatis. 

## Akses & Navigasi
-   **Open in New Tab**: Naskah dapat diakses melalui tombol **"Naskah jadi"** di bagian Top Bar halaman chat. Untuk kenyamanan penyuntingan dan pembacaan yang lebih fokus, naskah akan terbuka di tab baru (*New Tab*).
-   **Update Indicator**: Tombol naskah menampilkan dua sinyal berbeda: (1) **Titik putih** (`naskahUpdatePending`) — muncul setiap kali ada snapshot naskah baru yang belum dilihat User, menandakan ada konten baru yang bisa di-refresh; (2) **Efek kedip** (`animate-pulse`) — hanya muncul **sekali** saat naskah **pertama kali** menjadi tersedia (transisi `unavailable → available`), bukan setiap kali ada konten baru.

## Format Penulisan & Layout
Di dalam halaman naskah, User dapat melihat:
-   **Estimasi Halaman**: Jumlah halaman fisik yang sudah dihasilkan berdasarkan standar penulisan akademik (sekitar 2200 karakter per halaman).
-   **Format Akademik**: Penulisan judul, nama penulis, struktur bab, hingga daftar pustaka ditampilkan sesuai standar karya tulis ilmiah yang baku.
-   **Ekspor Dokumen**: Dari halaman naskah ini, User dapat mengunduh paper dalam format dokumen (PDF/Word) untuk kebutuhan final.

## Rujukan Kode
- `src/components/chat/shell/TopBar.tsx`: Implementasi tombol "Naskah jadi" dengan fitur *New Tab* dan indikator update.
- `convex/naskah.ts`: Data access layer untuk naskah — berisi query (`getLatestSnapshot`, `getSnapshotByRevision`, `getAvailability`, `getViewState`) dan mutation (`markViewed`). File ini **tidak** merakit konten; ia hanya membaca dan menulis data naskah ke/dari database.
- `convex/naskahRebuild.ts`: Logika backend yang memicu kompilasi dan menyimpan snapshot baru ke `naskahSnapshots`. Dipanggil otomatis dari `approveStage` di `convex/paperSessions.ts` setiap kali User menyetujui sebuah tahap.
- `src/app/naskah/[conversationId]/page.tsx`: Halaman utama untuk merender pratinjau naskah final.
- `src/lib/naskah/compiler.ts`: Logika penyusunan (kompilasi) draf dan penghitungan estimasi jumlah halaman.
