# Implementation Checklist

Dokumen ini hanya untuk `P0-P2`, yaitu gap correctness dan contract parity yang sudah diverifikasi di codebase.

## Scope

- `P0` — `A1` Reasoning persistence parity
- `P1` — `A2` Forward finish chunk / preserve finish semantics
- `P2` — `A3` Minimal compose failover di websearch orchestrator

## P0 — A1 Reasoning Persistence Parity

### Goal

Reasoning websearch harus punya perilaku yang setara dengan non-websearch path:

- live reasoning tetap tampil saat streaming
- reasoning trace tetap tersedia setelah reload/history rehydrate

### Files

- [src/lib/ai/web-search/orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts)
- [src/app/api/chat/route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/api/chat/route.ts)
- [src/lib/ai/curated-trace.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/curated-trace.ts)
- [src/components/chat/ChatWindow.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/ChatWindow.tsx)
- [convex/messages.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/messages.ts)

### Checklist

- [ ] Tentukan bentuk persistence yang dipakai: reuse `PersistedCuratedTraceSnapshot` agar parity dengan non-websearch tetap tinggi.
- [ ] Tambahkan trace controller atau snapshot builder di websearch compose path (reference pattern: `createReasoningAccumulator` di non-websearch path route.ts dan `createCuratedTraceController` + `getPersistedSnapshot()` di curated-trace.ts).
- [ ] Akumulasi reasoning delta websearch ke snapshot persisted, bukan cuma `data-reasoning-thought` live.
- [ ] Pastikan `route.ts` tidak lagi mengirim `undefined` untuk argumen `reasoningTrace` saat save assistant message websearch.
- [ ] Pastikan reasoning trace persisted tetap optional saat reasoning dimatikan.
- [ ] Pastikan shape persisted tetap kompatibel dengan validator di [convex/messages.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/convex/messages.ts).

### Acceptance Criteria

- [ ] Message hasil websearch yang barusan selesai masih menampilkan reasoning di UI.
- [ ] Setelah page reload, message websearch yang sama masih menampilkan reasoning trace dari history.
- [ ] Non-websearch path tidak berubah perilakunya.
- [ ] Tidak ada error validator saat `messages.createMessage`.

### Verification

- [ ] Jalankan test yang relevan untuk rendering reasoning dan message history.
- [ ] Tambahkan atau update test untuk kasus: websearch message dengan persisted reasoning.
- [ ] Verifikasi manual: lakukan satu request websearch, refresh halaman, cek reasoning tetap ada.

## P1 — A2 Forward Finish Chunk / Preserve Finish Semantics

### Goal

Websearch compose harus menjaga semantik finish AI SDK seperti non-websearch path.

### Files

- [src/lib/ai/web-search/orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts)

### Checklist

- [ ] Ubah finish handler websearch agar chunk `finish` tidak di-swallow.
- [ ] Pastikan finalization internal tetap berjalan sebelum chunk `finish` diteruskan.
- [ ] Pastikan `finishReason` dari SDK tidak hilang.
- [ ] Pastikan tidak terjadi double-finish atau urutan event yang rusak.

### Acceptance Criteria

- [ ] Websearch path tetap selesai normal di client.
- [ ] `finishReason` tersedia untuk consumer internal SDK jika dibutuhkan.
- [ ] Tidak ada regression pada `data-search`, `data-cited-text`, `data-cited-sources`, dan choice spec capture.

### Verification

- [ ] Tambahkan atau update test untuk memastikan websearch stream tetap emit finish semantics.
- [ ] Verifikasi manual: request websearch selesai tanpa error dan status chat kembali `ready`.

## P2 — A3 Minimal Compose Failover di Websearch Orchestrator

### Goal

Tutup gap failover untuk compose websearch tanpa redesign arsitektur besar.

### Non-Goal

- Bukan full recovery untuk semua mid-stream failure.
- Bukan redesign generic helper atau abstraksi baru kecuali benar-benar dibutuhkan.

### Files

- [src/lib/ai/web-search/orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts)
- [src/app/api/chat/route.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/app/api/chat/route.ts)
- [src/lib/ai/streaming.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/streaming.ts)

### Checklist

- [ ] Tentukan sumber fallback model untuk compose websearch: ambil dari config provider yang sudah ada, bukan hardcode baru.
- [ ] Tambahkan minimal retry/failover untuk failure sebelum first meaningful compose output.
- [ ] Pastikan telemetry membedakan primary compose success vs fallback compose success.
- [ ] Pastikan persistence model name tidak misleading saat compose dijalankan oleh fallback.
- [ ] Pastikan behavior failure yang sudah di-handle retriever chain tidak tercampur dengan compose failover.

### Acceptance Criteria

- [ ] Jika compose primary gagal sebelum stream menghasilkan output yang berarti, orchestrator bisa mencoba fallback model.
- [ ] Jika fallback juga gagal, response tetap fail gracefully tanpa corrupt state.
- [ ] Search result persistence, citations, dan usage accounting tetap konsisten.
- [ ] Non-websearch failover path tidak berubah.

### Verification

- [ ] Tambahkan test atau injectable failure hook untuk mensimulasikan compose primary failure.
- [ ] Verifikasi manual dengan forced failure pada compose primary jika ada hook/mock yang memungkinkan.
- [ ] Pastikan telemetry dan message metadata mencerminkan model yang benar-benar dipakai.

## Cut Line

Item berikut tidak termasuk implementation checklist ini:

- evaluator-optimizer
- streaming object UX
- parallel retriever
- migrasi ke native AI SDK approval primitives

Kalau pekerjaan sudah mulai masuk ke area di atas, stop dan pindahkan ke exploration checklist.
