# Implementation Doc: Dirty-Context Aware Synchronization

Tanggal: 27 Februari 2026  
Status: Ready for implementation setelah validasi user  
Dependensi: Design doc `2026-02-27-design-doc-dirty-context-aware-synchronization.md`

---

## 1) Scope Implementasi

Implementasi difokuskan pada 4 area:
1. Router deterministic sync intent di `chat route`.
2. Prompt context injection `isDirty` di paper mode.
3. Response contract saat dirty-context.
4. Telemetry marker untuk audit di `/ai-ops`.

Tidak termasuk:
1. Perubahan schema Convex.
2. Perubahan UI besar.
3. Tool baru.

---

## 2) File Target dan Perubahan

## 2.1 `src/app/api/chat/route.ts`

Tujuan:
1. Tambah helper `isExplicitSyncRequest`.
2. Tambah branch deterministic override.
3. Pasang `toolChoice` + `stopWhen=1` untuk sync path.
4. Tambah telemetry marker `toolUsed: getCurrentPaperState` untuk sync path.

Rencana patch:
1. Definisikan helper baru di area helper intent (dekat helper confirm/search).
2. Hitung flag:
   - `const explicitSyncRequest = isExplicitSyncRequest(lastUserContent)`
3. Override router sebelum websearch decision final:
   - jika paper mode + explicitSyncRequest -> paksa `enableWebSearch=false`.
4. Pada `streamText(...)` set:
   - `toolChoice: { type: "tool", toolName: "getCurrentPaperState" }`
   - `stopWhen: stepCountIs(1)`
5. Di log telemetry, set `toolUsed: "getCurrentPaperState"` untuk jalur ini.

Catatan penting:
1. Pertahankan priority rule existing untuk explicit web search request.
2. Jangan mengganggu flow `submitStageForValidation` existing.

## 2.2 `src/lib/ai/paper-mode-prompt.ts`

Tujuan:
1. Injeksi `isDirty` ke context prompt.
2. Tambah instruksi wajib saat `pending_validation + isDirty=true`.

Rencana patch:
1. Baca `session.isDirty`.
2. Tambah blok context status di prompt:
   - `Dirty Context: true/false`
3. Tambah note conditional:
   - jika pending + dirty: wajib jelaskan data belum sinkron, dan minta revisi dulu sebelum update/sinkron.

## 2.3 (Opsional minor) `src/lib/ai/paper-search-helpers.ts`

Tujuan:
1. Jika dibutuhkan, tempatkan helper intent sinkronisasi di sini agar konsisten dengan helper intent lain.

Rencana:
1. Implement fungsi reusable `isExplicitSyncRequest`.
2. Import di `route.ts`.

Catatan:
1. Jika scope minim, helper boleh langsung di `route.ts`.

## 2.4 Observability Query (tanpa schema change)

Tujuan:
1. Pastikan telemetry existing bisa merekam marker baru.
2. Pastikan panel `/ai-ops` bisa mengaudit via query existing.

Rencana:
1. Tidak ubah `convex/aiTelemetry.ts` schema (karena `toolUsed` sudah ada).
2. Verifikasi query existing sudah include `toolUsed` (sudah ada).

---

## 3) Checklist Implementasi

1. Tambah intent sync detector.
2. Tambah deterministic route override.
3. Tambah forced toolChoice `getCurrentPaperState`.
4. Tambah prompt context `isDirty` + dirty contract.
5. Tambah telemetry marker sync path.
6. Jalankan lint scope chat + ai files.
7. Jalankan verifikasi runtime sample dan audit bukti.

---

## 4) Verifikasi & Audit (Setelah Coding)

## 4.1 Verifikasi statis

Perintah minimal:
1. `npm run lint -- src/app/api/chat/route.ts src/lib/ai/paper-mode-prompt.ts src/lib/ai/paper-search-helpers.ts`

Kriteria lolos:
1. 0 error.

## 4.2 Verifikasi runtime deterministik

Skenario A (harus forced sync):
1. User message: "Lanjut dari state saat ini, cek status sesi."
2. Expected:
   - tool `getCurrentPaperState` terpanggil.
   - `google_search` tidak aktif.

Skenario B (kontrol non-sync):
1. User message diskusi biasa tanpa kata kunci sinkronisasi.
2. Expected:
   - flow normal, tidak forced `getCurrentPaperState`.

Skenario C (dirty contract):
1. Session `stageStatus=pending_validation`, `isDirty=true`.
2. Expected:
   - respons menyatakan belum sinkron.
   - memberi langkah: minta revisi dulu.

## 4.3 Audit bukti data

Sumber bukti:
1. tabel `messages` (trace message & reasoning/tool metadata jika ada).
2. tabel `aiTelemetry` (`toolUsed`).

Kriteria audit:
1. Ada record dengan `toolUsed=getCurrentPaperState` pada request sinkronisasi.
2. Tidak ada false-positive tinggi di request non-sync.

---

## 5) Audit Kesesuaian dengan Tujuan (Pre-Implementation)

Status terhadap tujuan utama saat ini:
1. "Jalur deterministik khusus sinkronisasi": **BELUM** (masih probabilistik).
2. "Bukan inisiatif model": **BELUM**.
3. "Telemetry bisa buktiin": **SEBAGIAN** (field ada, marker sync belum diisi).

Kesimpulan:
1. Design + implementation plan ini **relevan dan perlu dieksekusi** untuk menutup gap.
2. Tidak ada kebutuhan perubahan arsitektur besar.

---

## 6) Rollback Plan

Jika ada regresi setelah implementasi:
1. Disable deterministic override (feature flag lokal di branch patch).
2. Pertahankan perubahan prompt `isDirty` jika aman.
3. Pulihkan `toolChoice` ke behavior sebelumnya.

---

## 7) Deliverables

1. Design doc final (file ini + design doc pasangan).
2. Patch code (setelah validasi user).
3. Evidence report runtime (before/after) berbasis data deployment.
