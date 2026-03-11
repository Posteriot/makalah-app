# Paper Sessions Workspace Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memindahkan daftar sesi paper nonaktif dari sidebar desktop ke workspace panel kanan mandiri tanpa mengubah semantics data sesi paper yang sudah ada.

**Architecture:** `ChatLayout` tetap menjadi orkestrator tunggal panel kanan desktop dengan mode baru `paper-sessions-manager`. Sidebar paper direfaktor agar hanya mengurus sesi aktif, sementara panel baru `PaperSessionsManagerPanel` menampilkan daftar sesi nonaktif dengan shell yang sama seperti workspace panel lain dan mengikuti pola restore artifact yang sudah ada.

**Tech Stack:** Next.js 16, React 19, TypeScript, Convex, Vitest, Testing Library, shadcn/ui shell primitives.

---

### Task 1: Bekukan perilaku desktop yang harus dipertahankan lewat test

**Files:**
- Create: `src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx`
- Create: `src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`
- Reference: `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Reference: `src/components/chat/layout/ChatLayout.tsx`

**Step 1: Tulis failing test untuk sidebar paper desktop**

Tambahkan test yang memverifikasi:

- sidebar `Sesi Paper` merender trigger settings di header desktop
- `Sesi Lainnya` tidak lagi muncul di sidebar setelah refactor
- sesi aktif tetap dirender ketika `usePaperSession` mengembalikan session aktif

Mock minimum yang dibutuhkan:

- `useCurrentUser`
- `usePaperSession`
- `useQuery` untuk conversation dan daftar sesi

**Step 2: Jalankan test sidebar untuk memastikan gagal**

Run:

```bash
npx vitest run src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx
```

Expected:

- FAIL karena trigger settings belum ada
- FAIL karena `Sesi Lainnya` masih dirender di sidebar

**Step 3: Tulis failing test untuk orkestrasi panel kanan**

Tambahkan test yang memverifikasi:

- `ChatLayout` bisa membuka mode `paper-sessions-manager`
- saat mode itu aktif, artifact panel disembunyikan sementara
- saat panel ditutup, state artifact dipulihkan lewat alur yang sama seperti panel workspace lain

Gunakan mock untuk:

- `ChatSidebar`
- `ConversationManagerPanel`
- panel artifact placeholder
- `useConversations`

**Step 4: Jalankan test layout untuk memastikan gagal**

Run:

```bash
npx vitest run src/components/chat/layout/ChatLayout.workspace-panel.test.tsx
```

Expected:

- FAIL karena mode `paper-sessions-manager` belum ada

### Task 2: Tambah mode panel kanan baru di `ChatLayout`

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Modify: `src/components/chat/ChatSidebar.tsx`
- Create: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`
- Reference: `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`

**Step 1: Perluas union `workspacePanelMode`**

Ubah union menjadi:

```ts
type WorkspacePanelMode = "conversation-manager" | "paper-sessions-manager" | null
```

Lalu turunkan helper boolean yang eksplisit:

- `isConversationManagerOpen`
- `isPaperSessionsManagerOpen`

dan pastikan `activeRightPanelMode` mengenali mode baru itu sebelum fallback ke artifact.

**Step 2: Tambahkan callback pembuka dan penutup panel sesi paper**

Di `ChatLayout`, buat callback:

- `handleOpenPaperSessionsManager`
- `handleClosePaperSessionsManager`

Keduanya harus:

- memakai `preservedArtifactRef` seperti `conversation-manager`
- tidak membuat state panel baru di luar orkestrasi utama

**Step 3: Teruskan callback ke `ChatSidebar`**

Tambahkan prop baru pada `ChatSidebar`:

- `onOpenPaperSessionsManager?: () => void`

Prop ini hanya dipakai oleh tampilan sidebar paper desktop.

**Step 4: Render panel baru di slot kanan desktop**

Tambahkan cabang render:

- jika `activeRightPanelMode === "paper-sessions-manager"`, tampilkan `PaperSessionsManagerPanel`

Pastikan panel `conversation-manager` dan artifact tetap bekerja seperti sebelumnya.

**Step 5: Pertahankan mobile tetap out of scope**

Jangan tambah sheet mobile baru untuk panel sesi paper. Pastikan perubahan hanya menyentuh render desktop.

### Task 3: Refactor `SidebarPaperSessions` agar fokus ke sesi aktif

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Reference: `src/lib/hooks/usePaperSession.ts`
- Reference: `convex/paperSessions.ts`

**Step 1: Tambahkan header action settings**

Pada header `Sesi Paper`, tambahkan tombol settings desktop yang:

- jelas terlihat sebagai affordance pembuka panel
- memanggil `onOpenPaperSessionsManager`
- tidak mengubah perilaku expand/collapse folder aktif

Tambahkan prop baru pada komponen:

- `onOpenPaperSessionsManager?: () => void`

**Step 2: Hapus responsibility `Sesi Lainnya` dari sidebar**

Refactor komponen agar tidak lagi:

- membangun `otherSessions` untuk kebutuhan render sidebar
- memiliki `renderOtherSessions()`
- merender daftar sesi nonaktif pada branch apa pun

Cabang yang wajib dibersihkan:

- tanpa `currentConversationId`
- tanpa paper session aktif
- dengan paper session aktif

**Step 3: Pertahankan perilaku sesi aktif**

Jangan ubah:

- query sesi aktif via `usePaperSession(currentConversationId)`
- auto-expand sinkronisasi `expandedFolderId` dan `lastSyncedSessionId`
- perilaku pemilihan artifact dalam sesi aktif
- working title editing

**Step 4: Update wiring dari `ChatSidebar`**

Saat `activePanel === "paper"`, `ChatSidebar` harus meneruskan callback pembuka panel sesi paper ke `SidebarPaperSessions`.

### Task 4: Bangun `PaperSessionsManagerPanel` sebagai navigator sesi nonaktif

**Files:**
- Create: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`
- Optional Create: `src/components/chat/workspace-panel/PaperSessionsManagerList.tsx`
- Reference: `src/components/chat/workspace-panel/WorkspacePanelShell.tsx`
- Reference: `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Reference: `src/lib/paper/title-resolver.ts`
- Reference: `convex/paperSessions.ts`

**Step 1: Tentukan kontrak props panel**

Props minimum:

```ts
interface PaperSessionsManagerPanelProps {
  currentConversationId?: string | null
  onClose: () => void
}
```

Panel bertanggung jawab menghitung sesi nonaktif relatif terhadap percakapan sekarang.

**Step 2: Ambil data sesi user dan sesi aktif**

Di panel baru:

- ambil `user` lewat `useCurrentUser`
- ambil semua sesi paper user lewat query yang sama seperti perilaku saat ini
- ambil sesi aktif percakapan sekarang lewat `usePaperSession`
- filter daftar menjadi sesi selain sesi aktif

Jangan tambahkan filter produk baru di luar kebutuhan ini.

**Step 3: Render dengan `WorkspacePanelShell`**

Gunakan judul panel yang eksplisit, misalnya:

- `Sesi Paper`

Isi panel minimal memuat:

- state loading
- state kosong untuk tidak ada sesi nonaktif
- daftar item sesi nonaktif

**Step 4: Render item daftar sebagai navigator**

Setiap item minimal menampilkan:

- judul sesi hasil resolver yang sama
- metadata stage
- jumlah artifak
- affordance klik untuk pindah ke `conversationId` milik sesi

Gunakan `router.push(`/chat/${conversationId}`)` saat item dipilih.

Jangan tambahkan:

- delete
- bulk actions
- search
- filter kompleks

**Step 5: Tentukan strategi jumlah artifak yang paling sederhana**

Rekomendasi implementasi:

- gunakan query per row yang sama seperti sidebar saat ini untuk menghitung artifak, selama tetap terbaca dan tidak menambah fitur baru

Kalau implementasi itu terasa terlalu berat setelah dicoba, hentikan dan evaluasi alternatif read model kecil. Jangan menambah kompleksitas prematur di luar kebutuhan batch ini.

### Task 5: Lengkapi wiring restore artifact dan regresi panel kanan

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Test: `src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`

**Step 1: Pastikan preserve artifact dipakai juga untuk panel sesi paper**

Saat `handleOpenPaperSessionsManager` dipanggil:

- simpan `wasOpen`
- simpan `artifactId`

ke `preservedArtifactRef` sebelum mengganti mode panel.

**Step 2: Pastikan close panel mengembalikan artifact**

Saat panel sesi paper ditutup:

- mode panel kembali `null`
- artifact aktif yang sebelumnya ada bisa muncul kembali lewat alur toggle/preserve yang sama

**Step 3: Pastikan perubahan artifact aktif membatalkan preserve yang stale**

Ikuti pola proteksi yang sudah ada untuk `conversation-manager` agar state restore tidak salah ketika artifact aktif berubah selama panel workspace terbuka.

### Task 6: Jalankan verifikasi test dan audit manual desktop

**Files:**
- Test: `src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx`
- Test: `src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`
- Reference: `docs/chat-page-ux-design-enforcement/workspace-panel/sesi-paper/2026-03-11-paper-sessions-workspace-panel-design-desktop-v1.md`

**Step 1: Jalankan test target**

Run:

```bash
npx vitest run src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx src/components/chat/layout/ChatLayout.workspace-panel.test.tsx
```

Expected:

- PASS

**Step 2: Jalankan lint untuk file yang diubah**

Run:

```bash
npm run lint -- --file src/components/chat/layout/ChatLayout.tsx --file src/components/chat/ChatSidebar.tsx --file src/components/chat/sidebar/SidebarPaperSessions.tsx --file src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx
```

Expected:

- PASS tanpa error baru

**Step 3: Audit manual desktop**

Verifikasi manual di browser desktop:

- sidebar `Sesi Paper` punya tombol settings
- `Sesi Lainnya` tidak lagi muncul di sidebar
- klik settings membuka panel kanan sesi paper
- panel sesi paper bukan `Kelola Percakapan`
- klik close menutup panel sesi paper
- jika artifact sebelumnya aktif, artifact pulih setelah panel ditutup

**Step 4: Cocokkan hasil dengan design doc**

Bandingkan hasil implementasi dengan:

- panel desktop only
- fokus sesi nonaktif di panel kanan
- sidebar fokus sesi aktif
- tanpa fitur tambahan di luar scope

Kalau ada penyimpangan, perbaiki sebelum menyatakan selesai.
