# Design Doc: AI Ops Skill Runtime Monitoring

Tanggal: 27 Februari 2026  
Status: Draft V1  
Owner: AI/Platform  
Lokasi target UI: `/ai-ops`

---

## 1) Latar Belakang Berpikir

Saat ini kita sudah punya runtime resolver stage skill untuk workflow 13 tahap, dan secara internal sudah ada sinyal `skillResolverFallback` di `aiTelemetry`.

Masalah utama yang terjadi di operasi harian:
1. Admin tidak punya visualisasi langsung di `/ai-ops` untuk menjawab pertanyaan inti: "request ini pakai active skill atau fallback?"
2. Bukti penggunaan skill masih harus diverifikasi manual lewat log/Convex query ad-hoc.
3. Investigasi kejadian fallback belum efisien karena konteks yang tampil belum lengkap (stage, skill id, reason).

Akibatnya, validasi runtime skill sering jadi lambat dan rawan salah baca.

---

## 2) Tujuan

Menyediakan UI monitor khusus di `/ai-ops` agar admin/superadmin bisa melihat:
1. Rasio skill aktif vs fallback secara agregat.
2. Tren fallback dan reason-nya.
3. Trace per conversation untuk audit cepat.
4. Status operasional skill runtime tanpa perlu buka log terminal.

---

## 3) Non-Tujuan (V1)

1. Bukan untuk edit konten skill (tetap di admin `Stage Skills`).
2. Bukan pengganti observability provider model umum (`model.overview`, `model.tools`, `model.failures`).
3. Bukan untuk replay penuh seluruh message stream.

---

## 4) Baseline Code Saat Ini

### 4.1 Data & Logging
1. `getPaperModeSystemPrompt()` sudah menghasilkan:
   - `stageInstructionSource`
   - `skillResolverFallback`
   - `activeSkillId`
   - `activeSkillVersion`
   - `fallbackReason`
2. `route.ts` saat log telemetry baru mengirim `skillResolverFallback`.
3. `convex/aiTelemetry.ts` sudah menyimpan `skillResolverFallback` dan sudah ada query model health existing.

### 4.2 UI AI Ops
1. Halaman `src/app/(dashboard)/ai-ops/page.tsx` sudah role-gated admin/superadmin.
2. Sidebar dan panel sudah modular via `AiOpsContentSection.tsx` + `aiOpsConfig.ts`.

Kesimpulan baseline:
1. Pondasi monitoring sudah ada.
2. Sinyal runtime skill belum cukup kaya untuk panel observability yang tajam.

---

## 5) Rekomendasi Desain Terbaik

Rekomendasi terbaik untuk konteks sekarang:
1. Tambah tab mandiri baru: `skill.monitor` (label: `Skill Monitor`).
2. Perkaya telemetry schema untuk menyimpan metadata resolver stage-skill.
3. Tambah panel ringkas + panel trace conversation.

Kenapa ini terbaik:
1. Skill runtime punya kebutuhan observability sendiri dan tidak tenggelam di tab existing.
2. Reuse arsitektur AI Ops existing tanpa bikin halaman baru.
3. Biaya implementasi rendah dan dampak operasional langsung.

---

## 6) Desain Data (V1.1)

### 6.1 Perluasan `aiTelemetry` (append-only)

Tambahkan field optional:
1. `stageScope?: PaperStageId`
2. `stageInstructionSource?: "skill" | "fallback" | "none"`
3. `activeSkillId?: string`
4. `activeSkillVersion?: number`
5. `fallbackReason?: string`

Catatan:
1. Semua optional untuk backward compatibility record lama.
2. Tetap satu record per request seperti pola sekarang.

### 6.2 Index

Tambahkan index:
1. `by_conversation_created: ["conversationId", "createdAt"]`
2. `by_stage_created: ["stageScope", "createdAt"]`

Tujuan:
1. Query trace conversation jadi O(log n) by index.
2. Breakdown stage tidak perlu scan besar.

---

## 7) Query Contract untuk UI Monitoring

### 7.1 `aiTelemetry:getSkillRuntimeOverview`

Input:
1. `requestorUserId`
2. `period: "1h" | "24h" | "7d"`

Output:
1. `totalPaperRequests`
2. `skillAppliedCount` (`stageInstructionSource = "skill"`)
3. `fallbackCount` (`skillResolverFallback = true`)
4. `fallbackRate`
5. `topFallbackReasons[]`
6. `byStage[]` (stage + requestCount + fallbackCount + fallbackRate)

### 7.2 `aiTelemetry:getSkillRuntimeTrace`

Input:
1. `requestorUserId`
2. `period`
3. `limit`
4. filter opsional: `stageScope`, `conversationId`, `onlyFallback`

Output item:
1. `createdAt`
2. `conversationId`
3. `stageScope`
4. `stageInstructionSource`
5. `skillResolverFallback`
6. `activeSkillId`
7. `activeSkillVersion`
8. `fallbackReason`
9. `mode`
10. `provider`, `model`, `latencyMs`, `success`

### 7.3 `aiTelemetry:getConversationTrace` (sudah ada)

Dipakai untuk drilldown detail conversation tertentu.

---

## 8) Desain UI `/ai-ops`

## 8.1 Sidebar

Tambah tab mandiri baru:
1. Tab id: `skill.monitor`
2. Label: `Skill Monitor`
3. Header:
   - Title: `Skill Runtime Monitoring`
   - Description: `Pantau apakah stage instruction memakai active skill atau fallback.`

## 8.2 Panel Layout

### A. Overview Cards
1. `Skill Applied Rate`
2. `Fallback Rate`
3. `Total Paper Requests`
4. `Fallback Requests`

### B. Fallback Reasons
1. List top fallback reason (mis. `no_active_skill`, `runtime_validation_failed`, `resolver_error`).

### C. Stage Breakdown
1. Tabel per stage:
   - `stage`
   - `requests`
   - `fallback`
   - `fallback rate`

### D. Trace Table
1. Kolom:
   - waktu
   - conversation id
   - stage
   - source (`skill/fallback`)
   - active skill (`id@version`)
   - fallback reason
   - model/provider
2. Klik row membuka `Conversation Trace Dialog`.

### E. Conversation Trace Dialog
1. Reuse query `getConversationTrace`.
2. Menampilkan urutan event resolver untuk conversation terpilih.

---

## 9) Aturan Role dan Akses

1. Seluruh query monitoring skill runtime wajib `requireRole(..., "admin")`.
2. UI hanya tampil untuk role `admin/superadmin` (mengikuti gate `AiOpsPage` existing).

---

## 10) Acceptance Criteria

1. Tab `skill.monitor` tampil di `/ai-ops` untuk admin/superadmin.
2. Admin bisa melihat rasio `skill applied` vs `fallback` untuk period `1h/24h/7d`.
3. Admin bisa melihat fallback reason teratas.
4. Admin bisa melihat breakdown fallback per stage.
5. Admin bisa filter trace berdasarkan `conversationId` dan `stage`.
6. Klik row trace membuka detail conversation trace.
7. Record lama tanpa field baru tetap tidak memecahkan UI.
8. Query baru tidak melakukan full scan tanpa batas (harus pakai index/limit).

---

## 11) Risiko & Mitigasi

1. Risiko: record lama tidak punya metadata stage/source.
   - Mitigasi: render `unknown` + filter null-safe.
2. Risiko: cardinality `conversationId` tinggi.
   - Mitigasi: index `by_conversation_created`, limit default ketat.
3. Risiko: data tidak konsisten jika beberapa jalur log lupa mengirim field baru.
   - Mitigasi: satu helper telemetry payload di `route.ts` untuk semua cabang.

---

## 12) Rencana Rollout

1. Phase 1: tambah field + index + query (backend).
2. Phase 2: tambah tab + panel UI `skill.monitor`.
3. Phase 3: uji manual 3 skenario:
   - active skill normal
   - fallback karena disable skill
   - fallback karena runtime validation fail
4. Phase 4: observasi 24 jam, cek apakah fallback reason terbaca sesuai ekspektasi.

---

## 13) Referensi File (Codebase)

1. `src/app/(dashboard)/ai-ops/page.tsx`
2. `src/components/ai-ops/aiOpsConfig.ts`
3. `src/components/ai-ops/AiOpsContentSection.tsx`
4. `src/lib/ai/paper-mode-prompt.ts`
5. `src/lib/ai/stage-skill-resolver.ts`
6. `src/lib/ai/telemetry.ts`
7. `src/app/api/chat/route.ts`
8. `convex/schema.ts`
9. `convex/aiTelemetry.ts`
10. `convex/stageSkills.ts`
