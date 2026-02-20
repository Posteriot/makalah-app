# Chat Optimization Playbook

Dokumen ini adalah playbook optimasi halaman chat yang fokus pada bottleneck paling berdampak, target metrik terukur, dan urutan eksekusi prioritas untuk menjaga kecepatan, stabilitas, dan efisiensi biaya.

## 1. Scope

- Halaman: `/chat` dan `/chat/[conversationId]`.
- Layer yang dicakup:
- UI render path (message list, bubble, sidebar, artifact workspace)
- data fetch Convex (query/mutation fan-out)
- API chat pre-stream path (`POST /api/chat`)
- virtualisasi, memoization, dan payload size

## 2. Baseline Hotspot (Berbasis Kode Saat Ini)

## 2.1 Hotspot Data Fetch

- Full history fetch tanpa pagination:
- `convex/messages.ts` (`getMessages`) mengambil semua message dengan `.collect()`.
- `src/lib/hooks/useMessages.ts` subscribe penuh ke semua message conversation.
- Dampak:
- payload dan render cost naik linear seiring panjang percakapan.

- Query fan-out artifact untuk conversation yang sama:
- `src/components/chat/ChatContainer.tsx` query `artifacts.listByConversation`.
- `src/components/chat/ArtifactPanel.tsx` query yang sama.
- `src/components/chat/sidebar/SidebarPaperSessions.tsx` query yang sama (saat expand).
- `src/components/chat/FullsizeArtifactModal.tsx` query lagi (`listByConversation`) + query tambahan.
- Dampak:
- subscription/query observer bertambah, rerender meningkat saat artifacts berubah.

- Query helper berbasis collect lalu filter:
- `convex/messages.ts` (`getRecentSources`) collect semua message lalu filter assistant.
- Dampak:
- pembacaan data berlebih untuk kebutuhan “recent N sources”.

## 2.2 Hotspot UI Render

- Parsing message parts dilakukan tiap render bubble:
- `src/components/chat/MessageBubble.tsx` melakukan parse tool/search/citation secara lokal tiap render.
- Dampak:
- cost CPU tinggi pada percakapan panjang dan stream aktif.

- Sinkronisasi history ke `useChat` map penuh:
- `src/components/chat/ChatWindow.tsx` memetakan seluruh `historyMessages` ke UIMessage saat sync.
- Dampak:
- rerender dan alokasi objek besar saat history update.

- State update tab dengan dua set state beruntun:
- `src/lib/hooks/useArtifactTabs.ts` (`closeTab`) melakukan beberapa `setOpenTabs`/`setActiveTabId`.
- Dampak:
- rerender tambahan dan complexity state update.

## 2.3 Hotspot API / Streaming Latency

- Pre-stream path serial dan panjang:
- `src/app/api/chat/route.ts` melakukan banyak query/mutation sebelum `streamText`.
- Contoh: auth token retry, quota check, persist user message, file context, sources context.

- Duplikasi fetch paper session:
- `getPaperModeSystemPrompt(...)` sudah butuh session.
- route tetap fetch ulang `paperSessions.getByConversation`.
- Dampak:
- latency pre-stream bertambah.

- Context dapat membesar pada non-paper mode:
- trimming eksplisit saat ini fokus untuk paper mode.
- Dampak:
- token context dan latensi model bisa naik pada conversation panjang non-paper.

## 3. Target Metrik Optimasi

Target operasional (p75 kecuali disebut lain):

- `send -> first token`:
- non-websearch: <= 1.2 detik
- websearch: <= 2.5 detik
- `API /api/chat` pre-stream (request masuk sampai stream start):
- <= 600 ms
- Render stability:
- scroll FPS >= 55 pada 500 message
- no jank frame > 100 ms saat stream
- Data efficiency:
- initial history payload turun minimal 60% untuk conversation panjang
- query artifact aktif berkurang minimal 30% pada state panel+sidebar terbuka
- Error/cost guard:
- fallback provider rate tidak naik setelah optimasi
- tidak ada regresi pada persist message/artifact/session

## 4. Prioritas Eksekusi

## 4.1 P0 (Quick Wins, Dampak Tinggi)

1. Pagination message history (windowed loading).
Area:
- `convex/messages.ts`
- `src/lib/hooks/useMessages.ts`
- `src/components/chat/ChatWindow.tsx`
Output:
- initial load hanya ambil window terbaru, older messages load on demand.

2. Kurangi duplikasi fetch session di route chat.
Area:
- `src/app/api/chat/route.ts`
- `src/lib/ai/paper-mode-prompt.ts`
Output:
- gunakan satu source `paperSession` untuk prompt + decision logic.

3. Parallelize pre-stream fetch yang independen.
Area:
- `src/app/api/chat/route.ts`
Output:
- gabungkan fetch non-dependent dengan `Promise.all` (contoh: system prompt, provider settings, sources context jika aman).

4. Optimasi query recent sources agar tidak collect penuh.
Area:
- `convex/messages.ts`
Output:
- query yang lebih sempit untuk assistant+sumber terbaru.

## 4.2 P1 (Stabilitas Render dan Konsistensi State)

1. Memoize parsing message parts di `MessageBubble`.
Area:
- `src/components/chat/MessageBubble.tsx`
Output:
- parse tool/search/citation dipindah ke `useMemo` berbasis `message.parts`.

2. Batasi remap history penuh di `ChatWindow`.
Area:
- `src/components/chat/ChatWindow.tsx`
Output:
- diff-aware sync (append/update) untuk menghindari mapping ulang seluruh array.

3. Sederhanakan reducer tab state.
Area:
- `src/lib/hooks/useArtifactTabs.ts`
Output:
- `closeTab` jadi single state transaction, mengurangi rerender.

4. Harmonisasi query artifact untuk panel/sidebar/modal.
Area:
- `src/components/chat/ChatContainer.tsx`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
Output:
- minimalkan query fan-out, prioritaskan shared source atau conditional fetch lebih ketat.

## 4.3 P2 (Hardening dan Cost Control)

1. Terapkan context trimming adaptif juga untuk non-paper mode.
Area:
- `src/app/api/chat/route.ts`
Output:
- history trim lebih konsisten lintas mode untuk menekan latency/cost.

2. Tambah observability performa end-to-end.
Area:
- `src/components/chat/ChatWindow.tsx`
- `src/app/api/chat/route.ts`
Output:
- marker waktu untuk pre-stream, first token, finish; siap dipantau dashboard/log.

3. Audit ulang heavy fullscreen workspace queries.
Area:
- `src/components/chat/FullsizeArtifactModal.tsx`
Output:
- kurangi query yang tidak perlu saat modal hanya baca mode non-refrasa.

## 5. Strategi Implementasi Bertahap

## Phase 1 (P0)

- fokus ke latency pre-stream dan payload history.
- deliverable:
- message windowing
- dedup fetch session
- parallel prefetch penting.

## Phase 2 (P1)

- fokus ke render stability saat streaming dan artifact interaction.
- deliverable:
- memoized message parsing
- sync history incremental
- tab state reducer cleanup.

## Phase 3 (P2)

- fokus ke hardening jangka panjang (cost + observability).
- deliverable:
- adaptive trimming lintas mode
- instrumentation baseline + alarm threshold.

## 6. Guardrail Validasi (Wajib Sebelum Merge)

1. Functional parity:
- edit+truncate tetap benar.
- paper validation dan rewind tetap sesuai rule.
- artifact/refrasa tabs tetap konsisten.

2. Streaming parity:
- data part `data-search`, `data-cited-text`, `data-cited-sources` tetap tampil.
- fallback provider behavior tidak berubah.

3. Data integrity:
- message/assistant persist tetap tepat.
- invalidation artifact setelah rewind tetap muncul dan clear saat update version.

4. UX parity:
- dark/light dan desktop/mobile tidak regress.
- virtualized scroll tetap stabil.

## 7. KPI Monitoring Checklist

- capture baseline sebelum optimasi:
- p50/p75 pre-stream latency
- p50/p75 time-to-first-token
- jumlah message render per stream turn
- query count utama per route state (landing, active chat, panel open, fullscreen open)

- capture ulang setelah tiap phase:
- bandingkan terhadap target section 3.
- rollback jika ada regresi > 10% pada metrik utama atau error rate naik.

## 8. File Referensi

- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatContainer.tsx`
- `src/components/chat/ArtifactPanel.tsx`
- `src/components/chat/FullsizeArtifactModal.tsx`
- `src/components/chat/sidebar/SidebarPaperSessions.tsx`
- `src/lib/hooks/useMessages.ts`
- `src/lib/hooks/useArtifactTabs.ts`
- `convex/messages.ts`
- `convex/artifacts.ts`
- `src/app/api/chat/route.ts`
- `src/lib/ai/paper-mode-prompt.ts`
