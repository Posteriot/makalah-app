# Paper Artifact Routing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Membangun artifact routing yang origin-aware untuk subsistem paper, sehingga artifact dari sidebar sesi aktif dan `Sesi Paper Lainnya` punya jalur balik yang benar, dan `Lihat percakapan terkait` bisa kembali secara deterministik ke pemantik artifact di chat window.

**Architecture:** Solusi ini mempertahankan tiga surface UI yang sudah ada, yaitu sidebar sesi aktif, workspace panel `Sesi Paper Lainnya`, dan artifact panel. Perubahan utama ada pada penambahan metadata origin pada tab artifact, state restore untuk panel sesi paper, rail navigasi kontekstual di artifact panel, serta deep-link routing yang membawa context source sampai ke pemantik artifact di chat window.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Convex, Vitest, ESLint, iconoir-react.

---

### Task 1: Definisikan model origin artifact paper

**Files:**
- Modify: `src/lib/hooks/useArtifactTabs.ts`
- Test: `src/lib/hooks/useArtifactTabs.test.ts` (create if belum ada)

**Step 1: Write the failing test**

Tambahkan test yang memastikan tab artifact dapat menyimpan metadata origin paper:

```ts
expect(openedTab.paperOrigin).toEqual({
  mode: "paper-session-manager-folder",
  sessionId: "session-1",
  sessionTitle: "AI & Personalisasi Pembelajaran Pendidikan Tinggi",
})
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/hooks/useArtifactTabs.test.ts`
Expected: FAIL karena type dan state `paperOrigin` belum ada.

**Step 3: Write minimal implementation**

Tambahkan field baru pada `ArtifactTab`:

- `origin: "chat" | "paper-active-session" | "paper-session-manager-root" | "paper-session-manager-folder"`
- `originSessionId?: Id<"paperSessions">`
- `originSessionTitle?: string`
- `sourceConversationId?: Id<"conversations">`
- `sourceMessageId?: Id<"messages">`
- `sourceKind?: "artifact" | "refrasa"`

Pastikan `openTab` menyimpan semua field baru ini tanpa menghapus perilaku tab reuse refrasa yang sudah ada.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/hooks/useArtifactTabs.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/lib/hooks/useArtifactTabs.ts src/lib/hooks/useArtifactTabs.test.ts
git commit -m "feat: add paper artifact origin metadata"
```

---

### Task 2: Bawa origin dari sidebar sesi aktif dan workspace panel sesi lainnya

**Files:**
- Modify: `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- Modify: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`
- Modify: `src/components/chat/ChatContainer.tsx`
- Test: `src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx`
- Test: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`

**Step 1: Write the failing tests**

Tambahkan dua test:

1. klik artifact dari sidebar sesi aktif mengirim origin `paper-active-session`
2. klik artifact dari `Sesi Paper Lainnya` mengirim origin:
   - `paper-session-manager-root` bila dari root list
   - `paper-session-manager-folder` bila dari folder detail

Contoh assertion:

```ts
expect(onArtifactSelect).toHaveBeenCalledWith("artifact-1", {
  readOnly: true,
  sourceConversationId: "conversation-other",
  origin: "paper-session-manager-folder",
  originSessionId: "session-other",
  originSessionTitle: "Draft lain",
  sourceKind: "artifact",
})
```

**Step 2: Run tests to verify they fail**

Run:
- `npx vitest run src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx`
- `npx vitest run src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`

Expected: FAIL karena payload origin belum dikirim.

**Step 3: Write minimal implementation**

- Perluas type `onArtifactSelect` di `ChatContainer`
- Saat artifact dibuka dari sidebar aktif, kirim:
  - `origin: "paper-active-session"`
  - `originSessionId`
  - `originSessionTitle`
- Saat artifact dibuka dari panel sesi lainnya, kirim:
  - `origin: "paper-session-manager-folder"`
  - `originSessionId`
  - `originSessionTitle`
- Saat nanti dibutuhkan aksi balik ke root list, state panel tetap harus tahu root `Sesi Paper Lainnya`

Catatan: sidebar aktif tidak boleh pernah mengarah balik ke root `Sesi Paper Lainnya`.

**Step 4: Run tests to verify they pass**

Run:
- `npx vitest run src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx`
- `npx vitest run src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`

Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/sidebar/SidebarPaperSessions.tsx src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx src/components/chat/ChatContainer.tsx src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx
git commit -m "feat: send paper artifact origin from sidebar and workspace panel"
```

---

### Task 3: Simpan dan pulihkan state panel `Sesi Paper Lainnya`

**Files:**
- Modify: `src/components/chat/layout/ChatLayout.tsx`
- Modify: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`
- Test: `src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`

**Step 1: Write the failing test**

Tambahkan test yang membuktikan:

1. user membuka folder di `Sesi Paper Lainnya`
2. user klik artifact
3. user klik rail balik ke folder
4. panel `Sesi Paper Lainnya` pulih di folder yang sama

Tambahkan juga test untuk balik ke root `Semua sesi`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`
Expected: FAIL karena `ChatLayout` belum menyimpan state return paper panel.

**Step 3: Write minimal implementation**

Di `ChatLayout`, tambahkan state restore paper panel:

- `paperPanelView: "root" | "session-folder"`
- `paperPanelSessionId?: Id<"paperSessions">`
- `paperPanelSessionTitle?: string`

Saat artifact dari panel sesi lainnya dibuka:

- simpan snapshot state panel sesi paper
- tutup workspace panel
- buka artifact panel

Saat rail balik ditekan dari artifact panel:

- tutup artifact panel
- buka kembali workspace panel `paper-sessions-manager`
- pulihkan `paperPanelView` yang sesuai

Di `PaperSessionsManagerPanel`, terima props baru:

- `initialView`
- `initialSessionId`
- `initialSessionTitle`
- callback untuk update selection ke parent layout bila user berpindah folder

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/layout/ChatLayout.workspace-panel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/layout/ChatLayout.tsx src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx src/components/chat/layout/ChatLayout.workspace-panel.test.tsx
git commit -m "feat: restore paper sessions panel state from artifact panel"
```

---

### Task 4: Tambahkan rail navigasi kontekstual di artifact panel

**Files:**
- Create: `src/components/chat/ArtifactOriginRail.tsx`
- Modify: `src/components/chat/ArtifactPanel.tsx`
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`
- Test: `src/components/chat/ArtifactPanel.test.tsx`

**Step 1: Write the failing tests**

Tambahkan test untuk tiga kasus:

1. origin `chat` tidak merender rail paper
2. origin `paper-active-session` merender rail ke sesi aktif
3. origin `paper-session-manager-folder` merender dua node:
   - `Sesi Paper Lainnya`
   - `[Nama Folder]`

Contoh assertion:

```ts
expect(screen.getByRole("button", { name: /Sesi Paper Lainnya/i })).toBeInTheDocument()
expect(screen.getByRole("button", { name: /AI & Personalisasi Pembelajaran Pendidikan Tinggi/i })).toBeInTheDocument()
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/chat/ArtifactPanel.test.tsx`
Expected: FAIL karena rail belum ada.

**Step 3: Write minimal implementation**

Buat `ArtifactOriginRail.tsx` yang menerima:

- `origin`
- `originSessionTitle`
- callback:
  - `onReturnToPaperRoot`
  - `onReturnToPaperSession`
  - `onReturnToActivePaperSession`

Tempatkan rail di atas readonly artifact, sebelum metadata readonly.

Aturan render:

- `chat`: render null
- `paper-active-session`: render `Sesi Paper / [Nama Sesi Aktif]`
- `paper-session-manager-root`: render `Sesi Paper Lainnya`
- `paper-session-manager-folder`: render `Sesi Paper Lainnya / [Nama Folder]`

Pakai target klik minimal 44x44px dan `aria-label` jelas.

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/chat/ArtifactPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactOriginRail.tsx src/components/chat/ArtifactPanel.tsx src/components/chat/FullsizeArtifactModal.tsx src/components/chat/ArtifactPanel.test.tsx
git commit -m "feat: add origin-aware paper navigation rail"
```

---

### Task 5: Deterministic routing ke pemantik artifact di chat window

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`
- Modify: `src/components/chat/ChatContainer.tsx`
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/MessageBubble.tsx`
- Test: `src/components/chat/ChatWindow.artifact-source-focus.test.tsx` (create)

**Step 1: Write the failing test**

Tambahkan test yang membuktikan:

1. klik `Lihat percakapan terkait` membentuk route dengan context source yang cukup
2. saat route dibuka, `ChatWindow`:
   - membuka artifact panel terkait
   - scroll ke message bubble pemantik
   - memberi highlight singkat

Contoh target URL:

```ts
/chat/conversation-1?artifact=artifact-1&sourceMessage=message-9
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/ChatWindow.artifact-source-focus.test.tsx`
Expected: FAIL karena source focus belum ada.

**Step 3: Write minimal implementation**

- Perluas link di `ArtifactViewer` dan `FullsizeArtifactModal` supaya menyertakan:
  - `artifact`
  - `sourceMessage`
  - `sourceKind` bila perlu
- Di `ChatContainer` atau `ChatWindow`, parse search params baru
- Saat param ada:
  - buka tab artifact yang sesuai
  - cari message bubble pemantik
  - scroll ke message itu
  - tambahkan class highlight sementara

Tambahkan anchor/selector stabil di `MessageBubble`, misalnya:

```tsx
data-message-id={message._id}
data-artifact-trigger-id={artifactId}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ChatWindow.artifact-source-focus.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx src/components/chat/FullsizeArtifactModal.tsx src/components/chat/ChatContainer.tsx src/components/chat/ChatWindow.tsx src/components/chat/MessageBubble.tsx src/components/chat/ChatWindow.artifact-source-focus.test.tsx
git commit -m "feat: route paper artifacts back to source trigger"
```

---

### Task 6: Harden orphan behavior for parent artifact and refrasa

**Files:**
- Modify: `src/components/chat/ArtifactViewer.tsx`
- Modify: `src/components/chat/FullsizeArtifactModal.tsx`
- Test: `src/components/chat/ArtifactViewer.test.tsx` (create if needed)

**Step 1: Write the failing test**

Tambahkan test yang memastikan:

1. parent artifact orphan menampilkan `Percakapan tidak ditemukan`
2. refrasa orphan menampilkan `Percakapan tidak ditemukan`
3. tidak ada link aktif `Lihat percakapan terkait`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/ArtifactViewer.test.tsx`
Expected: FAIL bila cabang orphan belum cover parent dan refrasa secara konsisten.

**Step 3: Write minimal implementation**

Pastikan logika readonly source conversation:

- hanya render link bila `sourceConversation` ada
- render text pasif bila `sourceConversationId` ada tetapi query `null`
- perlakuan ini identik untuk parent artifact dan refrasa

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ArtifactViewer.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/ArtifactViewer.tsx src/components/chat/FullsizeArtifactModal.tsx src/components/chat/ArtifactViewer.test.tsx
git commit -m "test: verify orphan source state for paper artifacts and refrasa"
```

---

### Task 7: Rename workspace panel header menjadi `Sesi Paper Lainnya`

**Files:**
- Modify: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx`
- Test: `src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`

**Step 1: Write the failing test**

Tambahkan test bahwa title shell panel adalah `Sesi Paper Lainnya`.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`
Expected: FAIL

**Step 3: Write minimal implementation**

Ubah title `WorkspacePanelShell` dari `Sesi Paper` menjadi `Sesi Paper Lainnya`.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx`
Expected: PASS

**Step 5: Commit**

```bash
git add src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx
git commit -m "copy: rename paper sessions workspace panel"
```

---

### Task 8: Full verification and desktop browser audit

**Files:**
- Verify only: no new files required unless audit finds regressions

**Step 1: Run targeted automated tests**

Run:

```bash
npx vitest run \
  src/lib/hooks/useArtifactTabs.test.ts \
  src/components/chat/sidebar/SidebarPaperSessions.desktop.test.tsx \
  src/components/chat/workspace-panel/PaperSessionsManagerPanel.test.tsx \
  src/components/chat/layout/ChatLayout.workspace-panel.test.tsx \
  src/components/chat/ArtifactPanel.test.tsx \
  src/components/chat/ArtifactViewer.test.tsx \
  src/components/chat/ChatWindow.artifact-source-focus.test.tsx \
  convex/conversationAttachmentContexts.test.ts
```

Expected: semua PASS

**Step 2: Run lint for changed files**

Run:

```bash
npx eslint \
  src/lib/hooks/useArtifactTabs.ts \
  src/components/chat/sidebar/SidebarPaperSessions.tsx \
  src/components/chat/workspace-panel/PaperSessionsManagerPanel.tsx \
  src/components/chat/layout/ChatLayout.tsx \
  src/components/chat/ArtifactOriginRail.tsx \
  src/components/chat/ArtifactPanel.tsx \
  src/components/chat/ArtifactViewer.tsx \
  src/components/chat/FullsizeArtifactModal.tsx \
  src/components/chat/ChatContainer.tsx \
  src/components/chat/ChatWindow.tsx \
  src/components/chat/MessageBubble.tsx
```

Expected: no output

**Step 3: Browser audit**

Audit desktop flow ini:

1. buka sidebar sesi aktif
2. buka `Sesi Paper Lainnya`
3. buka folder nonaktif
4. buka parent artifact
5. verifikasi rail:
   - `Sesi Paper Lainnya`
   - `[Nama Folder]`
6. kembali ke folder
7. kembali ke root
8. buka orphan artifact
9. verifikasi `Percakapan tidak ditemukan`
10. buka artifact yang masih punya conversation source
11. klik `Lihat percakapan terkait`
12. verifikasi:
    - sesi menjadi aktif
    - panel artifact tujuan terbuka
    - bubble pemantik di-highlight

**Step 4: Commit**

```bash
git add <all changed files>
git commit -m "feat: complete paper artifact routing workflow"
```

