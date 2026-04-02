# Findings — Post-Stabilization Runtime Test

> Findings dari runtime test setelah stabilization commit `d1cdac55`.
> Backend sudah dipersamakan dengan main. Hanya UI components yang tersisa.

---

## Finding #1: UnifiedProcessCard Task Update Delay (~5 detik)

**Severity:** Medium (UX)
**Date:** 2026-04-02
**Status:** Open
**Type:** Pre-existing timing issue, baru visible karena UnifiedProcessCard

### Observed Behavior

Setelah search selesai dan stream complete, UnifiedProcessCard menunjukkan **0/4** selama ~5 detik sebelum update ke **1/4** (Cari referensi awal ✅).

Screenshot evidence:
- `screenshots/Screen Shot 2026-04-02 at 22.08.19.png` — card masih 0/4
- `screenshots/Screen Shot 2026-04-02 at 22.06.44.png` — card sudah 1/4

### Root Cause

Urutan eksekusi saat ini:
1. Stream selesai → card muncul dengan **0/4** (stageData belum update)
2. `appendSearchReferences` jalan (detached, setelah stream close)
3. Convex mutation update `referensiAwal` di stageData
4. Convex subscription propagate ke client → card re-render **1/4**

Gap antara step 1 dan 4 = ~5 detik. Card menampilkan stale state yang user lihat berubah sendiri.

### Kenapa Baru Terlihat Sekarang

Sebelum ada UnifiedProcessCard, delay ini invisible — gak ada visual indicator yang nunjukin task completion state. Sekarang card 0/4 → 1/4 bikin delay ini observable.

### Impact

- User melihat card "0/4" padahal referensi sudah ditemukan (19 refs)
- Memberi kesan system lambat atau belum selesai
- Card berubah sendiri tanpa user action — bisa membingungkan

### Possible Fix Directions

- **Option A:** Pindahkan `appendSearchReferences` dari detached ke sebelum stream close, sehingga stageData sudah update saat card pertama kali render.
- **Option B:** Optimistic UI — card detect search completion dari stream data parts dan show "Cari referensi awal ✅" sebelum Convex subscription confirm.
- **Option C:** Delay card render sampai post-stream mutations selesai (via `waitUntil` atau flag).

### Files Involved

- `src/app/api/chat/route.ts` — `appendSearchReferences` detached call timing
- `src/components/chat/MessageBubble.tsx` — UnifiedProcessCard task derivation
- `src/lib/paper/task-derivation.ts` — `isFieldComplete` for referensiAwal

---

## Finding #2: Task Ordering Mismatch — Referensi Terisi Sebelum Eksplorasi Ide

**Severity:** Medium (UX + pedagogical flow)
**Date:** 2026-04-02
**Status:** Open
**Type:** Design issue di task-derivation ordering vs actual model+search behavior

### Observed Behavior

Card menunjukkan "Gagasan Paper 1/4" dengan "Cari referensi awal ✅" tapi "Eksplorasi ide ○" masih pending. Di sidebar progress timeline juga terlihat: "Cari referensi awal" punya dot biru (complete) sementara "Eksplorasi ide" masih kosong.

Screenshot evidence:
- `screenshots/Screen Shot 2026-04-02 at 22.12.25.png` — card 1/4, referensi ✅ tapi ide ○
- `screenshots/Screen Shot 2026-04-02 at 22.12.38.png` — sidebar sama: referensi complete, ide pending

### Root Cause

Dua hal berbenturan:

**1. Task ordering di `task-derivation.ts`:**
```
gagasan: [
  { field: "ideKasar", label: "Eksplorasi ide" },        // ← harusnya pertama
  { field: "referensiAwal", label: "Cari referensi awal" }, // ← tapi ini yang terisi duluan
  { field: "analisis", label: "Analisis feasibility" },
  { field: "angle", label: "Tentukan angle" },
]
```

**2. Search policy auto-trigger:**
Search router detect "research topic" intent → langsung search → `appendSearchReferences` auto-persist 19 refs ke `referensiAwal`. Ini terjadi sebelum model sempat "eksplorasi ide" (menulis `ideKasar`).

Hasilnya: task #2 selesai sebelum task #1, bikin card terlihat loncat.

### Impact

- **UX mismatch** — user expect langkah 1 selesai sebelum langkah 2, tapi yang terjadi sebaliknya
- **Pedagogical confusion** — paper writing flow seharusnya: explore idea → find references to support → analyze feasibility → determine angle. Card menunjukkan flow yang terbalik.
- **Trust issue** — task list yang loncat bikin user ragu apakah system berjalan benar

### Possible Fix Directions

- **Option A: Ubah task ordering** — pindahkan `referensiAwal` ke posisi pertama di `STAGE_TASKS.gagasan` karena memang itulah yang terjadi (search auto-trigger). Pro: card match reality. Con: secara pedagogis, eksplorasi ide seharusnya duluan.
- **Option B: Jangan count `referensiAwal` sebagai task** — treat sebagai auto-populated background field, bukan user-facing task. Hapus dari `STAGE_TASKS.gagasan`. Pro: card hanya show tasks yang butuh model reasoning. Con: user gak lihat progress referensi.
- **Option C: Delay search ke turn berikutnya** — turn pertama: model explore idea + tulis `ideKasar` dulu. Turn kedua: baru search. Pro: flow match task ordering. Con: butuh perubahan di search policy/router.

### Files Involved

- `src/lib/paper/task-derivation.ts` — `STAGE_TASKS.gagasan` ordering
- `src/app/api/chat/route.ts` — search router auto-trigger policy
- `src/lib/ai/paper-stages/foundation.ts` — gagasan stage flow instructions

---

## Finding #3: Choice Card Tetap Interaktif Setelah Dikonfirmasi

**Severity:** Medium (UX)
**Date:** 2026-04-02
**Status:** Open
**Type:** Intermittent — dilaporkan sudah fix di main, tapi muncul lagi

### Observed Behavior

Choice card "Fokus Utama Paper" masih menampilkan checkbox checked + button "Pilih Fokus" aktif, meskipun di bawahnya sudah ada banner "PILIHAN DIKONFIRMASI".

Screenshot evidence: `screenshots/Screen Shot 2026-04-02 at 22.23.17.png`

### Investigation

Code diff antara branch dan main di area json-renderer:
- `src/components/chat/json-renderer/` — **zero diff** (identik dengan main)
- `src/lib/json-render/` — **zero diff** (identik setelah stabilization)
- `submittedChoiceKeys` handling di ChatWindow.tsx — **zero diff**
- Satu-satunya perbedaan: `key={message.id}-choice-block}` ditambahkan ke `JsonRendererChoiceBlock` di MessageBubble.tsx — tapi key stable, seharusnya gak cause remount.

### Possible Cause

`isChoiceSubmitted` bergantung pada `submittedChoiceKeys` Set. Ada 2 paths yang populate set ini:
1. **Live submit** (user klik button) — langsung add key
2. **History rehydration** (useEffect on historyMessages) — reconstruct keys dari conversation history

Kemungkinan: race condition antara live submit key add dan `messages` state reset oleh useChat saat stream berikutnya dimulai. Live key hilang, dan rehydration belum jalan.

### Impact

- User bisa klik button lagi (potential double submit)
- Membingungkan: konfirmasi sudah muncul tapi card masih interaktif

### Note

Ini **bukan regression dari stabilization** — code identical dengan main. Kemungkinan intermittent bug yang ada di main juga tapi jarang terlihat. Perlu deeper investigation dengan React DevTools untuk trace `submittedChoiceKeys` state transitions.

### Files Involved

- `src/components/chat/ChatWindow.tsx` — `submittedChoiceKeys` state, rehydration logic
- `src/components/chat/MessageBubble.tsx` — `isChoiceSubmitted` prop, `key` prop on JsonRendererChoiceBlock
- `src/components/chat/json-renderer/JsonRendererChoiceBlock.tsx` — `isSubmitted` rendering logic

---

## Finding #4: ZodError `unexpected_tool_call` finish_reason dari Provider

**Severity:** Medium (provider-level, bukan code kita)
**Date:** 2026-04-02
**Status:** Open — perlu confirm apakah reproducible setelah dev server restart
**Type:** Provider/AI Gateway error

### Observed Behavior

Error merah di UI: "Gagal mengirim pesan". Terminal:
```
AI_TypeValidationError → ZodError → finish_reason
Input should be 'stop', 'length', 'tool_calls', 'content_filter' or 'malformed_function_call'
input_value='unexpected_tool_call'
```

Model (gemini-2.5-flash) returned `finish_reason='unexpected_tool_call'` yang tidak ada di expected enum. Error dari AI Gateway/provider level, bukan dari application code.

### Note

Test ini kemungkinan terpengaruh oleh **dev server cache** yang masih serve pre-stabilization code. `[IncrementalSave]` log muncul di terminal padahal code sudah clean (grep confirms zero matches). Perlu restart dev server + conversation baru untuk isolate apakah error ini reproducible di stabilized code.

### Root Cause Found

**Turbopack persistent cache** di `.next/dev/cache/turbopack/` masih berisi compiled code lama (pre-stabilization). 10+ SST files mengandung `IncrementalSave` harness code. Turbopack gak auto-invalidate persistent cache meskipun source files berubah via `git checkout origin/main --`.

Ini bukan bug di code kita — ini Turbopack cache staleness issue.

### Action Required

1. Stop dev server
2. `rm -rf .next` (hapus seluruh build cache)
3. `npm run dev` (start segar, Turbopack recompile semua dari source)
4. Lanjutkan tes di conversation yang sama — gak perlu conversation baru

---

## Finding #5: Missing Choice Card Setelah Search — User Stuck Tanpa Next Action

**Severity:** High (UX — user gak tau harus ngapain)
**Date:** 2026-04-02
**Status:** Open — harus di-enforce di branch ini
**Type:** Model compliance gap — tepat sasaran enforcement branch ini

### Observed Behavior

Setelah search selesai di stage topik, model dump 19 rujukan sebagai daftar link mentah. Tidak ada choice card di akhir response. User stuck — gak ada CTA (call-to-action) yang jelas untuk langkah berikutnya.

Screenshot evidence:
- `screenshots/Screen Shot 2026-04-02 at 23.01.46.png` — response dimulai normal
- `screenshots/Screen Shot 2026-04-02 at 23.01.55.png` sampai `23.02.16.png` — daftar link mentah tanpa choice card di akhir

Terminal: `composedChars=644` — response pendek (644 chars), model cuma output summary singkat + daftar referensi tanpa interactive card.

### Root Cause

Stage instructions bilang "use yaml-spec interactive cards" untuk present options. Tapi di **search turn**, model focus pada summarizing search results dan sering lupa/skip emit choice card. Compose phase (Phase 2 orchestrator) generate text dari search context — model compliance terhadap yaml-spec instruction rendah di turn ini.

Ini bukan issue branch — ini behavior yang sama di main.

### Impact

- User gak tau harus ngapain setelah lihat daftar referensi
- Harus manually type next instruction ("lanjut", "rumuskan topik", dll)
- Break flow yang seharusnya guided (choice card → user pilih → next step)

### Possible Fix Directions

- **Option A: Post-search system note** — Setelah search selesai, inject system note yang explicitly instruct: "You MUST end your response with a yaml-spec choice card presenting next step options."
- **Option B: Harness enforcement (future)** — Saat redesign harness, include rule: setiap response HARUS diakhiri choice card kalau stage belum complete.
- **Option C: Prompt reinforcement** — Strengthen yaml-spec instruction di general rules dengan explicit "EVERY response in discussion phase MUST end with an interactive choice card."

### Files Involved

- `src/lib/ai/paper-mode-prompt.ts` — general rules, yaml-spec instruction
- `src/lib/ai/paper-stages/foundation.ts` — topik stage flow instructions
- `src/lib/ai/web-search/orchestrator.ts` — compose phase (where model generates text after search)
