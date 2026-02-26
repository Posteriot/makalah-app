# Implementation Plan Integrasi Skill Runtime untuk Workflow 13 Stage

Tanggal: 26 Februari 2026
Status: Planned (belum diimplementasikan)
Scope: Implementasi end-to-end skill registry internal, runtime resolver, admin panel create/edit/publish/activate, dan guard compliance untuk paper workflow 13 tahap.

---

## 0) Baseline Terverifikasi (Cabang `feature/skill-based-paper-workflow`)

| Area | Status | Bukti Codebase |
|---|---|---|
| Stage instruction masih hardcoded | `PENDING` | `src/lib/ai/paper-stages/index.ts`, `src/lib/ai/paper-mode-prompt.ts` masih pakai `getStageInstructions(stage)` |
| Skill registry table/runtime resolver belum ada | `PENDING` | belum ada `stageSkills`, `stageSkillVersions`, `stageSkillAuditLogs` di `convex/schema.ts`; belum ada `src/lib/ai/stage-skill-resolver.ts` |
| `compileDaftarPustaka` mode `preview|persist` | `SATISFIED` | `convex/paperSessions.ts`, `src/lib/ai/paper-tools.ts`, `src/app/api/chat/route.ts` |
| Dokumen format skill + 13 skill package | `SATISFIED` | `docs/skill-per-stage/skill-format-reference.md`, `docs/skill-per-stage/skills/*/SKILL.md` |
| Admin pattern yang bisa direuse (system prompt manager) | `SATISFIED` | `convex/systemPrompts.ts`, `src/components/admin/SystemPromptsManager.tsx` |
| Living outline checklist | `VERIFY_IN_TASK_0` | referensi dokumen ada di `docs/plans/2026-02-26-living-outline-checklist.md`; validasi final ke code dilakukan di Task 0 |

Catatan: implementation plan ini mengasumsikan kontrak `compileDaftarPustaka preview|persist` adalah behavior final dan harus dipertahankan.

---

## 1) Tujuan Implementasi

1. Menjadikan prompt per stage bersifat `skill-active-first` tanpa menghapus fallback hardcoded.
2. Menyediakan manajemen skill dari admin panel untuk role `admin` dan `superadmin` (create/edit/publish/activate/rollback).
3. Menegakkan compliance skill saat publish/activate: format valid, kebijakan stage valid, dan konten full English.
4. Menjaga guard runtime existing (stage lock, tool routing, approval gate) tetap sebagai authority utama.

---

## 2) Ruang Lingkup

In scope:
1. Schema Convex untuk skill catalog, versioning, audit log.
2. Query/mutation Convex untuk lifecycle skill.
3. Runtime resolver skill di pipeline prompt paper mode.
4. Integrasi admin panel untuk CRUD + versioning + activation.
5. Validator compliance (format + policy + English-only gate).
6. Test otomatis + verifikasi manual.

Out of scope:
1. Mengubah urutan 13 stage di `paperSessions/constants.ts`.
2. Menghapus instruksi hardcoded stage (`paper-stages/*`).
3. Mengubah kontrak tool `google_search` vs function tools di luar kebutuhan integrasi skill.
4. Mengubah behavior `compileDaftarPustaka` yang sudah berjalan.

---

## 3) Arsitektur Target (Ringkas)

```mermaid
flowchart LR
  U[User Message] --> R[Chat Route]
  R --> P[Paper Session Fetch]
  P --> S[Resolve currentStage]
  S --> K[Stage Skill Resolver]
  K --> C[Compose Prompt: Skill First + Fallback]
  C --> T[Tool Routing Guard Existing]
  T --> L[LLM Response]
  L --> G[Backend Stage Guards]
  G --> D[Persist]
```

Prinsip prioritas:
1. Backend guard (`paperSessions`) tetap paling tinggi.
2. Router tool (`chat/route.ts`) tidak boleh dioverride oleh skill.
3. Skill aktif memengaruhi instruksi stage, bukan policy keselamatan inti.

---

## 4) Breakdown Task Implementasi

## Task 0 — Preflight Verifikasi Baseline

### Subtask
1. Verifikasi branch sinkron dan daftar perubahan non-scope.
2. Verifikasi kontrak existing `compileDaftarPustaka` (`preview|persist`) tetap hijau.
3. Verifikasi status living outline checklist ke codebase (jika belum ada di branch ini, tandai sebagai dependency merge).
4. Catat baseline build/test sebagai pembanding regresi.

### Checklist verifikasi pekerjaan
- [ ] `git status` dan `git log --oneline -n 20` terdokumentasi.
- [ ] Kontrak compile tool terbukti ada di `paper-tools.ts` + `paperSessions.ts`.
- [ ] Status living outline ditulis eksplisit: `SATISFIED` atau `PENDING MERGE` (dengan bukti file).
- [ ] Baseline `npm run build` tercatat.

### Checklist verifikasi hasil
- [ ] Tidak ada asumsi palsu pada status `implemented`.
- [ ] Semua dependency sebelum coding sudah jelas.

---

## Task 1 — Tambah Model Data Skill di Convex

### Target file
1. `convex/schema.ts`
2. `convex/stageSkills.ts` (baru)
3. `convex/_generated/api.d.ts` (generated)

### Subtask
1. Tambah table `stageSkills`:
   - `skillId`, `stageScope`, `name`, `description`, `isEnabled`, `allowedTools`, timestamps.
2. Tambah table `stageSkillVersions`:
   - `skillId`, `version`, `content`, `status`, `changeNote`, `createdBy`, timestamps.
3. Tambah table `stageSkillAuditLogs`:
   - `skillId`, `version`, `action`, `actorId`, `metadata`, `createdAt`.
4. Tambah index minimum:
   - `stageSkills.by_stageScope`
   - `stageSkills.by_skillId`
   - `stageSkillVersions.by_skillId`
   - `stageSkillVersions.by_skillId_status`
   - `stageSkillAuditLogs.by_skillId_createdAt`

### Checklist verifikasi pekerjaan
- [ ] Schema lulus validasi Convex.
- [ ] Tidak ada konflik tipe dengan `paperSessions` existing.
- [ ] Enum `stageScope` sinkron dengan `STAGE_ORDER`.

### Checklist verifikasi hasil
- [ ] Query aktif per stage bisa dilakukan dengan satu index lookup.
- [ ] Data audit lifecycle skill bisa ditelusuri kronologis.

---

## Task 2 — Implementasi Service Lifecycle Skill + RBAC

### Target file
1. `convex/stageSkills.ts` (baru)
2. `convex/permissions.ts` (reuse `requireRole`)

### Subtask
1. Query:
   - `listByStage`, `getBySkillId`, `getActiveByStage`, `getVersionHistory`.
2. Mutation:
   - `createStageSkill`
   - `createDraftVersion`
   - `publishVersion`
   - `activateVersion`
   - `rollbackVersion`
3. Role gate formal:
   - seluruh mutation create/edit/publish/activate/rollback wajib `requireRole(db, requestorUserId, "admin")`.
   - implikasi: hanya `admin`/`superadmin` yang lolos.
4. Aktivasi atomik:
   - nonaktifkan active lama (`status=published`) lalu aktifkan target (`status=active`) dalam satu mutation.
5. Tulis audit event di `stageSkillAuditLogs` untuk setiap mutation.

### Checklist verifikasi pekerjaan
- [ ] Semua mutation lifecycle memeriksa role admin.
- [ ] Tidak ada lebih dari satu version `active` per `skillId`.
- [ ] Rollback menghasilkan active version yang deterministik.

### Checklist verifikasi hasil
- [ ] Role `user` tidak bisa create/edit/activate skill.
- [ ] Audit log terisi untuk semua aksi lifecycle.

---

## Task 3 — Validator Compliance Skill (Format + Policy + English Gate)

### Target file
1. `src/lib/ai/stage-skill-validator.ts` (baru)
2. `src/lib/ai/stage-skill-language.ts` (baru)
3. `convex/stageSkills.ts` (hook validator saat publish/activate)

### Subtask
1. Validasi struktur `SKILL.md`:
   - frontmatter wajib `name`, `description`.
   - body wajib section: `Objective`, `Input Context`, `Tool Policy`, `Output Contract`, `Guardrails`, `Done Criteria`.
2. Validasi policy compile:
   - skill non-`daftar_pustaka` dilarang menginstruksikan `compileDaftarPustaka({ mode: "persist" })`.
   - `daftar-pustaka-skill` wajib memuat jalur `mode: "persist"`.
3. Validasi policy living outline:
   - `outline-skill` wajib memuat lifecycle checklist.
   - stage pasca-outline wajib memuat instruksi membaca status checklist outline.
4. Validasi bahasa:
   - reject publish/activate kalau konten bukan English dominan.
   - exception: proper noun, nama stage, nama tool/API, field schema.

### Checklist verifikasi pekerjaan
- [ ] Validator dipanggil di `publishVersion` dan `activateVersion`.
- [ ] Error message jelas (menyebut rule yang gagal).
- [ ] Rule English gate aktif (hard reject).

### Checklist verifikasi hasil
- [ ] Skill non-English tidak bisa diaktifkan.
- [ ] Skill yang melanggar compile policy ditolak sebelum runtime.

---

## Task 4 — Integrasi Runtime Prompt Composer (`skill-active-first`)

### Target file
1. `src/lib/ai/stage-skill-resolver.ts` (baru)
2. `src/lib/ai/paper-mode-prompt.ts`
3. `src/lib/ai/paper-stages/index.ts` (tetap sebagai fallback)

### Subtask
1. Tambah resolver stage -> skillId:
   - `gagasan` -> `gagasan-skill`, dst.
2. Pada `getPaperModeSystemPrompt`:
   - fetch active skill by stage.
   - jika ada: pakai `skill.content` sebagai instruksi stage.
   - jika gagal/empty: fallback ke `getStageInstructions(stage)`.
3. Tambah observability runtime:
   - source instruksi (`skill` vs `fallback`) di log metadata.
4. Pastikan compile policy instruksi global existing tetap ikut tersisip.

### Checklist verifikasi pekerjaan
- [ ] `paper-mode-prompt.ts` tidak hardcoded-only lagi.
- [ ] Fallback ke hardcoded tetap tersedia dan aman.
- [ ] Error fetch skill tidak memutus alur chat.

### Checklist verifikasi hasil
- [ ] Saat skill active ada, prompt stage pakai skill version aktif.
- [ ] Saat skill inactive/invalid, sistem tetap jalan dengan fallback.

---

## Task 5 — Integrasi Admin Panel Create/Edit/Publish/Activate/Rollback

### Target file
1. `src/components/admin/adminPanelConfig.ts`
2. `src/components/admin/StageSkillsManager.tsx` (baru)
3. `src/components/admin/StageSkillFormDialog.tsx` (baru)
4. `src/components/admin/StageSkillVersionHistoryDialog.tsx` (baru)
5. `src/app/(dashboard)/admin/page.tsx` atau komponen container admin terkait

### Subtask
1. Tambah tab baru `Stage Skills` di admin panel.
2. Reuse pola UX dari `SystemPromptsManager` untuk list + action.
3. Form create/edit skill dengan field terstruktur:
   - `name`, `description`, `stageScope`, `contentBody`, `changeNote`.
4. Aksi publish/activate/rollback dari UI.
5. Tampilkan hasil validasi (termasuk English gate) secara eksplisit di UI error toast.

### Checklist verifikasi pekerjaan
- [ ] UI manajemen skill muncul di admin panel.
- [ ] Role `admin`/`superadmin` bisa create/edit/publish/activate/rollback.
- [ ] Role `user` tidak punya akses aksi mutasi.

### Checklist verifikasi hasil
- [ ] Admin bisa membuat skill baru dari panel tanpa deploy.
- [ ] Aktivasi skill langsung berpengaruh ke runtime stage terkait.

---

## Task 6 — Observability dan Guard Runtime Conflict

### Target file
1. `convex/stageSkills.ts`
2. `convex/systemAlerts.ts` (opsional integrasi)
3. `src/app/api/chat/route.ts` / `paper-mode-prompt.ts` (emit event)

### Subtask
1. Tambah event audit `runtime_conflict` saat instruksi skill bertentangan dengan policy router/tool guard.
2. Simpan metadata konflik (stage, skillId, rule, timestamp).
3. (Opsional V1.1) kirim alert ke `systemAlerts` untuk monitoring admin.

### Checklist verifikasi pekerjaan
- [ ] Konflik runtime terdokumentasi di audit log.
- [ ] Tidak ada kebijakan tool-routing yang ter-bypass oleh skill.

### Checklist verifikasi hasil
- [ ] Tim ops bisa lacak skill yang bikin konflik perilaku.

---

## Task 7 — Test Otomatis

### Target file test
1. `convex/stageSkills.test.ts` (baru)
2. `src/lib/ai/stage-skill-validator.test.ts` (baru)
3. `src/lib/ai/paper-mode-prompt.stage-skill.test.ts` (baru)

### Subtask
1. Unit test validator:
   - valid/invalid frontmatter.
   - missing mandatory sections.
   - non-English reject.
   - compile policy reject.
2. Unit test Convex lifecycle:
   - create/edit/publish/activate/rollback.
   - role gate admin vs user.
3. Integration test prompt composer:
   - skill active -> source `skill`.
   - no skill -> fallback hardcoded.

### Checklist verifikasi pekerjaan
- [ ] Seluruh test baru pass.
- [ ] Tidak ada regresi test compile daftar pustaka existing.

### Checklist verifikasi hasil
- [ ] Perubahan runtime skill tervalidasi otomatis untuk edge case utama.

---

## Task 8 — Rollout Bertahap + Backfill 13 Skill

### Subtask
1. Backfill seed 13 skill ke DB dari `docs/skill-per-stage/skills/*/SKILL.md`.
2. Aktivasi bertahap:
   - phase 1: 2 stage awal (`gagasan`, `topik`).
   - phase 2: stage inti (`outline` s.d. `kesimpulan`).
   - phase 3: finalisasi (`daftar_pustaka`, `lampiran`, `judul`).
3. Monitor audit log + system alert selama canary.
4. Siapkan rollback cepat ke fallback hardcoded per stage.

### Checklist verifikasi pekerjaan
- [ ] 13 skill sudah tersimpan dan tervalidasi.
- [ ] Aktivasi bertahap terdokumentasi per stage.
- [ ] Prosedur rollback diuji.

### Checklist verifikasi hasil
- [ ] Runtime skill berjalan stabil tanpa menabrak guardrail existing.
- [ ] Operasional admin bisa tuning prompt stage tanpa deploy.

---

## 5) Acceptance Criteria (Gate Formal)

1. Semua operation create/edit/publish/activate/rollback skill hanya bisa dieksekusi oleh role `admin` dan `superadmin`.
2. Publish/activate wajib gagal jika konten skill tidak full English.
3. Prompt runtime memakai skill aktif per stage, dengan fallback otomatis ke hardcoded saat skill unavailable.
4. Policy tool routing existing tetap enforced; skill tidak bisa override.
5. Kontrak `compileDaftarPustaka` `preview|persist` tetap utuh setelah integrasi skill.
6. Semua test baru dan test regresi kritikal lulus.

---

## 6) Rencana Eksekusi yang Direkomendasikan

Urutan eksekusi terbaik:
1. Task 0 -> 1 -> 2 -> 3 (fondasi data + validator).
2. Task 4 (runtime integration) setelah lifecycle dan validator stabil.
3. Task 5 (admin panel) paralel dengan Task 6 (observability).
4. Task 7 (test) wajib sebelum Task 8 rollout/backfill.

Alasan: menghindari UI lebih dulu sebelum guard backend dan validator benar-benar enforce.

---

## 7) Risiko Utama dan Mitigasi

1. Risiko: skill aktif rusak memutus kualitas output stage.
   - Mitigasi: fallback hardcoded + audit log + rollback version.
2. Risiko: admin mengaktifkan skill non-compliant.
   - Mitigasi: validator blocking di publish/activate + English gate.
3. Risiko: drift policy tool-calling antar stage.
   - Mitigasi: conflict audit + system alert + test integrasi router.
4. Risiko: asumsi living outline tidak sinkron antar branch.
   - Mitigasi: verifikasi eksplisit di Task 0 sebelum rollout stage `outline`.

---

## 8) Definition of Done

1. Data model skill lifecycle live di Convex dengan audit trail lengkap.
2. Runtime `paper-mode-prompt` sudah `skill-active-first` dan fallback aman.
3. Admin panel sudah bisa create/edit/publish/activate/rollback skill dengan gate role formal.
4. Validator format + policy + English gate aktif pada publish/activate.
5. 13 stage skill sudah bisa di-backfill dan diaktifkan bertahap dengan checklist verifikasi lulus.
