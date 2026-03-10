# Workspace Manager Chat Governance Design

## Summary

- Scope: transparansi hitungan riwayat sidebar chat, entry ke route penuh `Workspace Manager`, dan fondasi tab `Percakapan` untuk manajemen seluruh conversation.
- Goal: memisahkan navigasi cepat 50 conversation terbaru dari area manajemen penuh yang scalable untuk modul lain.
- Constraint utama: struktur boleh meniru admin panel, tetapi seluruh visual harus patuh ke token halaman chat di `src/app/globals-new.css`, tanpa amber dan tanpa idiom visual `core`.

## Problem Statement

Header `Riwayat` di sidebar chat saat ini menampilkan `conversations.length`, padahal daftar yang dipakai sidebar diambil dari query yang dibatasi 50 item terbaru. Akibatnya, badge terlihat akurat hanya untuk user dengan total conversation kurang dari atau sama dengan 50, dan menjadi misleading untuk user dengan jumlah riwayat lebih besar.

Kebutuhan yang sudah divalidasi:

- Sidebar tetap menampilkan maksimal 50 conversation terbaru.
- Jumlah total sebenarnya tetap harus transparan di header sidebar.
- Harus ada entry point ke area manajemen penuh bernama `Workspace Manager`.
- `Workspace Manager` tersedia untuk semua user yang sudah login, termasuk admin dan superadmin; area ini bukan admin-only.
- `Workspace Manager` harus meniru struktur admin panel, tetapi styling wajib menggunakan token chat dari `globals-new.css`.
- Fase awal `Workspace Manager` fokus pada tab `Percakapan`.
- `Percakapan` harus mendukung daftar seluruh conversation dengan paginasi, delete selection, dan delete all yang sinkron ke sidebar.

## Product Decision

### Recommended Direction

Gunakan route penuh baru di domain chat, misalnya `/chat/workspace-manager`, sebagai rumah `Workspace Manager`.

Alasan:

- Area ini sudah melampaui fungsi panel bantu kecil; ia menjadi workspace manajemen data.
- Route penuh lebih aman untuk diskalakan ke `Paper`, `Lampiran`, dan `Knowledge Base`.
- Sidebar chat tetap ringan dan fokus pada navigasi cepat.
- Pola layout admin panel yang sudah ada bisa direuse secara struktur tanpa mencemari bahasa visual chat.

### Rejected Directions

- Menjadikan `Workspace Manager` sebagai panel tambahan di layout chat lama.
  Alasan: menambah kompleksitas layout utama chat dan mencampur mode navigasi dengan mode manajemen.
- Menghilangkan limit 50 pada sidebar.
  Alasan: salah dari sisi performa dan merusak tujuan sidebar sebagai quick access.
- Menambal copy header tanpa memperbaiki sumber data total.
  Alasan: menutupi bug, bukan menyelesaikan masalah.

## Information Architecture

### Sidebar Chat Existing Flow

- Sidebar tetap memakai daftar conversation terbaru yang dibatasi 50 item.
- Header sidebar diubah agar eksplisit menunjukkan `displayedCount dari totalCount`.
- Header sidebar juga memuat tombol gear yang membuka `Workspace Manager`.

### Workspace Manager Route

Route baru: `/chat/workspace-manager`

Peran:

- menjadi area manajemen penuh untuk aset yang terkait workspace chat user.
- tersedia untuk semua user terautentikasi, bukan area khusus admin.
- fase awal hanya membuka modul `Percakapan`.
- fase berikutnya dapat diperluas ke `Paper`, `Lampiran`, dan `Knowledge Base`.

### Workspace Manager Modules

Fase awal:

- `Percakapan` aktif.

Placeholder yang sudah disiapkan untuk skala berikutnya:

- `Paper`
- `Lampiran`
- `Knowledge Base`

## UI Structure

### Sidebar Header

Struktur header sidebar chat:

- label `Riwayat`
- transparansi jumlah, misalnya `50 dari 1000`
- tombol gear dengan label aksesibel `Buka Workspace Manager`

Aturan:

- angka 50 tetap merepresentasikan jumlah item yang sedang dimuat di sidebar.
- angka total berasal dari query total terpisah, bukan dari panjang array sidebar.

### Workspace Manager Layout

Layout `Workspace Manager` harus meniru struktur admin panel:

- sidebar internal kiri untuk modul manager
- content header kanan
- content body kanan

Tetapi visualnya wajib chat-native:

- background, card, border, selected state, hover, dan destructive state memakai token chat
- tidak memakai amber
- tidak membawa active nav atau signal warna dari halaman lain

### Percakapan Tab

Konten fase awal untuk tab `Percakapan`:

- judul area `Workspace Manager`
- subjudul/tab aktif `Percakapan`
- ringkasan total conversation
- indikator jumlah selection pada halaman aktif
- toolbar aksi
- list atau tabel seluruh conversation
- pagination footer

Toolbar fase awal:

- `Hapus pilihan`
- `Hapus semua`

Pencarian, filter lanjutan, sort kompleks, dan restore tidak masuk fase awal.

## Data Flow

### Sidebar Data

Sidebar chat tetap memakai query existing yang dibatasi 50 item terbaru.

Tujuan:

- menjaga sidebar tetap ringan
- menjaga perilaku navigasi cepat
- menghindari fetch data besar di layout utama chat

### Total Count Data

Tambahkan query total terpisah untuk menghitung seluruh conversation milik user.

Keluaran minimal:

- `totalCount`

Header sidebar menggunakan kombinasi:

- `displayedCount = conversations.length`
- `totalCount = countConversations`

### Workspace Manager Data

Tab `Percakapan` memakai query paginasi server-side yang berbeda dari query sidebar.

Keluaran minimal:

- `items`
- `totalCount`
- `page`
- `pageSize`

Mutation untuk delete single, bulk delete, dan delete all harus tetap berada dalam domain data conversation yang sama agar sinkron dengan sidebar.

### Source of Truth

Convex query/mutation menjadi single source of truth.

Aturan:

- tidak ada sinkronisasi state manual antara sidebar dan `Workspace Manager`
- delete dari manager harus otomatis merefresh sidebar melalui source data yang sama
- create conversation dari chat utama harus otomatis mengubah total dan daftar manager

## Destructive Actions and Safety

### Hapus Pilihan

- aktif hanya jika minimal satu row terpilih
- selection fase awal hanya berlaku pada halaman aktif
- tidak mendukung cross-page selection

### Hapus Semua

- harus ada dialog konfirmasi tingkat tinggi
- dialog menampilkan total item yang akan dihapus
- aksi dinyatakan permanen
- harus ada friction tambahan ringan, misalnya ketik `HAPUS`

### Edge Cases

- jika conversation aktif ikut terhapus, user diarahkan aman ke `/chat`
- jika bulk delete membuat halaman sekarang kosong, UI mundur ke halaman sebelumnya yang masih punya data
- jika dataset berubah dari tab/device lain, selection harus reset defensif
- `Hapus semua` disembunyikan atau dinonaktifkan saat total sudah nol

## Visual System Constraints

Semua visual wajib mengikuti konvensi halaman chat di `src/app/globals-new.css`.

Wajib:

- pakai token `--chat-*`
- pakai shape dan border yang konsisten dengan chat
- pakai mono treatment untuk angka dan status yang relevan
- pakai `--chat-destructive` untuk aksi hapus
- pakai `--chat-muted`, `--chat-accent`, `--chat-sidebar-*`, `--chat-border`, `--chat-background`, `--chat-card`

Dilarang:

- memakai amber untuk badge, CTA, active nav, atau highlight
- memakai token `core` untuk area manager
- membawa gaya visual dashboard non-chat ke route ini

## Reuse Strategy

Yang direuse:

- struktur shell admin panel
- pola layout sidebar-content
- pola komponen aksi destruktif dan mobile sheet jika relevan

Yang tidak direuse:

- styling `core`
- semantics visual admin panel yang bertentangan dengan chat

Komponen baru yang diperkirakan dibutuhkan:

- `WorkspaceManagerShell`
- `WorkspaceManagerSidebar`
- `WorkspaceManagerHeader`
- `ConversationManagerTable` atau `ConversationManagerList`
- `DeleteSelectedDialog`
- `DeleteAllConversationsDialog`

## Initial Scope and Deferred Scope

### In Scope

- transparansi `50 dari total`
- tombol entry ke `Workspace Manager`
- route `/chat/workspace-manager`
- shell manager gaya admin panel dengan token chat
- tab `Percakapan`
- paginasi server-side
- bulk delete pada page aktif
- delete all
- sinkronisasi otomatis ke sidebar

### Deferred

- `Paper`
- `Lampiran`
- `Knowledge Base`
- search
- filter lanjutan
- cross-page selection
- restore / trash bin

## Testing Requirements

Minimal verifikasi yang harus ada:

- test logic total count agar tidak mentok 50
- test query paginasi `Percakapan`
- test sinkronisasi delete dari manager ke sidebar
- test redirect aman saat conversation aktif dihapus
- test UI header sidebar untuk format `50 dari total`
- test state destructive actions saat selection kosong dan saat confirm delete all

## Acceptance Criteria

- Sidebar tetap hanya menampilkan 50 conversation terbaru.
- Header sidebar transparan tentang `displayedCount dari totalCount`.
- `Workspace Manager` terbuka sebagai route penuh baru di domain chat.
- `Workspace Manager` dapat diakses oleh semua user yang login, termasuk admin dan superadmin.
- Struktur layout meniru admin panel, tetapi semua styling patuh ke token chat.
- Tab `Percakapan` dapat memuat seluruh conversation via paginasi.
- `Hapus pilihan` dan `Hapus semua` bekerja dan memengaruhi sidebar secara sinkron.
- Tidak ada amber atau token `core` yang masuk ke visual `Workspace Manager`.
