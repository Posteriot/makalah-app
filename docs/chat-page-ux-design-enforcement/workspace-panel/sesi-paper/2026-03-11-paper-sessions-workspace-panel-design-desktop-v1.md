# Paper Sessions Workspace Panel Design

> Status: validated through handoff review and user discussion on 2026-03-11
> Scope: desktop only

## 1. Latar Belakang

Saat ini sidebar `Sesi Paper` masih memikul dua responsibility sekaligus:

- menampilkan sesi paper aktif untuk percakapan yang sedang dibuka
- menampilkan daftar `Sesi Lainnya`

Susunan ini membuat sidebar terlalu berat dan mencampur konteks aktif dengan navigator sesi nonaktif. Handoff untuk branch `chat-page-ux-design-enforcement` sudah mengunci arah UX berikut:

- sidebar `Sesi Paper` harus fokus ke sesi aktif percakapan sekarang
- daftar sesi nonaktif harus dipindahkan ke workspace panel kanan desktop
- panel sesi paper harus berdiri sendiri, tidak menempel pada `Kelola Percakapan`

Dokumen ini mendefinisikan desain arsitektur dan UX untuk perpindahan tersebut tanpa mengubah semantics data atau aturan bisnis sesi paper yang sudah ada.

## 2. Tujuan dan Prinsip Desain

### Tujuan

- Memindahkan daftar sesi paper yang tidak aktif dari sidebar ke workspace panel kanan desktop.
- Menjaga sidebar `Sesi Paper` tetap fokus pada konteks aktif untuk percakapan yang sedang dibuka.
- Menyediakan panel sesi paper mandiri yang menjadi padanan baru dari area `Sesi Lainnya`.

### Prinsip

- Perubahan ini adalah pemisahan responsibility UI, bukan redesign paper workflow.
- Sumber data dan semantics sesi paper tetap mengikuti perilaku sistem saat ini.
- Panel sesi paper baru bukan submenu, tab, atau variasi label dari `Kelola Percakapan`.
- Orkestrasi panel kanan tetap terpusat di `ChatLayout`.
- Perilaku artifact tetap konsisten: panel workspace menutupi artifact sementara, lalu artifact dipulihkan saat panel ditutup.

## 3. Rekomendasi Pendekatan

### Pendekatan yang dipilih

Tambahkan mode panel kanan baru bernama `paper-sessions-manager` di `ChatLayout`, lalu buat komponen panel mandiri `PaperSessionsManagerPanel` yang memakai `WorkspacePanelShell`.

### Alasan pemilihan

- Paling sesuai dengan handoff yang meminta panel sesi paper mandiri.
- Menjaga orkestrasi panel kanan tetap konsisten dan mudah dipahami.
- Menghindari boolean liar atau state panel sampingan di luar `ChatLayout`.
- Memungkinkan reuse pola restore artifact yang sudah ada untuk `conversation-manager`.

### Pendekatan yang ditolak

#### Reuse `ConversationManagerPanel`

Ditolak karena akan mencampur semantics `Kelola Percakapan` dengan navigator sesi paper.

#### Popup kecil atau accordion tambahan di sidebar

Ditolak karena tidak menyelesaikan masalah pembagian responsibility UI dan bertentangan dengan target UX.

#### Tetap query dan filter daftar sesi nonaktif sepenuhnya di sidebar

Ditolak karena sidebar akan tetap memikul responsibility global yang seharusnya pindah ke panel kanan.

## 4. Arsitektur Panel dan Responsibility Komponen

### Orkestrasi utama

`ChatLayout` tetap menjadi orkestrator tunggal untuk viewport kanan desktop.

State `workspacePanelMode` diperluas dari:

```ts
"conversation-manager" | null
```

menjadi:

```ts
"conversation-manager" | "paper-sessions-manager" | null
```

`activeRightPanelMode` tetap menjadi sumber kebenaran untuk memutuskan apakah panel kanan sedang menampilkan:

- artifact
- `conversation-manager`
- `paper-sessions-manager`
- tidak ada panel

### Komponen baru

Tambahkan komponen panel mandiri:

- `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`

Komponen ini bertanggung jawab untuk:

- mengambil daftar sesi paper user
- mengecualikan sesi aktif percakapan sekarang
- menampilkan daftar sesi nonaktif
- menyediakan affordance navigasi ke percakapan milik sesi yang dipilih

### Reuse shell

`PaperSessionsManagerPanel` memakai:

- `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`

Tujuannya agar header panel, tombol close, dan body scroll tetap konsisten dengan workspace panel lain.

### Responsibility yang direfaktor

`SidebarPaperSessions` setelah perubahan hanya bertanggung jawab untuk:

- header `Sesi Paper`
- sublabel `Folder Artifak · N sesi`
- tombol settings pembuka panel sesi paper
- sesi aktif untuk percakapan sekarang
- expand/collapse artifact dalam sesi aktif

`SidebarPaperSessions` tidak lagi merender `Sesi Lainnya` pada state apa pun.

`ConversationManagerPanel` tetap khusus untuk `Kelola Percakapan` dan tidak menerima logic sesi paper.

`ChatSidebar` hanya meneruskan callback pembuka panel sesi paper dari `ChatLayout` ke `SidebarPaperSessions`, sama seperti pola pembuka `Kelola Percakapan`.

## 5. Perilaku UX yang Ditargetkan

### Sidebar `Sesi Paper`

Header sidebar menampilkan:

- label `Sesi Paper`
- sublabel `Folder Artifak · N sesi`
- tombol settings di sisi kanan header

Setelah perubahan:

- section `Sesi Lainnya` hilang total dari sidebar
- sesi aktif tetap tampil jika percakapan sekarang memiliki paper session
- artifact dalam sesi aktif tetap bisa diexpand/collapse seperti sekarang
- jika percakapan sekarang tidak punya paper session aktif, sidebar hanya menampilkan indikator kosong untuk percakapan itu

### Workspace panel sesi paper

Panel kanan baru berfungsi sebagai navigator sesi paper nonaktif.

Karakter panel:

- mandiri
- ringan
- non-destruktif
- fokus navigasi/switching

Panel ini bukan session manager berat dan tidak membawa operasi seperti bulk delete, rename massal, search, atau filter kompleks.

### Perilaku artifact

Saat panel sesi paper dibuka ketika artifact aktif:

- artifact disembunyikan sementara

Saat panel sesi paper ditutup:

- artifact yang sebelumnya aktif dipulihkan kembali

Perilaku ini harus mengikuti pola restore yang sudah dipakai oleh panel `Kelola Percakapan`.

## 6. Data dan Aturan Tampilan

### Sumber data

- Sesi aktif sidebar tetap diambil lewat `usePaperSession(currentConversationId)`.
- Daftar sesi global panel baru mengikuti perilaku `Sesi Lainnya` yang ada saat ini, yaitu daftar sesi user dari query yang sekarang dipakai sidebar.

### Aturan daftar panel

Panel sesi paper hanya menampilkan sesi nonaktif, yaitu sesi selain sesi aktif percakapan sekarang.

Ini bukan perubahan semantics produk baru, melainkan perpindahan lokasi render dari `Sesi Lainnya` yang sudah ada sekarang.

### Data minimal per item

Setiap item panel minimal menampilkan:

- judul sesi
- stage saat ini
- jumlah artifak
- affordance bahwa item bisa dipakai untuk berpindah ke percakapan terkait

### Navigasi item

Saat item panel dipilih, user diarahkan ke `conversationId` milik session tersebut.

## 7. Scope Implementasi

### Masuk scope

- menambah trigger settings pada header `Sesi Paper` desktop
- memperluas `workspacePanelMode` di `ChatLayout`
- membuat `PaperSessionsManagerPanel` sebagai workspace panel mandiri
- memindahkan daftar sesi nonaktif dari sidebar ke panel kanan baru
- mempertahankan sesi aktif di sidebar
- mempertahankan pola restore artifact saat panel ditutup

### Keluar scope

- mobile behavior
- pencarian session
- filter/sort kompleks
- delete session
- rename session dari panel baru
- penggabungan dengan `Kelola Percakapan`
- perubahan semantics data sesi paper

## 8. Risiko Teknis

### Branch render sidebar

`SidebarPaperSessions` memiliki beberapa branch render besar. Risiko utamanya adalah `Sesi Lainnya` tertinggal di salah satu branch jika refactor dilakukan setengah-setengah.

### Auto-expand sesi aktif

State seperti `expandedFolderId` dan `lastSyncedSessionId` harus tetap stabil setelah daftar sesi nonaktif dipindah keluar dari sidebar.

### Orkestrasi panel kanan

Perluasan mode panel di `ChatLayout` harus dilakukan dengan hati-hati agar:

- artifact panel tetap berfungsi
- restore artifact tetap benar
- panel `Kelola Percakapan` tidak regresi

### Pengambilan jumlah artifak

Panel baru membutuhkan jumlah artifak per sesi. Implementasi harus tetap sederhana dan tidak menambah kompleksitas fitur di luar kebutuhan perpindahan responsibility UI.

## 9. Definisi Selesai

Batch ini dianggap selesai jika:

- sidebar `Sesi Paper` tidak lagi merender `Sesi Lainnya`
- header `Sesi Paper` memiliki trigger settings yang jelas
- trigger membuka workspace panel kanan mandiri untuk sesi paper
- panel sesi paper tidak menempel pada `Kelola Percakapan`
- panel sesi paper bisa ditutup
- artifact yang sebelumnya aktif dipulihkan saat panel sesi paper ditutup

## 10. File Referensi Inti

- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`
- `src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- `src/lib/hooks/usePaperSession.ts`
- `convex/paperSessions.ts`
