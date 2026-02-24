# Implementation Plan V2: Conversational Curated Trace (Persistent)

Tanggal: 25 Februari 2026  
Status: Draft Plan V2 (siap eksekusi bertahap)  
Scope: Refinement UX visible reasoning agar terasa naratif + persist ke histori

Dokumen acuan:
- [Desain V2: Conversational Visible Reasoning (Persistent)](./2026-02-25-desain-v2-conversational-curated-trace.md)
- [Desain V1](./2026-02-25-desain-visible-reasoning-curated-trace.md)
- [Implementation Plan V1](./2026-02-25-implementation-plan-visible-reasoning-curated-trace.md)

---

## 1) Objective

1. Ubah pengalaman reasoning dari kartu status teknis menjadi narasi kerja agent yang mudah dipahami user.
2. Pertahankan guardrail `visible reasoning = curated trace`, tanpa raw CoT.
3. Simpan curated trace final per assistant message agar bisa dibuka ulang kapan pun.

---

## 2) Delta dari Implementasi Saat Ini

Kondisi saat ini (berdasarkan code):
1. Event `data-reasoning-trace` sudah ada dan mengalir dari server.
2. UI sudah menampilkan panel "Apa yang dipikirkan model", tapi format masih list status teknis.
3. Trace masih bersifat turn-live, belum jadi bagian histori message yang bisa rehydrate permanen.

Delta target V2:
1. Surface jadi satu baris headline naratif klikable.
2. Detail reasoning pindah ke activity panel (desktop drawer / mobile sheet).
3. Curated trace final disimpan di DB pada message assistant.

---

## 3) File Target

Schema + Convex:
1. `convex/schema.ts`
2. `convex/messages.ts`

Backend/runtime:
1. `src/lib/ai/curated-trace.ts`
2. `src/app/api/chat/route.ts`

Frontend:
1. `src/components/chat/ChatProcessStatusBar.tsx`
2. `src/components/chat/ReasoningTracePanel.tsx`
3. `src/components/chat/ChatWindow.tsx`
4. (baru) `src/components/chat/ReasoningActivityPanel.tsx`

Tests:
1. `src/lib/ai/__tests__/curated-trace.test.ts`
2. `src/components/chat/__tests__/ReasoningTracePanel.test.tsx`
3. `src/components/chat/__tests__/ChatProcessStatusBar.test.tsx`
4. `convex/messages` mutation tests (jika sudah ada pattern test Convex di repo)

---

## 4) Fase Eksekusi

## Phase 0 - Preflight Lock

Task:
1. Lock produk: trace mode = curated + persistent snapshot.
2. Lock policy: no raw CoT, no prompt internal leakage.
3. Lock UX: satu baris headline klikable sebagai entry point detail.
4. Lock retensi: trace ikut lifecycle message (tidak pakai TTL khusus).

Output:
1. Baseline implementasi terkunci sebelum coding.

---

## Phase 1 - Schema & Convex API

Task:
1. Tambah field optional `reasoningTrace` di tabel `messages`.
2. Perluas validator `createMessage` di `convex/messages.ts` untuk menerima `reasoningTrace` optional.
3. (Opsional, bila dibutuhkan) tambah mutation patch khusus `messages.attachReasoningTrace`.

Struktur field yang direkomendasikan:
1. `version: v.number()`
2. `headline: v.string()`
3. `steps: v.array(v.object({ stepKey, label, status, progress?, meta?, ts }))`
4. `completedAt: v.number()`
5. `traceMode: v.literal("curated")`

Output:
1. DB siap menyimpan snapshot trace final di message assistant.

---

## Phase 2 - Runtime Aggregation & Persist

Task:
1. Di `curated-trace.ts`, tambah helper `getFinalSnapshot()` untuk keluarkan payload final yang sudah sanitasi.
2. Di `route.ts`, setelah response final terbentuk, simpan assistant message beserta `reasoningTrace`.
3. Pastikan path sukses/error yang terkontrol tetap menghasilkan trace final yang valid.
4. Jika trace mode `off`, jangan simpan `reasoningTrace`.

Catatan implementasi:
1. Simpan snapshot final sekali saat `saveAssistantMessage(...)` dipanggil.
2. Hindari write berulang per event streaming untuk menjaga biaya dan kompleksitas.

Output:
1. Setiap assistant message baru punya curated trace final (jika mode aktif).

---

## Phase 3 - Surface Headline (Inline)

Task:
1. Refactor `ChatProcessStatusBar` untuk render satu headline naratif aktif.
2. Headline bersifat klikable untuk buka detail.
3. Saat message dari histori dibuka, headline diambil dari `message.reasoningTrace.headline`.

UX rule:
1. Jangan tampilkan identifier internal seperti `source-validation`.
2. Kalau trace tidak ada, fallback ke status loading biasa.

Output:
1. Area atas input terasa seperti agent sedang kerja, bukan panel debug.

---

## Phase 4 - Activity Panel (Persistent Rehydrate)

Task:
1. Implement `ReasoningActivityPanel` untuk render step timeline dari trace tersimpan.
2. Desktop: side panel kanan.
3. Mobile: bottom sheet.
4. Integrasi `ChatWindow` agar klik headline membuka panel trace message terkait (live atau historis).

Output:
1. User bisa membuka reasoning detail kapan pun dari message yang ada trace.

---

## Phase 5 - Copywriting & Sanitization Pass

Task:
1. Ubah semua label step jadi kalimat proses natural.
2. Pastikan `meta.note` tidak terasa log mentah tool.
3. Terapkan max-length + whitelist sebelum persist.

Output:
1. Teks reasoning terasa naratif dan aman.

---

## Phase 6 - Test & Verification

Unit:
1. Mapping step -> headline valid untuk semua stepKey.
2. Sanitizer menolak raw CoT/internal strings.
3. Snapshot final terbuat konsisten pada path sukses/error terkendali.

Integration/Manual:
1. Streaming normal mode tetap jalan.
2. Paper workflow tools tetap stabil.
3. Web search path tetap emit trace lengkap.
4. Reload halaman: trace historis masih bisa dibuka.

Evidence:
1. Screenshot before/after.
2. Cuplikan payload message assistant di DB yang berisi `reasoningTrace` tersanitasi.

---

## 5) Risiko & Mitigasi

1. Risiko: ukuran record `messages` membesar karena steps trace.  
   Mitigasi: limit jumlah step, trim meta, simpan snapshot final saja.

2. Risiko: kebocoran data internal saat persistence.  
   Mitigasi: sanitizer whitelist-only + no raw reasoning enforcement.

3. Risiko: mismatch antara trace live dan trace tersimpan.  
   Mitigasi: snapshot final dibangun dari state controller yang sama.

4. Risiko: edit-and-resend menghapus message lama sekaligus trace lama.  
   Mitigasi: jadikan behavior eksplisit di UX + dokumen produk.

---

## 6) Definition of Done

1. User melihat headline naratif aktif selama AI merespons.
2. User bisa klik headline untuk buka detail aktivitas.
3. Detail reasoning bisa dibuka ulang dari histori chat setelah reload.
4. Tidak ada raw CoT atau string internal sensitif yang tersimpan/ditampilkan.
5. Test utama pass dan ada evidence visual + evidence data.

---

## 7) Pertanyaan Kunci Sebelum Eksekusi

1. Untuk panel mobile, lo final pilih `80vh` atau full-screen?
