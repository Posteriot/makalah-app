# Chat Transparent Thinking Surface Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menjadikan mode reasoning `transparent` di `/chat` hanya menampilkan satu permukaan thinking yang konsisten, tanpa timeline `Proses` yang bersaing.

**Architecture:** Gunakan `reasoningTrace.traceMode` sebagai source of truth untuk membedakan mode `transparent` vs `curated` di frontend. Pada mode `transparent`, `ChatProcessStatusBar` tetap boleh menampilkan headline/raw thought dan durasi, tapi akses ke `ReasoningActivityPanel` dan timeline steps harus dimatikan. Persistence/rehydration tetap dipertahankan untuk headline dan durasi agar perilaku live dan history konsisten.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vercel AI SDK UIMessage stream, Vitest.

---

### Task 1: Lock transparent-mode behavior with failing tests

**Files:**
- Modify: `src/components/chat/ChatWindow.mobile-workspace.test.tsx`
- Create or Modify: `src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

**Step 1: Write the failing test**

Tambahkan test yang memastikan:
- mode `transparent` tetap mengirim headline raw thought ke status bar
- mode `transparent` tidak membuka/merender `ReasoningActivityPanel`
- mode `transparent` tidak membuat CTA `Detail →`

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

Expected: FAIL karena panel/timeline masih dianggap tersedia di mode transparent.

**Step 3: Write minimal implementation**

Tambahkan deteksi `traceMode` di state reasoning frontend dan teruskan ke status bar sebagai flag eksplisit.

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

Expected: PASS

### Task 2: Suppress timeline surface for transparent reasoning

**Files:**
- Modify: `src/components/chat/ChatWindow.tsx`
- Modify: `src/components/chat/ChatProcessStatusBar.tsx`

**Step 1: Write the failing test**

Tambahkan coverage yang memastikan `ChatWindow` memetakan `reasoningTrace.traceMode` yang persisted dan tetap memberi headline tanpa mengaktifkan panel.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/chat/ChatWindow.mobile-workspace.test.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

Expected: FAIL pada ekspektasi transparan single-surface.

**Step 3: Write minimal implementation**

Perubahan minimum:
- parse `traceMode` dari data persisted/live
- expose flag `isTransparentOnly`
- di `ChatProcessStatusBar`, sembunyikan affordance panel (`openPanel`, `Detail →`, sheet render) saat flag aktif

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/chat/ChatWindow.mobile-workspace.test.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

Expected: PASS

### Task 3: Regression verification for non-transparent flows

**Files:**
- Reuse existing tests only

**Step 1: Run targeted regression suite**

Run:
- `npx vitest run src/components/chat/ChatWindow.reasoning-duration.test.tsx`
- `npx vitest run src/components/chat/MessageBubble.internal-thought.test.tsx`
- `npx vitest run src/components/chat/ChatWindow.mobile-workspace.test.tsx`
- `npx vitest run src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx`

Expected: PASS

**Step 2: Commit**

```bash
git add src/components/chat/ChatWindow.tsx src/components/chat/ChatProcessStatusBar.tsx src/components/chat/ChatWindow.mobile-workspace.test.tsx src/components/chat/ChatProcessStatusBar.transparent-mode.test.tsx docs/plans/2026-03-27-chat-transparent-thinking-surface.md
git commit -m "fix(chat): keep transparent reasoning on a single surface"
```
