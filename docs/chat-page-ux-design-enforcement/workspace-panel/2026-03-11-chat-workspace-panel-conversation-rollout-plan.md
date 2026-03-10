# Chat Workspace Panel Conversation Rollout Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memindahkan `Kelola Percakapan` dari halaman penuh menjadi `workspace panel` kanan di shell chat, sambil mempertahankan sinkronisasi penuh dengan sidebar riwayat dan state artifact yang sudah ada.

**Architecture:** Slot panel kanan di `ChatLayout` menjadi workspace viewport tunggal dengan mode terkontrol. `Kelola Percakapan` memakai fondasi data Convex yang sudah ada, tetapi UI daftar dan orchestration panel dirombak agar mengikuti pola inbox manajemen ala Gmail, tetap chat-native, dan reusable untuk mode panel masa depan. Implementasi panel harus mengikuti kontrak viewport kanan artifact yang sudah ada, bukan memaksakan modal atau drawer independen.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, Tailwind CSS 4, Vitest

---

### Task 1: Audit entry point dan state panel kanan yang sudah ada

**Files:**
- Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/layout/ChatLayout.tsx`
- Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatSidebar.tsx`
- Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ReasoningActivityPanel.tsx`
- Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-manager/WorkspaceManagerShell.tsx`

**Step 1: Catat kontrak state yang ada**

- identifikasi prop artifact panel yang sudah dikendalikan `ChatLayout`
- identifikasi trigger header `Riwayat` yang sekarang masih mengarah ke route atau entry lama
- identifikasi bagian mana yang perlu diubah agar mode panel kanan punya satu sumber kebenaran

**Step 2: Tulis checklist migrasi kecil**

- daftar state lama yang harus tetap bertahan
- daftar UI lama yang harus dipensiunkan
- daftar komponen yang masih layak dipanen

**Step 3: Commit**

```bash
git status --short
```

Expected: belum ada perubahan file sebelum task implementasi dimulai.

### Task 2: Tulis test gagal untuk orchestration panel kanan

**Files:**
- Create/Modify Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/chat-layout-workspace-panel.test.tsx`
- Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/workspace-manager-shell.test.tsx`

**Step 1: Tulis test untuk open manager dari header riwayat**

Cases:

- klik trigger membuka panel kanan `Kelola Percakapan`
- artifact sebelumnya tersembunyi dari viewport aktif
- state artifact terakhir tetap tersimpan

**Step 2: Tulis test untuk close dan restore artifact**

Cases:

- close `x` menutup panel manager
- jika sebelumnya artifact aktif, artifact kembali terlihat
- jika sebelumnya tidak ada panel aktif, panel kanan hilang

**Step 3: Tulis test untuk `Esc`**

Case:

- `Esc` menutup `Kelola Percakapan` dan memulihkan state sebelumnya

**Step 4: Tulis test aturan lebar panel**

Cases:

- `Kelola Percakapan` memakai slot panel kanan yang sama seperti artifact
- viewport kanan tetap menghormati minimum width area chat
- resize panel tetap berada dalam clamp layout chat yang ada

**Step 5: Run test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/chat-layout-workspace-panel.test.tsx
```

Expected: FAIL karena orkestrasi mode panel kanan belum ada.

**Step 6: Commit**

```bash
git add __tests__/chat/chat-layout-workspace-panel.test.tsx
git commit -m "test: cover chat workspace panel orchestration"
```

### Task 3: Implement mode viewport kanan tunggal di ChatLayout

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/layout/ChatLayout.tsx`
- Modify if needed: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatSidebar.tsx`

**Step 1: Tambah mode panel kanan generik**

Implement state yang merepresentasikan:

- `null`
- `artifact`
- `conversation-manager`

Sisakan bentuk yang mudah diperluas nanti ke:

- `paper-session-extended`
- `attachments-list`
- `knowledge-base`

**Step 2: Simpan context artifact terakhir**

Implement penyimpanan state artifact aktif agar bisa dipulihkan setelah manager ditutup.

**Step 3: Hubungkan trigger header riwayat**

Trigger `Kelola Percakapan` harus membuka mode `conversation-manager`, bukan route baru.

**Step 4: Pastikan permintaan artifact baru menang**

Jika manager sedang terbuka lalu artifact baru dipilih, manager ditutup dan artifact baru mengambil alih viewport kanan.

**Step 5: Run test**

Run:

```bash
npx vitest run __tests__/chat/chat-layout-workspace-panel.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx src/components/chat/ChatSidebar.tsx __tests__/chat/chat-layout-workspace-panel.test.tsx
git commit -m "feat: add reusable chat workspace panel state"
```

### Task 4: Tulis test gagal untuk daftar manajemen ala inbox

**Files:**
- Create/Modify Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/conversation-manager-panel.test.tsx`
- Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/workspace-manager-conversations.test.tsx`
- Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/workspace-manager-bulk-delete.test.tsx`
- Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/workspace-manager-delete-all.test.tsx`

**Step 1: Tulis test toolbar ala Gmail**

Cases:

- checkbox utama selalu tampil
- ikon `hapus pilihan` selalu tampil
- ikon bulk delete disabled saat belum ada selection

**Step 2: Tulis test `select all` halaman aktif**

Cases:

- checkbox utama memilih semua item page aktif
- selection bisa dikurangi per item
- checkbox utama masuk state `indeterminate`

**Step 3: Tulis test aksi delete**

Cases:

- ikon trash per item menghapus satu item
- bulk delete hanya menghapus selection pada halaman aktif
- `hapus semua` tetap melalui dialog konfirmasi keras

**Step 4: Run test untuk memastikan gagal**

Run:

```bash
npx vitest run __tests__/chat/conversation-manager-panel.test.tsx
```

Expected: FAIL karena UI panel inbox belum ada.

**Step 5: Commit**

```bash
git add __tests__/chat/conversation-manager-panel.test.tsx
git commit -m "test: define conversation manager panel behavior"
```

### Task 5: Ekstrak komponen panel `Kelola Percakapan`

**Files:**
- Create: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- Create if needed: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/WorkspacePanelShell.tsx`
- Reuse/Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ReasoningActivityPanel.tsx`
- Reuse/Reference: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/layout/ChatLayout.tsx`

**Step 1: Buat shell panel reusable**

Shell harus menyediakan:

- header ringan
- title
- close `x`
- body scrollable
- fondasi reusable untuk mode panel lain
- mengikuti kontrak slot viewport kanan yang sama dengan artifact, bukan drawer kedua yang hidup terpisah

**Step 2: Pindahkan inti UI percakapan dari halaman penuh**

Panen logika daftar, paginasi, dan aksi destruktif dari komponen lama yang relevan, lalu buang struktur halaman/card yang tidak dibutuhkan lagi.

**Step 3: Gunakan bahasa formal**

Pastikan semua copy formal dan tanpa pronoun.

**Step 4: Run test**

Run:

```bash
npx vitest run __tests__/chat/conversation-manager-panel.test.tsx
```

Expected: sebagian test masih FAIL sampai pola daftar selesai di task berikutnya.

**Step 5: Commit**

```bash
git add src/components/chat/workspace-panel/ConversationManagerPanel.tsx src/components/chat/workspace-panel/WorkspacePanelShell.tsx
git commit -m "feat: add reusable workspace panel shell"
```

### Task 6: Implement pola daftar inbox ala Gmail

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- Modify or extract from: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-manager/ConversationManagerTable.tsx`
- Modify Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/conversation-manager-panel.test.tsx`

**Step 1: Ganti tabel menjadi list row manajemen**

Setiap row minimal berisi:

- checkbox
- judul percakapan
- metadata waktu
- ikon trash

**Step 2: Implement checkbox utama**

Perilaku:

- select all page aktif
- unchecked
- checked
- indeterminate

**Step 3: Implement toolbar ikon-led**

- checkbox utama di kiri
- ikon `hapus pilihan` tetap tampil tetapi disabled saat selection kosong
- aksi `hapus semua` tetap terpisah

**Step 4: Pastikan row bukan entry navigasi**

- klik row tidak membuka percakapan
- aksi murni manajemen

**Step 5: Run test**

Run:

```bash
npx vitest run __tests__/chat/conversation-manager-panel.test.tsx
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/chat/workspace-panel/ConversationManagerPanel.tsx src/components/chat/workspace-manager/ConversationManagerTable.tsx __tests__/chat/conversation-manager-panel.test.tsx
git commit -m "feat: switch conversation manager to inbox pattern"
```

### Task 7: Hubungkan data Convex yang sudah ada ke panel baru

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/hooks/useConversations.ts`
- Modify/Read: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/conversations.ts`
- Modify panel component jika perlu: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/ConversationManagerPanel.tsx`

**Step 1: Reuse query total dan paginasi**

Pastikan panel memakai:

- total count akurat
- query paginasi server-side
- mutation hapus satu
- mutation hapus banyak
- mutation hapus semua

**Step 2: Pastikan sinkronisasi ke sidebar**

Pastikan panel tidak membuat cache lokal yang memisahkan daftar dari source of truth Convex.

**Step 3: Pastikan redirect aman**

Jika percakapan aktif terhapus dari panel, redirect ke `/chat`.

**Step 4: Run targeted tests**

Run:

```bash
npx vitest run __tests__/chat/conversation-manager-panel.test.tsx __tests__/chat/sidebar-history-count.test.tsx
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/useConversations.ts convex/conversations.ts src/components/chat/workspace-panel/ConversationManagerPanel.tsx __tests__/chat/sidebar-history-count.test.tsx
git commit -m "feat: wire conversation manager panel to convex data"
```

### Task 8: Tulis dan implement test gaya visual dan kontrak token chat

**Files:**
- Modify/Create Test: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/__tests__/chat/workspace-panel-style-contract.test.ts`
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/ConversationManagerPanel.tsx`
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-panel/WorkspacePanelShell.tsx`

**Step 1: Tulis test kontrak styling**

Cases:

- memakai token chat
- tidak memakai amber
- tidak membawa shell halaman penuh
- close `x` hadir eksplisit

**Step 2: Sesuaikan kelas visual**

Pastikan bahasa visual panel tetap chat-native dan serasa artifact, bukan dashboard penuh.

**Step 3: Tambahkan verifikasi kontrak layout**

Cases:

- panel tidak membuka halaman penuh
- panel tidak menjadi drawer independen di luar slot kanan chat
- kelas visual tidak mematahkan resize behavior panel kanan

**Step 4: Run test**

Run:

```bash
npx vitest run __tests__/chat/workspace-panel-style-contract.test.ts
```

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/workspace-panel/ConversationManagerPanel.tsx src/components/chat/workspace-panel/WorkspacePanelShell.tsx __tests__/chat/workspace-panel-style-contract.test.ts
git commit -m "test: lock workspace panel chat styling contract"
```

### Task 9: Turunkan route penuh menjadi fallback internal

**Files:**
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/chat/workspace-manager/page.tsx`
- Modify: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/workspace-manager/WorkspaceManagerShell.tsx`
- Search references in: `/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src`

**Step 1: Cabut route penuh dari alur utama**

- semua entry UI utama harus membuka panel kanan
- route lama tidak lagi menjadi jalur utama dari header `Riwayat`

**Step 2: Putuskan fallback minimal**

Fallback terbaik:

- route tetap ada sementara untuk keamanan migrasi
- tampilkan versi minimal atau redirect yang aman

**Step 3: Run regression test**

Run:

```bash
npx vitest run __tests__/chat/chat-layout-workspace-panel.test.tsx __tests__/chat/conversation-manager-panel.test.tsx
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/app/chat/workspace-manager/page.tsx src/components/chat/workspace-manager/WorkspaceManagerShell.tsx
git commit -m "refactor: retire workspace manager full-page entry"
```

### Task 10: Jalankan verifikasi akhir

**Files:**
- Verify all touched files from previous tasks

**Step 1: Run targeted test suite**

```bash
npx vitest run __tests__/chat/chat-layout-workspace-panel.test.tsx __tests__/chat/conversation-manager-panel.test.tsx __tests__/chat/sidebar-history-count.test.tsx __tests__/chat/workspace-panel-style-contract.test.ts
```

Expected: PASS

**Step 2: Run lint untuk area yang diubah**

```bash
npx eslint src/components/chat/layout/ChatLayout.tsx src/components/chat/ChatSidebar.tsx src/components/chat/workspace-panel/*.tsx src/app/chat/workspace-manager/page.tsx
```

Expected: PASS

**Step 3: Run typecheck**

```bash
npm run typecheck
```

Expected: PASS

**Step 4: Manual runtime verification**

Checklist:

- buka chat
- buka artifact
- buka `Kelola Percakapan`
- close `x`
- pastikan artifact kembali
- gunakan `select all`
- kurangi selection satu item
- pastikan toolbar bulk delete tetap sesuai
- uji hapus satu, hapus pilihan, dan hapus semua di data uji aman

**Step 5: Commit**

```bash
git add .
git commit -m "feat: move conversation manager into chat workspace panel"
```
