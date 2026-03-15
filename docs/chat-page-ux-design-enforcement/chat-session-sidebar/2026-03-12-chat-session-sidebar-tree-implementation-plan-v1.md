# Chat Session Sidebar Tree Implementation Plan v1

Dokumen ini menurunkan implementasi dari design doc:

- `2026-03-12-chat-session-sidebar-tree-design-v1.md`

Plan ini menganggap design doc tersebut sebagai sumber kebenaran baru dan menggantikan arah lama `workspace panel sesi paper`.

## 1. Tujuan Implementasi

Membangun ulang sidebar chat menjadi workspace tree yang mengintegrasikan:

- riwayat percakapan
- latest artifact/refrasa sebagai child paper
- mode delete berbasis conversation root

Sementara itu:

- panel kanan dikembalikan hanya untuk viewer `artifact/refrasa`
- `Linimasa Progres` tetap dipertahankan

## 2. Guardrail

### 2.1 Jangan dilakukan

- jangan mempertahankan `conversation-manager` sebagai mode aktif
- jangan membangun ulang panel kanan `Sesi Paper`
- jangan mempertahankan `paper-sessions-manager` sebagai mode aktif
- jangan menampilkan versi historis artifact di tree
- jangan menaruh checkbox permanen pada mode normal
- jangan menjadikan delete berakar di child artifact

### 2.2 Harus dipertahankan

- artifact viewer
- refrasa viewer
- `Linimasa Progres`
- open artifact read-only dari tree
- delete conversation sebagai root destructive action

## 3. Task Breakdown

### Task 1. Supersede panel kanan paper

File target:

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/shell/ActivityBar.tsx`

Pekerjaan:

- hapus orkestrasi `conversation-manager`
- hapus orkestrasi `paper-sessions-manager`
- hapus callback pembuka panel kanan conversation
- hapus callback pembuka panel kanan paper
- pastikan panel kanan hanya punya satu fungsi: viewer artifact/refrasa
- hapus tab/activity bar `paper` dari sidebar navigation
- sisakan activity bar untuk `Riwayat Percakapan` dan `Linimasa Progres` saja

Verifikasi:

- tidak ada lagi mode panel kanan paper yang bisa dibuka
- tidak ada lagi mode panel kanan conversation manager yang bisa dibuka
- panel kanan artifact tetap bekerja

### Task 2. Bangun model data tree untuk sidebar

File target:

- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- helper baru bila perlu di `src/lib/...`

Pekerjaan:

- ambil conversation list
- gabungkan dengan `paperSessions.getByUser`
- gabungkan dengan `artifacts.listByUser`
- bentuk model tree:
  - parent = conversation
  - children = latest artifact/refrasa untuk conversation itu
- siapkan penanda:
  - punya paper session atau tidak
  - stage number/current stage label
  - jumlah latest artifact
- pastikan conversation tanpa paper session tetap menjadi row biasa tanpa child tree

Guardrail:

- jangan infer kualitas data
- hanya normalisasi dan grouping
- tampilkan latest-only

Verifikasi:

- conversation tanpa paper session tetap tampil
- conversation dengan paper session punya child tree yang benar

### Task 3. Ubah row percakapan menjadi tree node

File target:

- `src/components/chat/sidebar/SidebarChatHistory.tsx`

Pekerjaan:

- tambahkan chevron expand/collapse
- klik chevron hanya toggle
- klik label row membuka percakapan
- render child tree di bawah parent yang expanded
- auto-expand parent aktif jika punya child
- batasi satu subtree expanded pada satu waktu
- jika conversation tidak punya paper session, jangan render chevron dan jangan render child container

Verifikasi:

- navigasi percakapan tidak rusak
- toggle tree tidak salah membuka conversation

### Task 4. Pindahkan paper subtree dari `SidebarPaperSessions`

File target:

- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/sidebar/SidebarChatHistory.tsx`

Pekerjaan:

- pindahkan logic latest artifact/refrasa yang masih relevan
- hentikan `SidebarPaperSessions` sebagai panel aktif tersendiri
- jika komponen lama tidak diperlukan lagi, jadwalkan penghapusan

Verifikasi:

- seluruh informasi paper di sidebar berasal dari tree conversation
- tidak ada duplikasi `Sesi Paper` di area lain

### Task 5. Hubungkan child file ke viewer kanan

File target:

- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- `src/lib/hooks/useArtifactTabs.ts`

Pekerjaan:

- klik child file artifact/refrasa membuka viewer kanan
- origin metadata tetap dibawa bila masih diperlukan untuk rail return
- artifact panel tetap viewer-only

Verifikasi:

- child artifact membuka viewer yang benar
- child refrasa membuka viewer yang benar

### Task 6. Pertahankan `Linimasa Progres`

File target:

- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/sidebar/SidebarProgress.tsx`
- `src/components/chat/shell/ActivityBar.tsx`

Pekerjaan:

- pertahankan `Linimasa Progres` sebagai tab/activity terpisah
- pastikan ia tetap membaca percakapan aktif
- jangan campur ke tree file explorer

Verifikasi:

- progress masih tampil untuk conversation aktif

### Task 7. Bangun mode kelola/delete di sidebar

File target:

- `src/components/chat/sidebar/SidebarChatHistory.tsx`
- dialog baru bila perlu di `src/components/chat/sidebar/...`
- backend mutation reuse atau wrapper baru di `convex/conversations.ts`

Pekerjaan:

- tambahkan mode normal vs mode kelola
- mode kelola menampilkan checkbox hanya di parent conversation rows
- tambah actions:
  - pilih satu
  - pilih banyak
  - pilih semua yang tampil
  - hapus terpilih
  - hapus semua
- copy dialog harus menjelaskan konsekuensi subtree

Verifikasi:

- child nodes tidak punya checkbox
- delete tetap berakar di parent conversation

### Task 8. Incremental loading seluruh conversation

File target:

- `convex/conversations.ts`
- `src/lib/hooks/useConversations.ts` atau setara
- `src/components/chat/sidebar/SidebarChatHistory.tsx`

Pekerjaan:

- ubah initial list conversation menjadi `20`
- tambah incremental loading via scroll bawah
- pertahankan exact total count di header bila tersedia

Verifikasi:

- initial render tidak memuat semua conversation
- scrolling memuat batch berikutnya

### Task 9. Hapus affordance UI yang obsolete

File target:

- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/layout/ChatLayout.tsx`
- tests terkait

Pekerjaan:

- hapus settings button `Riwayat` yang membuka panel kanan conversation manager
- hapus settings button pembuka panel paper
- hapus label/section `Sesi Paper` lama di sidebar jika sudah terserap ke tree
- hapus wiring mode panel paper
- hapus wiring mode panel conversation manager

Verifikasi:

- tidak ada affordance mati/ghost UI

## 4. Urutan Eksekusi yang Direkomendasikan

Urutan terbaik:

1. Task 1
2. Task 2
3. Task 3
4. Task 4
5. Task 5
6. Task 6
7. Task 9
8. Task 7
9. Task 8

Alasan:

- tree model harus stabil dulu
- viewer artifact harus tetap aman dulu
- mode delete baru dibangun setelah struktur parent-child final
- infinite loading paling aman disentuh terakhir agar tidak mengaburkan bug tree

## 5. Test Plan

### Unit/integration

- tree parent/child rendering
- auto-expand conversation aktif
- satu subtree expanded pada satu waktu
- child latest-only rule
- child artifact click membuka viewer
- child refrasa click membuka viewer
- delete mode show/hide checkbox
- bulk select parent rows only
- delete current conversation redirect behavior
- incremental loading append batch berikutnya

### Browser/manual

- buka percakapan aktif dan lihat subtree auto-expand
- buka percakapan nonaktif via chevron
- klik label parent dan pastikan navigasi conversation tetap benar
- klik child artifact dan pastikan viewer kanan benar
- aktifkan mode kelola dan lakukan single delete
- bulk select dan hapus terpilih
- scroll ke bawah dan pastikan batch berikutnya masuk

## 6. Risiko

### Risiko 1. Sidebar menjadi terlalu padat

Mitigasi:

- latest-only
- satu subtree expanded
- mode delete terpisah

### Risiko 2. Navigasi parent vs toggle tree bentrok

Mitigasi:

- chevron terpisah
- klik label tetap buka percakapan

### Risiko 3. State aktif dan expanded bentrok saat route berubah

Mitigasi:

- state expanded disinkronkan dengan conversation aktif
- fallback satu subtree saja

### Risiko 4. Refactor panel kanan meninggalkan wiring mati

Mitigasi:

- audit `workspacePanelMode`
- hapus seluruh referensi `paper-sessions-manager`

## 7. Definisi Selesai

Batch ini selesai jika:

- sidebar menjadi tree workspace percakapan
- child latest artifact/refrasa tampil di bawah conversation yang relevan
- activity bar/sidebar `Sesi Paper` hilang
- panel kanan hanya artifact/refrasa viewer
- `Linimasa Progres` tetap hidup
- affordance panel kanan manajemen conversation hilang
- delete mode di sidebar mendukung single/many/all
- load conversation incremental berjalan
- arah lama `workspace panel sesi paper` tidak tersisa di UX utama
