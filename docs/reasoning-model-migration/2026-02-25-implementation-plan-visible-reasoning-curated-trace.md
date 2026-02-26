# Implementation Plan: Visible Reasoning (Curated Trace)

Tanggal: 25 Februari 2026  
Status: Draft Plan (siap eksekusi)  
Dokumen desain acuan:
- [Desain Implementasi Reasoning Migration](./2026-02-25-desain-visible-reasoning-curated-trace.md)

---

## 1) Objective

1. Aktifkan reasoning mode terkontrol untuk `Gemini 2.5 Flash`.
2. Tampilkan panel "Apa yang dipikirkan model" default terbuka sebagai **curated trace**.
3. Pastikan tidak ada raw CoT yang bocor ke UI.

---

## 2) Scope

### In Scope

1. Penambahan konfigurasi reasoning di schema + admin config.
2. Integrasi reasoning options ke jalur `streamText` chat.
3. Event stream baru `data-reasoning-trace` (sanitized).
4. UI panel reasoning trace di area processing atas input, default expanded.
5. Telemetry dasar reasoning (latency, token, trace completeness).
6. Penyajian trace hanya untuk lifecycle turn berjalan (ephemeral).

### Out of Scope

1. Menampilkan raw thought token model.
2. Integrasi MCP `Sequential Thinking` ke runtime chat utama.
3. Upgrade default model ke Gemini 3.
4. Penyimpanan reasoning trace ke histori chat/database pada fase 1.

---

## 3) Baseline Constraints

1. Visible reasoning wajib curated, bukan raw CoT.
2. Panel reasoning default terbuka pada sesi user baru.
3. Tool-calling reliability tidak boleh turun.
4. Policy paper workflow (stage gating + anti-hallucination) harus tetap utuh.
5. **Fase 1 lock**: reasoning trace bersifat `ephemeral per turn` (tidak dipersist ke histori chat/database).

---

## 4) Target Files

## 4.1 Data & Config

1. `convex/schema.ts`
2. `convex/aiProviderConfigs.ts`
3. `src/lib/ai/config-cache.ts`
4. `src/components/admin/AIProviderConfigEditor.tsx`
5. `src/components/admin/AIProviderFormDialog.tsx`

## 4.2 Runtime AI

1. `src/lib/ai/streaming.ts`
2. `src/app/api/chat/route.ts`
3. `src/lib/ai/telemetry.ts` (jika perlu field tambahan)

## 4.3 Chat UI

1. `src/components/chat/SearchStatusIndicator.tsx` (atau komponen status setara)
2. Komponen baru: `src/components/chat/ReasoningTracePanel.tsx`
3. Tipe/kontrak stream data UI message (lokasi menyesuaikan codebase)

## 4.4 Tests

1. `__tests__/` untuk mapper/sanitizer curated trace
2. `__tests__/` untuk rendering panel default expanded
3. `__tests__/` regression tool-calling path (paper mode + web search mode)

---

## 5) Execution Plan (Phase-by-Phase)

## Phase 0.5 - Product Lock (Ephemeral)

Task:
1. Tetapkan keputusan produk bahwa trace tidak disimpan ke histori.
2. Pastikan arsitektur event stream hanya mengalir saat turn berjalan.
3. Pastikan tidak ada write path ke message persistence untuk reasoning trace.

Deliverable:
1. Keputusan lock terdokumentasi dan menjadi acuan implementasi fase berikutnya.

---

## Phase 0 - Preflight

1. Validasi branch aktif: `feature/paper-prompt-compression`.
2. Pastikan working tree bersih atau perubahan terdokumentasi.
3. Sinkronkan nama config baru dan default value.

Deliverable:
1. Daftar field config reasoning final.

---

## Phase 1 - Schema & Admin Config

Task:
1. Tambah field config:
   - `reasoningEnabled?: boolean`
   - `thinkingBudgetPrimary?: number`
   - `thinkingBudgetFallback?: number`
   - `reasoningTraceMode?: "off" | "curated"`
2. Update create/update/getActiveConfig di `convex/aiProviderConfigs.ts`.
3. Update cache type di `src/lib/ai/config-cache.ts`.
4. Tambah kontrol UI di admin config editor/form.

Default:
1. `reasoningEnabled = true`
2. `reasoningTraceMode = "curated"`
3. thinking budget default rendah-menengah (konservatif).

Deliverable:
1. Config reasoning bisa disimpan, dibaca, dan dipakai runtime.

---

## Phase 2 - Runtime Reasoning Options

Task:
1. Di `streaming.ts`, expose reasoning settings dari provider config.
2. Di `route.ts`, inject providerOptions thinking hanya saat model/provider kompatibel.
3. Terapkan policy budget:
   - turn tool-heavy: budget rendah
   - turn analisis naratif: budget lebih tinggi
4. Tambah fallback aman jika provider tidak support thinking options.

Deliverable:
1. Runtime tidak crash pada provider non-support.
2. Reasoning mode bisa on/off via config.

---

## Phase 3 - Curated Trace Mapper & Sanitizer

Task:
1. Definisikan kontrak event `data-reasoning-trace`.
2. Buat mapper server-side dari runtime events -> curated steps.
3. Sanitasi payload:
   - blok raw reasoning text
   - whitelist metadata aman
   - trim panjang field
4. Emit trace events sepanjang lifecycle response.

Minimal step keys:
1. `intent-analysis`
2. `paper-context-check`
3. `search-decision`
4. `source-validation`
5. `response-compose`
6. `tool-action` (opsional by path)

Deliverable:
1. Stream trace berjalan konsisten lintas mode normal/paper/web search.

---

## Phase 4 - UI Reasoning Panel

Task:
1. Tambah panel "Apa yang dipikirkan model" di area status processing.
2. Default state = expanded.
3. Tambah tombol collapse/expand.
4. Persist preferensi user setelah interaksi pertama.
5. Render status step (pending/running/done/skipped/error) + progress.

UX rules:
1. Jika trace mode `off`, panel disembunyikan.
2. Jika trace belum ada event, tampilkan skeleton langkah standar.
3. Setelah selesai, tampil status final "Selesai" + ringkasan singkat.
4. Trace hanya tersedia untuk turn aktif; saat reload halaman tidak ditampilkan ulang dari histori.

Deliverable:
1. Panel stabil di desktop + mobile.

---

## Phase 5 - Testing & Verification

### Unit Tests

1. Sanitizer tidak mengirim raw CoT.
2. Mapper menghasilkan step berurutan dengan status valid.
3. Default expanded behavior.

### Integration Tests

1. Paper mode + web search mode tidak regress.
2. Tool-calling sukses (createArtifact/updateStageData/submitStageForValidation) tetap normal.
3. Error path tetap menutup trace dengan status `error`.

### Manual QA

1. Skenario normal chat non-paper.
2. Skenario paper stage aktif dengan referensi.
3. Skenario fallback provider.

Deliverable:
1. Bukti pass test + screenshot UI panel reasoning.

---

## Phase 6 - Rollout

1. Rollout internal/canary dulu (admin toggle reasoning trace).
2. Monitor 48 jam:
   - latency p95
   - error rate stream
   - tool call success rate
   - token usage delta
3. Jika aman, aktifkan default untuk user umum.

Rollback trigger:
1. tool call success turun signifikan.
2. latency naik signifikan tanpa manfaat kualitas.
3. ditemukan potensi kebocoran trace sensitif.

Rollback action:
1. set `reasoningTraceMode = off`
2. set `reasoningEnabled = false`
3. deploy patch sanitizer jika perlu.

---

## 6) Definition of Done

Implementasi dianggap selesai jika:
1. Reasoning config aktif dan terbaca runtime.
2. Panel "Apa yang dipikirkan model" tampil default terbuka.
3. Isi panel adalah curated trace, tanpa raw CoT.
4. Tool workflow paper tetap stabil.
5. Test penting lulus + QA manual tercatat.

---

## 7) Open Decisions (Needs Product Confirmation)

1. Berapa nilai default `thinkingBudgetPrimary` yang dipakai pada launch awal?
2. Apakah panel reasoning tetap terlihat setelah response selesai atau auto-collapse?
3. (Locked) Curated trace fase 1 = `ephemeral per turn`, tidak disimpan ke histori.
