# Chat Page UX Design Enforcement

Dokumen ini menjadi handoff utama untuk branch `chat-page-ux-design-enforcement`.

Tujuannya adalah menyimpan konteks kerja yang sudah divalidasi, status implementasi yang sudah selesai, keputusan arsitektur yang sudah dipilih, dan titik lanjut yang masih bisa diteruskan pada sesi berikutnya tanpa mengulang eksplorasi dari nol.

## Ringkasan Branch

- Branch aktif: `chat-page-ux-design-enforcement`
- Worktree aktif: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement`
- Fokus branch: penegakan kualitas UI/UX halaman chat
- Ruang lingkup utama yang sudah dikerjakan:
  - transparansi jumlah riwayat percakapan di sidebar chat
  - pemindahan `Kelola Percakapan` dari halaman penuh ke `workspace panel` kanan dalam halaman chat
  - penyederhanaan dan pemadatan desktop chat composer agar mengikuti mental model mobile

## Keputusan Arsitektur yang Sudah Dikunci

### 1. Workspace Manager halaman penuh ditinggalkan

Versi route penuh `/chat/workspace-manager` sudah dihapus. Entry UI utama sekarang bukan lagi halaman terpisah, tetapi `workspace panel` kanan di dalam shell chat.

Implikasinya:

- user tetap berada di konteks `/chat/*`
- `Kelola Percakapan` dibuka dari kontrol di area `Riwayat`
- panel kanan berbagi slot viewport dengan artifact
- close `x` memulihkan artifact yang sebelumnya aktif

Referensi dokumen:

- `workspace-panel/2026-03-11-chat-workspace-panel-overlay-governance.md`
- `workspace-panel/2026-03-11-chat-workspace-panel-conversation-rollout-plan.md`

### 2. Sidebar chat tetap slice 50, tetapi total count harus akurat

Masalah awalnya adalah badge/header riwayat menghitung `conversations.length`, padahal query daftar dibatasi 50 item. Solusi yang dipilih:

- sidebar tetap memakai `listConversations` dengan batas 50 terbaru
- total riwayat memakai query terpisah `countConversations`
- UI riwayat menampilkan `displayedCount dari totalCount`

Catatan penting:

- error `conversations:countConversations` pernah muncul beberapa kali karena deployment Convex aktif stale atau tertimpa backend checkout lain
- solusi operasional yang sudah terbukti: push ulang function dari worktree ini ke deployment aktif

### 3. Desktop chat composer mengikuti mental model mobile

Desktop composer tidak lagi diperlakukan sebagai layout terpisah yang lebih berat. Arah yang sudah dipilih:

- state kosong: satu baris
- strip konteks inline di baris atas
- separator tipis
- textarea tumbuh otomatis sampai maksimum lima baris
- batas input `8000` karakter
- mobile tidak diubah

Referensi dokumen:

- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-design.md`
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-rollout-plan.md`

## Status Implementasi Saat Ini

### Sudah Selesai

#### A. Conversation management di workspace panel

Sudah aktif:

- trigger `Kelola Percakapan` dari header `Riwayat`
- panel kanan reusable untuk mode `conversation-manager`
- restore artifact saat panel ditutup
- daftar percakapan terpaginasikan
- select all untuk halaman aktif
- hapus satu
- hapus pilihan
- hapus semua dengan konfirmasi keras

Status UI saat ini:

- checkbox sudah dipindah dari amber ke `slate` adaptif light/dark
- ikon destruktif sudah dibedakan:
  - hapus satu = `Trash`
  - hapus pilihan = `BinMinusIn`
  - hapus semua = `BinFull`

#### B. Desktop chat composer

Sudah aktif:

- strip konteks inline
- separator tipis dengan spacing yang sudah dirapikan
- textarea desktop satu baris saat kosong
- auto-grow hingga lima baris
- scrollbar tipis untuk konteks dan textarea
- limit input `8000`
- tombol pause sudah diperkecil
- glow hover pause dihapus
- state pause aktif diam sudah digeser ke varian sky tinted

#### C. Route lama workspace manager

Route penuh `/chat/workspace-manager` sudah dihapus dan tidak lagi menjadi entry utama UI.

### Belum Menjadi Fokus Lanjutan

Fondasi reusable panel kanan sudah disiapkan untuk mode berikut, tetapi belum diaktifkan:

- `paper-session-extended`
- `attachments-list`
- `knowledge-base`

Saat ini UI aktif tetap fokus ke `Kelola Percakapan`.

## File Kode Utama yang Perlu Dipahami di Sesi Berikutnya

### Shell chat dan panel kanan

- `src/components/chat/layout/ChatLayout.tsx`
- `src/components/chat/ChatSidebar.tsx`
- `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`
- `src/components/chat/workspace-panel/ConversationManagerPanel.tsx`

### Management UI percakapan

- `src/components/chat/workspace-manager/ConversationManagerTable.tsx`
- `src/components/chat/workspace-manager/DeleteSelectedDialog.tsx`
- `src/components/chat/workspace-manager/DeleteAllConversationsDialog.tsx`

### Data flow percakapan

- `src/lib/hooks/useConversations.ts`
- `convex/conversations.ts`

### Chat composer desktop

- `src/components/chat/ChatInput.tsx`
- `src/app/globals-new.css`

## File Test yang Sudah Menjadi Bukti Regresi

### Workspace panel dan conversation manager

- `__tests__/chat/chat-layout-workspace-panel.test.tsx`
- `__tests__/chat/workspace-manager-shell.test.tsx`
- `__tests__/chat/workspace-manager-conversations.test.tsx`
- `__tests__/chat/workspace-manager-bulk-delete.test.tsx`
- `__tests__/chat/workspace-manager-delete-all.test.tsx`
- `__tests__/chat/workspace-manager-style-contract.test.ts`
- `__tests__/chat/sidebar-history-count.test.tsx`

### Desktop composer

- `__tests__/chat/chat-input-desktop-layout.test.tsx`
- `__tests__/chat/chat-input-desktop-limit.test.tsx`
- `__tests__/chat/chat-input-style-contract.test.ts`
- `__tests__/chat/attachment-send-rule.test.tsx`
- `__tests__/chat/clear-attachment-context.test.tsx`
- `__tests__/chat/konteks-tray-ui.test.tsx`

## Commit Penting untuk Menelusuri Progres

Urutan commit paling relevan di branch ini:

- `a7a2ba8` `docs: lock workspace manager design and plan`
- `1f2fbf0` `docs: add workspace manager audit note`
- `7562a1b` `feat: add workspace manager conversation controls`
- `b54ab60` `fix: unblock convex dev schema compatibility`
- `10f7b44` `refactor: simplify workspace manager layout`
- `7e3a8a9` `feat: move conversation manager into chat workspace panel`
- `1e6b4f4` `refactor: remove workspace manager route`
- `7e25747` `refactor: refine conversation manager panel chrome`
- `4f16bc6` `refactor: streamline desktop chat composer`
- `d71a921` `refactor: polish chat composer controls`
- `9ad4c59` `refactor: clarify conversation manager destructive actions`
- `f3455f9` `docs: sync workspace panel planning artifacts`

## Constraint Visual dan UX yang Wajib Dipatuhi

### Chat page harus patuh ke token chat

Seluruh perubahan di `/chat/*` wajib mengikuti `globals-new.css`, bukan bahasa visual halaman lain.

Aturan yang sudah divalidasi:

- tidak boleh amber untuk area chat ini bila melanggar konvensi chat
- tidak boleh bocor token `core` atau idiom visual dashboard
- tidak boleh menambah global header/footer ke halaman chat
- checkbox, separator, panel, hover, dan scrollbar harus tunduk ke token `--chat-*`

### Workspace panel bukan admin page penuh

Walaupun struktur manajemennya sempat terinspirasi admin panel, keputusan final yang dipakai sekarang adalah panel kanan kontekstual di dalam halaman chat.

### Composer desktop harus tetap hemat tinggi

Jangan mengembalikan tray konteks besar atau membuat row aksi tambahan yang membengkakkan composer.

## Catatan Operasional Convex

Masalah `Could not find public function for 'conversations:countConversations'` sudah pernah muncul berulang.

Penyebab yang pernah terbukti:

- deployment Convex aktif stale
- push function dari checkout lain menimpa deployment yang sama
- proses `convex dev` aktif tidak otomatis merefleksikan function terbaru sampai dipaksa push

Verifikasi yang terbukti benar:

1. cek fungsi lokal memang ada di `convex/conversations.ts`
2. jalankan push paksa dari worktree ini
3. verifikasi dengan CLI sampai error berubah dari `function not found` menjadi validasi argumen

Perintah yang pernah berhasil:

```bash
npm run convex -- run conversations:countConversations '{}' --push --typecheck disable
npm run convex -- run conversations:countConversations '{}'
```

Kalau perintah kedua sudah tidak lagi menampilkan `Could not find function`, berarti function backend aktif sudah masuk.

## Struktur Folder Docs Saat Ini

- `README.md`
  Handoff utama branch ini
- `workspace-panel/2026-03-11-chat-workspace-panel-overlay-governance.md`
  Design doc panel kanan untuk `Kelola Percakapan`
- `workspace-panel/2026-03-11-chat-workspace-panel-conversation-rollout-plan.md`
  Rollout plan implementasi workspace panel
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-design.md`
  Design doc composer desktop
- `input/2026-03-11-desktop-chat-input-inline-context-autogrow-rollout-plan.md`
  Rollout plan composer desktop

## Titik Lanjut yang Paling Masuk Akal

Kalau pekerjaan branch ini dilanjutkan lagi, titik lanjut paling logis adalah salah satu dari tiga ini:

1. review visual lanjutan untuk `ConversationManagerPanel`
2. review visual lanjutan untuk desktop composer chat
3. aktivasi mode panel reusable berikutnya setelah `conversation-manager`

Untuk memulai sesi baru dengan aman, baca README ini dulu, lalu buka dokumen design/plan di subfolder yang relevan sebelum menyentuh kode.
