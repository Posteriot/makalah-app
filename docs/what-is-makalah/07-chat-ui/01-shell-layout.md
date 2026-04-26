# Shell & Layout Architecture

Dokumen ini menjelaskan struktur dasar dan arsitektur visual yang membungkus pengalaman chat di Makalah AI. Seluruh tata letak ini dikelola secara terpusat di [ChatLayout.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/layout/ChatLayout.tsx).

## 1. Arsitektur 4-Panel

Aplikasi menggunakan sistem **4-Panel** yang bersifat *resizable* (bisa diatur ukurannya) untuk memberikan fleksibilitas maksimal kepada pengguna.

### A. Activity Bar (Kiri Jauh)
- **Komponen**: [ActivityBar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/shell/ActivityBar.tsx)
- **Lebar**: 48px.
- **Fungsi**: Navigasi global dan kontrol panel. Berisi tombol untuk berpindah antara panel Sidebar dan tombol untuk menutup/membuka sidebar secara total.

### B. Sidebar (Kiri)
- **Komponen**: [ChatSidebar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ChatSidebar.tsx)
- **Panel**:
  - **Riwayat**: Daftar percakapan masa lalu.
  - **Linimasa**: Visualisasi progres 14 stage penulisan paper.
- **Interaksi**: Bisa di-*collapse* untuk memberikan ruang lebih luas bagi area chat utama.

### C. Main Area (Tengah)
- **Top Bar**: [TopBar.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/shell/TopBar.tsx). Berisi judul, tombol navigasi "Naskah Jadi", *theme switcher*, dan indikator artifak.
- **Chat Window**: Area aliran pesan menggunakan `Virtuoso` untuk performa *infinite scrolling* yang efisien.
- **Chat Input**: *Composer* yang menetap (*fixed*) di bagian bawah.

### D. Artifact Panel (Kanan)
- **Komponen**: [ArtifactPanel.tsx](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/components/chat/ArtifactPanel.tsx)
- **Fungsi**: Panel untuk membaca atau mengedit artifak (seksi paper) tanpa kehilangan konteks chat.
- **Trigger**: Terbuka secara otomatis jika AI membuat artifak baru atau jika pengguna mengklik indikator artifak di dalam chat.

---

## 2. Fondasi Visual (Design System)

Meskipun `design-system.md` tidak dibuat sebagai file terpisah, seluruh UI chat dibangun di atas sistem token yang konsisten.

### CSS Tokens & Variables
Sistem menggunakan variabel CSS yang didefinisikan dalam [globals-new.css](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/app/globals-new.css):
- **Warna**: Dominasi palet gelap (*dark theme*) dengan aksen primer menggunakan warna oklch.
- **Surface**: Penggunaan `--chat-card`, `--chat-accent`, dan `--chat-background` untuk membedakan kedalaman visual antar panel.
- **Spacing**: Skala spacing yang ketat untuk menjaga kerapatan informasi tanpa terasa sesak.

### Responsivitas Mobile
- **MD Breakpoint (768px)**: Di bawah ukuran ini, layout berubah menjadi mode mobile.
- **Drawer System**: Sidebar berubah menjadi *sheet* (drawer) yang terbuka dari sisi kiri.
- **Safe Area**: Penanganan khusus untuk `safe-area-inset-bottom` pada perangkat iOS.

---

## 3. Top Bar Controls

Top Bar berfungsi sebagai pusat kendali navigasi sesi:
- **Naskah Link**: Tombol aktif berdasarkan status `naskahAvailable`.
- **Artifact Toggle**: Menampilkan *badge* jumlah artifak dan mengontrol status `isArtifactPanelOpen`.
- **Update Awareness**: Indikator titik (dot) yang muncul secara reaktif jika ada perubahan pada draf paper di sisi server.

---

**File Source Code Utama:**
- `src/components/chat/layout/ChatLayout.tsx`: Orchestrator tata letak 4-panel.
- `src/components/chat/shell/TopBar.tsx`: Pusat kendali header dan navigasi naskah.
- `src/components/chat/shell/ActivityBar.tsx`: Navigasi panel vertikal.
- `src/components/chat/ChatSidebar.tsx`: Pengelola riwayat dan linimasa progres.
- `src/app/globals-new.css`: Fondasi sistem desain dan token visual.
