# Workspace Manager Conversation Control Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** membangun transparansi total riwayat di sidebar chat dan route penuh `Workspace Manager` dengan tab `Percakapan` yang mendukung paginasi serta destructive actions aman.

**Architecture:** sidebar chat tetap memakai slice cepat 50 conversation terbaru, sementara `Workspace Manager` memakai query paginasi server-side dan query total count terpisah. Struktur layout meniru admin panel, tetapi styling harus murni memakai token chat dari `src/app/globals-new.css`.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex query/mutation, Tailwind CSS 4, token chat scoped di `src/app/globals-new.css`, Vitest.

---

### Task 1: Kunci kontrak desain dan audit file target

**Files:**
- Read: `docs/chat-page-ux-design-enforcement/2026-03-10-workspace-manager-chat-governance-design.md`
- Read: `src/components/chat/ChatSidebar.tsx`
- Read: `src/components/chat/layout/ChatLayout.tsx`
- Read: `src/components/admin/AdminPanelContainer.tsx`
- Read: `src/components/admin/AdminSidebar.tsx`

**Step 1: Baca design doc dan tandai acceptance criteria**

Catat kontrak berikut sebagai sumber kebenaran:

- sidebar tetap `take(50)`
- header harus menampilkan `displayedCount dari totalCount`
- manager route penuh baru di domain chat
- route manager harus tersedia untuk semua user yang login, bukan admin-only
- visual wajib memakai token chat
- tab awal hanya `Percakapan`
- destructive actions aman dan sinkron ke sidebar

**Step 2: Audit file shell yang akan direuse**

Verifikasi bagian mana yang aman direuse:

- pola grid/shell admin panel
- pola sidebar internal
- pola sheet mobile

**Step 3: Catat file baru dan file existing yang akan disentuh**

Minimal ekspektasi:

- modify `convex/conversations.ts`
- modify `src/lib/hooks/useConversations.ts`
- modify `src/components/chat/ChatSidebar.tsx`
- create route baru di `src/app/chat/workspace-manager/`
- create komponen shell manager di `src/components/chat/workspace-manager/`
- pastikan route tidak tergantung role admin/superadmin

**Step 4: Commit checkpoint**

```bash
git add docs/chat-page-ux-design-enforcement/2026-03-10-workspace-manager-chat-governance-design.md docs/chat-page-ux-design-enforcement/2026-03-10-workspace-manager-conversation-control-plan.md
git commit -m "docs: lock workspace manager design and plan"
```

### Task 2: Tambah test gagal untuk total count conversation

**Files:**
- Test: `__tests__/chat/sidebar-history-count.test.tsx`
- Read: `src/components/chat/ChatSidebar.tsx`
- Read: `src/lib/hooks/useConversations.ts`

**Step 1: Tulis test gagal untuk header sidebar**

Tuliskan kasus:

- sidebar menerima 50 item conversation
- totalCount terpisah bernilai 1000
- header harus menampilkan format `50 dari 1000`

Tambahkan juga kasus:

- bila `totalCount <= 50`, header tetap menampilkan angka dengan semantik transparan

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/sidebar-history-count.test.tsx
```

Expected:

- FAIL karena `ChatSidebar` belum menerima dan menampilkan `totalCount`

**Step 3: Commit checkpoint**

```bash
git add __tests__/chat/sidebar-history-count.test.tsx
git commit -m "test: cover sidebar history transparency count"
```

### Task 3: Tambah query total count conversation

**Files:**
- Modify: `convex/conversations.ts`
- Test: `convex/conversations.count.test.ts`

**Step 1: Tulis test gagal untuk query count**

Kasus minimal:

- user hanya boleh menghitung conversation miliknya sendiri
- total count tidak dipotong 50

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run convex/conversations.count.test.ts
```

Expected:

- FAIL karena query `countConversations` belum ada

**Step 3: Implement query minimal**

Tambahkan query baru, misalnya `countConversations`, di `convex/conversations.ts`.

Aturan:

- verifikasi auth konsisten dengan query conversation lain
- hitung total conversation user dari sumber data yang sama
- jangan mengubah `listConversations`

**Step 4: Jalankan test untuk memastikan pass**

Run:

```bash
npx vitest run convex/conversations.count.test.ts
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add convex/conversations.ts convex/conversations.count.test.ts
git commit -m "feat: add conversation total count query"
```

### Task 4: Sambungkan totalCount ke hook dan header sidebar

**Files:**
- Modify: `src/lib/hooks/useConversations.ts`
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Modify: `src/components/chat/ChatSidebar.tsx`
- Test: `__tests__/chat/sidebar-history-count.test.tsx`

**Step 1: Perluas hook conversations**

Tambahkan query total count ke `useConversations()` dan expose field baru, misalnya:

- `totalCount`
- `displayedCount`

Jangan ubah array sidebar yang sudah dibatasi 50.

**Step 2: Update prop flow ke `ChatSidebar`**

Teruskan `totalCount` dari `ChatLayout` ke `ChatSidebar`.

**Step 3: Implement render header baru**

Ganti render badge agar menampilkan transparansi jumlah:

- `Riwayat`
- `50 dari 1000`
- tombol gear untuk `Workspace Manager`

Aturan styling:

- hanya pakai token chat
- tidak ada amber
- tetap konsisten dengan density dan border sidebar chat

**Step 4: Jalankan test**

Run:

```bash
npx vitest run __tests__/chat/sidebar-history-count.test.tsx
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add src/lib/hooks/useConversations.ts src/components/chat/layout/ChatLayout.tsx src/components/chat/ChatSidebar.tsx __tests__/chat/sidebar-history-count.test.tsx
git commit -m "feat: show transparent sidebar history count"
```

### Task 5: Tambah entry route penuh Workspace Manager

**Files:**
- Create: `src/app/chat/workspace-manager/page.tsx`
- Create: `src/components/chat/workspace-manager/WorkspaceManagerShell.tsx`
- Create: `src/components/chat/workspace-manager/WorkspaceManagerSidebar.tsx`
- Create: `src/components/chat/workspace-manager/WorkspaceManagerHeader.tsx`
- Read: `src/components/admin/AdminPanelContainer.tsx`
- Read: `src/components/admin/AdminSidebar.tsx`

**Step 1: Tulis test render route minimal**

Buat test komponen atau page-level yang memastikan:

- route merender judul `Workspace Manager`
- tab `Percakapan` aktif
- placeholder modul masa depan tampil non-aktif
- route bisa diakses user login biasa tanpa logika admin gate

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-shell.test.tsx
```

Expected:

- FAIL karena route dan shell belum ada

**Step 3: Implement shell manager**

Bangun layout yang meniru admin panel:

- sidebar internal kiri
- content kanan
- adaptasi ke token chat

Aturan keras:

- jangan import atau memakai class/token `core`
- struktur boleh meniru admin panel, visual wajib chat-native

**Step 4: Sambungkan tombol gear sidebar**

Tombol gear di `ChatSidebar` harus menavigasi ke `/chat/workspace-manager`.

**Step 5: Jalankan test**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-shell.test.tsx
```

Expected:

- PASS

**Step 6: Commit checkpoint**

```bash
git add src/app/chat/workspace-manager/page.tsx src/components/chat/workspace-manager/WorkspaceManagerShell.tsx src/components/chat/workspace-manager/WorkspaceManagerSidebar.tsx src/components/chat/workspace-manager/WorkspaceManagerHeader.tsx src/components/chat/ChatSidebar.tsx __tests__/chat/workspace-manager-shell.test.tsx
git commit -m "feat: add workspace manager shell"
```

### Task 6: Tambah query paginasi percakapan untuk Workspace Manager

**Files:**
- Modify: `convex/conversations.ts`
- Test: `convex/conversations.pagination.test.ts`

**Step 1: Tulis test gagal untuk query paginasi**

Kasus minimal:

- page 1 dan page 2 mengembalikan slice yang benar
- `totalCount` tetap benar
- hanya data milik user yang ikut

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run convex/conversations.pagination.test.ts
```

Expected:

- FAIL karena query paginasi manager belum ada

**Step 3: Implement query paginasi**

Tambahkan query paginasi baru khusus manager.

Keluaran minimal:

- `items`
- `page`
- `pageSize`
- `totalCount`

Hindari reuse `listConversations` untuk kebutuhan ini.

**Step 4: Jalankan test**

Run:

```bash
npx vitest run convex/conversations.pagination.test.ts
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add convex/conversations.ts convex/conversations.pagination.test.ts
git commit -m "feat: add paginated workspace conversation query"
```

### Task 7: Bangun tab Percakapan dengan list, checkbox, dan pagination

**Files:**
- Create: `src/components/chat/workspace-manager/ConversationManagerTable.tsx`
- Modify: `src/components/chat/workspace-manager/WorkspaceManagerShell.tsx`
- Test: `__tests__/chat/workspace-manager-conversations.test.tsx`

**Step 1: Tulis test gagal untuk state dasar**

Kasus minimal:

- menampilkan list conversation hasil paginasi
- checkbox per row tersedia
- pagination footer terlihat
- selection hanya berlaku untuk halaman aktif

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-conversations.test.tsx
```

Expected:

- FAIL

**Step 3: Implement tabel/list percakapan**

Terapkan:

- title
- relative time atau metadata dasar
- checkbox
- toolbar selection count
- pagination footer

Jangan tambahkan search atau filter kompleks.

**Step 4: Jalankan test**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-conversations.test.tsx
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add src/components/chat/workspace-manager/ConversationManagerTable.tsx src/components/chat/workspace-manager/WorkspaceManagerShell.tsx __tests__/chat/workspace-manager-conversations.test.tsx
git commit -m "feat: add workspace conversation table"
```

### Task 8: Tambah bulk delete untuk selection halaman aktif

**Files:**
- Modify: `convex/conversations.ts`
- Modify: `src/components/chat/workspace-manager/ConversationManagerTable.tsx`
- Create: `src/components/chat/workspace-manager/DeleteSelectedDialog.tsx`
- Test: `convex/conversations.bulk-delete.test.ts`
- Test: `__tests__/chat/workspace-manager-bulk-delete.test.tsx`

**Step 1: Tulis test gagal backend**

Kasus minimal:

- hanya conversation milik user yang boleh dihapus
- bulk delete menghapus semua id yang dipilih

**Step 2: Tulis test gagal UI**

Kasus minimal:

- tombol `Hapus pilihan` disabled saat tidak ada selection
- dialog muncul saat ada selection

**Step 3: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run convex/conversations.bulk-delete.test.ts __tests__/chat/workspace-manager-bulk-delete.test.tsx
```

Expected:

- FAIL

**Step 4: Implement mutation bulk delete + dialog**

Aturan:

- selection hanya untuk page aktif
- dialog copy jelas dan permanen
- setelah sukses, selection dibersihkan

**Step 5: Jalankan test**

Run:

```bash
npx vitest run convex/conversations.bulk-delete.test.ts __tests__/chat/workspace-manager-bulk-delete.test.tsx
```

Expected:

- PASS

**Step 6: Commit checkpoint**

```bash
git add convex/conversations.ts src/components/chat/workspace-manager/ConversationManagerTable.tsx src/components/chat/workspace-manager/DeleteSelectedDialog.tsx convex/conversations.bulk-delete.test.ts __tests__/chat/workspace-manager-bulk-delete.test.tsx
git commit -m "feat: add bulk delete for workspace conversations"
```

### Task 9: Tambah delete all dengan konfirmasi keras

**Files:**
- Modify: `convex/conversations.ts`
- Create: `src/components/chat/workspace-manager/DeleteAllConversationsDialog.tsx`
- Modify: `src/components/chat/workspace-manager/ConversationManagerTable.tsx`
- Test: `convex/conversations.delete-all.test.ts`
- Test: `__tests__/chat/workspace-manager-delete-all.test.tsx`

**Step 1: Tulis test gagal backend**

Kasus minimal:

- `deleteAll` hanya menghapus conversation user aktif
- mengembalikan jumlah item yang terhapus

**Step 2: Tulis test gagal UI**

Kasus minimal:

- tombol disabled saat total nol
- dialog butuh friction tambahan seperti ketik `HAPUS`
- total conversation tampil di dialog

**Step 3: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run convex/conversations.delete-all.test.ts __tests__/chat/workspace-manager-delete-all.test.tsx
```

Expected:

- FAIL

**Step 4: Implement mutation + dialog**

Aturan:

- destructive emphasis memakai token chat destructive
- ada friction tambahan
- setelah sukses, pagination dan selection reset aman

**Step 5: Jalankan test**

Run:

```bash
npx vitest run convex/conversations.delete-all.test.ts __tests__/chat/workspace-manager-delete-all.test.tsx
```

Expected:

- PASS

**Step 6: Commit checkpoint**

```bash
git add convex/conversations.ts src/components/chat/workspace-manager/DeleteAllConversationsDialog.tsx src/components/chat/workspace-manager/ConversationManagerTable.tsx convex/conversations.delete-all.test.ts __tests__/chat/workspace-manager-delete-all.test.tsx
git commit -m "feat: add delete all workspace conversations"
```

### Task 10: Tangani sinkronisasi dan redirect saat active conversation terhapus

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Modify: `src/components/chat/workspace-manager/WorkspaceManagerShell.tsx`
- Test: `__tests__/chat/workspace-manager-active-delete-redirect.test.tsx`

**Step 1: Tulis test gagal**

Kasus minimal:

- saat conversation aktif ikut terhapus dari manager, user diarahkan ke `/chat`
- sidebar merefresh dan tidak menyisakan row phantom

**Step 2: Jalankan test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-active-delete-redirect.test.tsx
```

Expected:

- FAIL

**Step 3: Implement defensive redirect dan reset state**

Aturan:

- tidak ada sinkronisasi lokal kompleks
- gunakan source data Convex dan routing aman

**Step 4: Jalankan test**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-active-delete-redirect.test.tsx
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add src/components/chat/layout/ChatLayout.tsx src/components/chat/workspace-manager/WorkspaceManagerShell.tsx __tests__/chat/workspace-manager-active-delete-redirect.test.tsx
git commit -m "fix: redirect safely after workspace conversation deletion"
```

### Task 11: Audit visual compliance dengan token chat

**Files:**
- Read: `src/app/globals-new.css`
- Read: `src/components/chat/workspace-manager/*.tsx`
- Test: `__tests__/chat/workspace-manager-style-contract.test.ts`

**Step 1: Tulis test kontrak styling**

Kasus minimal:

- komponen manager memakai token `--chat-*`
- tidak memakai amber
- tidak memakai token `core`

**Step 2: Jalankan test untuk memastikan gagal bila perlu**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-style-contract.test.ts
```

Expected:

- FAIL jika masih ada styling non-compliant

**Step 3: Rapikan implementasi hingga sesuai kontrak**

Verifikasi:

- warna aktif, border, hover, destructive state, dan background semua chat-native

**Step 4: Jalankan test**

Run:

```bash
npx vitest run __tests__/chat/workspace-manager-style-contract.test.ts
```

Expected:

- PASS

**Step 5: Commit checkpoint**

```bash
git add src/components/chat/workspace-manager __tests__/chat/workspace-manager-style-contract.test.ts
git commit -m "test: enforce workspace manager chat token compliance"
```

### Task 12: Jalankan verifikasi terintegrasi

**Files:**
- Read: semua file yang disentuh

**Step 1: Jalankan test yang relevan**

Run:

```bash
npx vitest run __tests__/chat/sidebar-history-count.test.tsx __tests__/chat/workspace-manager-shell.test.tsx __tests__/chat/workspace-manager-conversations.test.tsx __tests__/chat/workspace-manager-bulk-delete.test.tsx __tests__/chat/workspace-manager-delete-all.test.tsx __tests__/chat/workspace-manager-active-delete-redirect.test.tsx __tests__/chat/workspace-manager-style-contract.test.ts convex/conversations.count.test.ts convex/conversations.pagination.test.ts convex/conversations.bulk-delete.test.ts convex/conversations.delete-all.test.ts
```

Expected:

- PASS

**Step 2: Jalankan suite penuh bila perubahan sudah stabil**

Run:

```bash
npm test
```

Expected:

- PASS

**Step 3: Audit manual cepat**

Verifikasi:

- header sidebar menampilkan `displayedCount dari totalCount`
- gear menuju `/chat/workspace-manager`
- shell manager terasa seperti admin panel tetapi berwarna chat
- destructive flow memiliki friction yang cukup

**Step 4: Commit final**

```bash
git add convex/conversations.ts src/lib/hooks/useConversations.ts src/components/chat/ChatSidebar.tsx src/components/chat/layout/ChatLayout.tsx src/app/chat/workspace-manager src/components/chat/workspace-manager __tests__/chat
git commit -m "feat: add workspace manager conversation controls"
```

## Notes

- Jangan implement search, filter lanjutan, `Paper`, `Lampiran`, atau `Knowledge Base` di fase ini.
- Jangan implement cross-page selection.
- Jangan ubah `listConversations` sidebar menjadi query penuh.
- Jangan gunakan amber atau token `core` di route baru ini.
