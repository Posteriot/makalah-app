# Manual UI Test Checklist: Artifact Lifecycle Reinforcement

**Branch:** `validation-panel-artifact-consistency`
**Date:** 2026-04-08
**Prerequisite:** `npm run dev` running, logged in, able to create paper sessions.

---

## Cara Pakai Checklist

- Setiap test case punya **expected behavior** yang harus dicocokkan.
- Cek console log (browser DevTools atau server terminal) untuk observability events.
- Gunakan stage manapun untuk test — behavior universal di semua 14 stages.
- Rekomendasi: pakai stage `outline` atau `pendahuluan` karena cepat sampai pending_validation.

---

## A. Happy Path — First-Pass Flow (Regression Check)

Pastikan first-pass flow yang sudah ada TIDAK rusak.

### A1. Drafting sampai pending_validation
- [ ] Buat paper session baru
- [ ] Tunggu AI selesai drafting (updateStageData + createArtifact + submitStageForValidation)
- [ ] Validation panel muncul dengan tombol Approve / Revise
- [ ] Artifact terbuka otomatis di panel artifact

### A2. Approve dari panel
- [ ] Klik Approve di validation panel
- [ ] Stage berpindah ke stage berikutnya
- [ ] AI mulai drafting stage baru

### A3. Revise dari panel (panel-triggered)
- [ ] Saat pending_validation, klik Revise di validation panel
- [ ] Isi feedback, submit
- [ ] AI melakukan revisi (updateArtifact, BUKAN createArtifact)
- [ ] AI submit ulang (submitStageForValidation)
- [ ] Validation panel muncul kembali
- [ ] **Console:** `[revision-triggered-by-panel]` muncul

---

## B. Chat-Triggered Revision (Fitur Baru Utama)

### B1. Revision intent via chat — keyword jelas
- [ ] Buat session, tunggu sampai pending_validation
- [ ] Ketik di chat: "revisi paragraf kedua, tambahkan contoh konkret"
- [ ] AI harus:
  1. Call `requestRevision` tool (bukan langsung updateArtifact)
  2. Call `updateArtifact` dengan konten revisi
  3. Call `submitStageForValidation` di turn yang sama
- [ ] Validation panel muncul kembali setelah revisi
- [ ] **Console:** `[revision-triggered-by-model]` muncul (dari tool wrapper)

### B2. Revision intent via chat — instruksi spesifik
- [ ] Saat pending_validation, ketik: "ganti judul outline menjadi X"
- [ ] AI detect sebagai revision intent
- [ ] Flow sama seperti B1

### B3. Non-revision intent — pertanyaan saat pending_validation
- [ ] Saat pending_validation, ketik: "apa isi paragraf pertama?"
- [ ] AI menjawab pertanyaan tanpa memanggil tool apapun
- [ ] Status TETAP pending_validation
- [ ] Validation panel tetap ada

### B4. Non-revision intent — diskusi saat pending_validation
- [ ] Saat pending_validation, ketik: "kenapa kamu pilih pendekatan ini?"
- [ ] AI menjawab dengan diskusi/penjelasan
- [ ] Tidak ada tool call, status tetap pending_validation

---

## C. Backend Auto-Rescue (Safety Net)

Ini harder to trigger karena butuh model "lupa" call requestRevision. Tapi bisa di-test secara tidak langsung:

### C1. updateStageData saat pending_validation
- [ ] Jika AI somehow call updateStageData saat pending_validation (bisa terjadi saat model skip requestRevision), backend auto-rescue seharusnya:
  - Auto-transition ke revision
  - BUKAN throw error
  - **Console:** `[revision-auto-rescued-by-backend] ... source=updateStageData`
- **Cara trigger:** Sulit di-trigger manual. Observasi console log saja jika terjadi.

### C2. updateArtifact saat pending_validation
- [ ] Sama seperti C1 tapi untuk updateArtifact path
- [ ] **Console:** `[revision-auto-rescued-by-backend] ... source=updateArtifact`
- **Cara trigger:** Sulit di-trigger manual. Observasi console log saja.

---

## D. Stale Choice Guard

### D1. Choice card saat bukan drafting
- [ ] Saat pending_validation, jika ada choice card lama yang masih visible di chat
- [ ] Klik pilihan di choice card tersebut
- [ ] Harus ditolak — BUKAN error 500
- [ ] **Expected response:** HTTP 409 dengan message "Pilihan ini sudah tidak berlaku..."
- [ ] **Console:** `[stale-choice-rejected]` dengan stage dan stageStatus

### D2. Choice card saat drafting (normal flow)
- [ ] Saat stage baru dimulai (drafting), pilih opsi di choice card
- [ ] Harus diterima dan diproses normal
- [ ] Tidak ada rejection

---

## E. createArtifact Guard (Revision Path)

### E1. Revision harus pakai updateArtifact, bukan createArtifact
- [ ] Saat revision (baik dari panel maupun chat), observasi tool calls
- [ ] AI harus call `updateArtifact` (bukan `createArtifact`)
- [ ] Artifact version naik (v1 -> v2)
- [ ] Artifact ID di stageData berubah ke versi baru

### E2. createArtifact diblok saat revision + artifact valid ada
- [ ] Jika AI somehow call createArtifact saat revision DAN artifact valid masih ada
- [ ] Harus ditolak dengan `CREATE_BLOCKED_VALID_EXISTS`
- [ ] **Console:** `[create-artifact-blocked-valid-exists]`
- **Cara trigger:** Sulit di-trigger manual. Observasi console log saja.

---

## F. Observability Events (Console Log Check)

Verifikasi event IDs muncul di console saat behavior terjadi.

| Event ID | Kapan muncul | Layer |
|----------|-------------|-------|
| `[revision-triggered-by-panel]` | User klik Revise di validation panel | Backend mutation |
| `[revision-triggered-by-model]` | AI detect revision intent dari chat | Tool wrapper |
| `[revision-auto-rescued-by-backend]` | Backend catch leaked tool call saat pending_validation | Backend mutation/inline |
| `[stale-choice-rejected]` | Choice card diklik saat bukan drafting | Route handler |
| `[create-artifact-blocked-valid-exists]` | createArtifact diblok karena artifact valid ada | Route handler |
| `[revision-intent-answered-without-tools]` | AI jawab revision intent tanpa call tool | Route onFinish |

- [ ] Minimal `revision-triggered-by-panel` terlihat saat test A3
- [ ] Minimal `revision-triggered-by-model` terlihat saat test B1
- [ ] `stale-choice-rejected` terlihat saat test D1 (jika applicable)

---

## G. Multi-Stage Verification

Pastikan behavior konsisten di stage berbeda (shared layer, bukan stage-specific).

### G1. Early stage (gagasan atau topik)
- [ ] Chat-triggered revision works
- [ ] Panel revision works

### G2. Mid stage (outline atau pendahuluan)
- [ ] Chat-triggered revision works
- [ ] Panel revision works

### G3. Late stage (daftar_pustaka atau judul)
- [ ] Chat-triggered revision works
- [ ] Panel revision works
- [ ] Untuk daftar_pustaka: AI call compileDaftarPustaka sebelum updateArtifact

---

## H. Edge Cases

### H1. Multiple revisions berturut-turut
- [ ] Request revision via chat, tunggu selesai
- [ ] Request revision lagi via chat
- [ ] revisionCount naik setiap kali (observable di console)
- [ ] Artifact version terus naik (v2, v3, ...)

### H2. Mix panel dan chat revision
- [ ] Revision pertama via panel
- [ ] Setelah resubmit, revision kedua via chat
- [ ] Keduanya berfungsi tanpa conflict

### H3. Chat revision setelah approve (harus gagal)
- [ ] Approve stage, pindah ke stage berikutnya
- [ ] Coba ketik revision intent untuk stage LAMA
- [ ] AI seharusnya TIDAK call requestRevision (stage sudah bukan pending_validation)

---

## Catatan

- **Tes B (chat-triggered revision) adalah tes paling penting** — ini fitur baru utama.
- Tes C dan E sulit di-trigger manual karena membutuhkan model behavior yang tidak normal. Fokus pada console log observation jika terjadi secara natural.
- Semua behavior bersifat **universal 14 stages** — tidak perlu test semua stage. Cukup 2-3 stage representatif (Section G).
- Tes D (stale choice) tergantung apakah choice card masih visible setelah state transition.
