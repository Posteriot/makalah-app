# Design Doc Pemakaian Skill di Workflow 13 Stage

Tanggal: 26 Februari 2026
Status: Draft Implementable
Scope: Integrasi runtime skill package ke paper workflow 13 tahap di Makalah AI

---

## Update Implementasi Runtime (26 Februari 2026)

Runtime `compileDaftarPustaka` sudah implemented dengan kontrak final:
1. `mode: "preview"` boleh dipanggil lintas stage untuk audit referensi tanpa persist.
2. `mode: "persist"` hanya valid saat `currentStage = daftar_pustaka`.
3. Chat route sudah memiliki compile-intent override agar request compile tidak terkunci `google_search`-only mode.
4. Skill design harus menganggap kontrak ini sebagai fixed runtime behavior (bukan draft usulan).

Referensi implementasi:
1. `docs/skill-per-stage/2026-02-26-implementation-plan-compile-daftar-pustaka-preview-persist.md`
2. `docs/skill-per-stage/2026-02-26-execution-log-compile-daftar-pustaka.md`

---

## 1) Ringkasan

Dokumen ini menjelaskan desain implementasi untuk memakai paket skill per stage (`docs/skill-per-stage/skills/*/SKILL.md`) ke runtime chat paper workflow 13 tahap.

Fokus utama:
1. Runtime memilih skill aktif berdasarkan `currentStage`.
2. Prompt stage tidak lagi hanya hardcoded, tetapi `skill-active-first` dengan fallback aman.
3. Guard backend existing tetap jadi authority tertinggi.
4. Aktivasi skill dari admin panel mengikuti RBAC + validasi format + validasi bahasa English.

Dokumen ini melanjutkan:
1. `docs/skill-per-stage/README.md`
2. `docs/skill-per-stage/skill-format-reference.md`
3. `docs/skill-per-stage/skills/verification-audit.md`

---

## 2) Latar Belakang Teknis

Saat ini, instruksi stage berada di `src/lib/ai/paper-stages/*` dan di-inject lewat `src/lib/ai/paper-mode-prompt.ts`.

Kelemahan model hardcoded-only:
1. Revisi prompt butuh deploy.
2. Iterasi kualitas per stage lambat.
3. Admin tidak bisa tuning langsung tanpa engineering cycle.

Sementara itu, fondasi workflow sudah kuat:
1. Urutan stage terkunci di `convex/paperSessions/constants.ts`.
2. Update stage dibatasi oleh `currentStage` di `convex/paperSessions.ts`.
3. Submit/approve mewajibkan `ringkasan`.
4. Tool routing memisahkan `google_search` dari function tools dalam satu request (`src/app/api/chat/route.ts`).

Jadi desain ini harus menambahkan fleksibilitas prompt tanpa mengubah aturan inti workflow.

---

## 3) Tujuan dan Non-Goal

## 3.1 Tujuan

1. Runtime dapat resolve skill berdasarkan stage aktif (`<stage>-skill`).
2. Skill aktif dapat diganti via admin panel tanpa redeploy.
3. Skill content wajib full English dan tervalidasi sebelum aktif.
4. Perilaku tahap tetap konsisten dengan schema output stage dan policy tool routing.

## 3.2 Non-Goal

1. Tidak mengganti state machine stage di `paperSessions`.
2. Tidak menghapus prompt hardcoded fallback.
3. Tidak mengubah batasan provider tool routing saat ini.
4. Tidak mengubah kontrak UI approval stage (`Approve & Lanjut` / `Revisi`).

---

## 4) Paket Skill yang Dipakai

Paket skill siap pakai ada di:
1. `docs/skill-per-stage/skills/README.md`
2. `docs/skill-per-stage/skills/*-skill/SKILL.md`

Daftar skill ID (V1):
1. `gagasan-skill`
2. `topik-skill`
3. `outline-skill`
4. `abstrak-skill`
5. `pendahuluan-skill`
6. `tinjauan-literatur-skill`
7. `metodologi-skill`
8. `hasil-skill`
9. `diskusi-skill`
10. `kesimpulan-skill`
11. `daftar-pustaka-skill`
12. `lampiran-skill`
13. `judul-skill`

Mapping ke stage `snake_case` backend:
1. `tinjauan-literatur-skill` -> `tinjauan_literatur`
2. `daftar-pustaka-skill` -> `daftar_pustaka`
3. skill lain map 1:1 by slug.

---

## 5) Arsitektur Runtime (High Level)

```mermaid
flowchart LR
  U["User Message"] --> R["Chat Route"]
  R --> S["Fetch paper session"]
  S --> M["Resolve stage -> skillId"]
  M --> V["Fetch active skill version"]
  V --> C["Compose paper mode prompt"]
  C --> T["Tool routing (search/function)"]
  T --> LLM["streamText"]
  LLM --> G["Backend stage guards"]
  G --> P["Persist message + stage data"]
```

Prinsip prioritas aturan:
1. Backend guards (Convex mutation/query contract)
2. Tool routing constraints
3. System prompt global
4. Active stage skill content
5. Model response

---

## 6) Komponen Baru yang Dibutuhkan

## 6.1 Data Model (Convex)

Tambahan collection:
1. `stageSkills`
2. `stageSkillVersions`
3. `stageSkillAuditLogs`

Kunci integritas:
1. Satu `stageScope` hanya satu skill catalog.
2. Satu `skillId` hanya satu versi `active`.
3. Aktivasi harus atomik dalam satu mutation.

## 6.2 Runtime Service

Tambahkan service baru, contoh:
1. `src/lib/ai/stage-skill-resolver.ts`
2. `src/lib/ai/stage-skill-validator.ts`
3. `src/lib/ai/stage-skill-language.ts`

Tanggung jawab:
1. Resolve skill aktif dari `currentStage`.
2. Validasi compliance skill sebelum publish/activate.
3. Sediakan fallback saat data skill unavailable.

## 6.3 Admin API

Mutation/query baru (nama contoh):
1. `stageSkills.listByStage`
2. `stageSkills.createOrUpdateDraft`
3. `stageSkills.publishVersion`
4. `stageSkills.activateVersion`
5. `stageSkills.rollbackVersion`

RBAC:
1. Semua operasi create/edit/publish/activate/rollback wajib `requireRole(db, requestorUserId, "admin")`.
2. Karena hierarchy role, gate ini hanya mengizinkan `admin` dan `superadmin`.

Kontrak data editor admin (selaras pola `systemPrompts` existing):
1. Sumber data utama editor adalah field terstruktur: `name`, `description`, `stageScope`, `contentBody`.
2. `SKILL.md` + frontmatter diperlakukan sebagai format import/export, bukan format edit utama di admin panel.
3. Jika admin melakukan import raw `SKILL.md`, frontmatter `name` dan `description` tetap wajib dan harus lolos normalisasi ke field terstruktur.

---

## 7) Runtime Flow Detail per Request

## 7.1 Resolve dan Compose

Di `getPaperModeSystemPrompt`:
1. Ambil `paperSession`.
2. Baca `currentStage`.
3. `stage -> skillId` (mis. `pendahuluan -> pendahuluan-skill`).
4. Query active skill version.
5. Jika ada: inject skill content.
6. Jika tidak ada/error: fallback ke `getStageInstructions(stage)`.

Output prompt akhir tetap menyertakan:
1. state session (`currentStage`, `stageStatus`)
2. stage data formatted
3. guardrails global paper mode
4. skill content (atau fallback hardcoded)

## 7.2 Tool Routing Tetap Dipertahankan

`src/app/api/chat/route.ts` tetap jadi sumber keputusan mode:
1. active stages: `gagasan, topik, pendahuluan, tinjauan_literatur, metodologi, diskusi`
2. passive stages: `outline, abstrak, hasil, kesimpulan, daftar_pustaka, lampiran, judul`
3. compile intent (`compileDaftarPustaka`) memaksa function-tools mode agar compile bisa dieksekusi saat user memintanya.

Skill tidak boleh override router.
Jika skill bertentangan dengan router:
1. router menang
2. log conflict ke `stageSkillAuditLogs` (action: `runtime_conflict`)
3. kirim alert ke `systemAlerts` agar terlihat di dashboard operasional admin

---

## 8) Kontrak Validasi Publish/Activate Skill

Sebelum publish/activate, validator menjalankan gate berikut:
1. Payload terstruktur wajib punya: `name`, `description`, `stageScope`, `contentBody`.
2. Jika sumber input berupa raw `SKILL.md`, frontmatter `name` dan `description` wajib ada lalu dinormalisasi ke payload terstruktur.
3. Skill ID wajib mengikuti pola `<stage>-skill`.
4. Body wajib punya blok:
   - `Objective`
   - `Input Context`
   - `Tool Policy`
   - `Output Contract`
   - `Guardrails`
   - `Done Criteria`
5. Bahasa wajib English (description + body).
6. Tidak ada frasa forbidden yang melanggar guard runtime.
7. Panjang content tidak melebihi budget prompt stage.
8. Output keys di `Output Contract` wajib subset dari whitelist backend `STAGE_KEY_WHITELIST` di `convex/paperSessions.ts` (source of truth runtime).
9. `src/lib/paper/stage-types.ts` dipakai sebagai referensi authoring tambahan, bukan authority runtime.

Jika salah satu gagal:
1. status validasi `failed`
2. activate ditolak
3. error reason tampil di admin panel

---

## 9) Stage Contract Matrix (Runtime Reference)

| Stage | Skill ID | Search Policy | compileDaftarPustaka Policy | Output Keys (minimum) |
| --- | --- | --- | --- | --- |
| gagasan | gagasan-skill | active | `preview` allowed, `persist` disallowed | ringkasan, ideKasar, analisis, angle, novelty, referensiAwal |
| topik | topik-skill | active | `preview` allowed, `persist` disallowed | ringkasan, definitif, angleSpesifik, argumentasiKebaruan, researchGap, referensiPendukung |
| outline | outline-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, sections, totalWordCount, completenessScore |
| abstrak | abstrak-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, ringkasanPenelitian, keywords, wordCount |
| pendahuluan | pendahuluan-skill | active | `preview` allowed, `persist` disallowed | ringkasan, latarBelakang, rumusanMasalah, researchGapAnalysis, tujuanPenelitian, signifikansiPenelitian, sitasiAPA |
| tinjauan_literatur | tinjauan-literatur-skill | active | `preview` allowed, `persist` disallowed | ringkasan, kerangkaTeoretis, reviewLiteratur, gapAnalysis, justifikasiPenelitian, referensi |
| metodologi | metodologi-skill | active | `preview` allowed, `persist` disallowed | ringkasan, pendekatanPenelitian, desainPenelitian, metodePerolehanData, teknikAnalisis, alatInstrumen, etikaPenelitian |
| hasil | hasil-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, temuanUtama, metodePenyajian, dataPoints |
| diskusi | diskusi-skill | active | `preview` allowed, `persist` disallowed | ringkasan, interpretasiTemuan, perbandinganLiteratur, implikasiTeoretis, implikasiPraktis, keterbatasanPenelitian, saranPenelitianMendatang |
| kesimpulan | kesimpulan-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, ringkasanHasil, jawabanRumusanMasalah, implikasiPraktis, saranPraktisi, saranPeneliti, saranKebijakan |
| daftar_pustaka | daftar-pustaka-skill | passive | `preview` allowed, `persist` mandatory for final compile | ringkasan, entries, totalCount, incompleteCount, duplicatesMerged |
| lampiran | lampiran-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, items, tidakAdaLampiran, alasanTidakAda |
| judul | judul-skill | passive | `preview` allowed, `persist` disallowed | ringkasan, opsiJudul, judulTerpilih, alasanPemilihan |

---

## 10) Error Handling dan Fallback

## 10.1 Fallback Wajib

Jika resolver gagal:
1. pakai hardcoded instructions (`paper-stages/*`)
2. set telemetry flag `skillResolverFallback=true`
3. tulis alert non-blocking ke `systemAlerts` (contoh `alertType: stage_skill_resolver_fallback`)

## 10.2 Conflict Handling

Jika skill menyuruh aksi yang bertentangan dengan guard/router:
1. aksi ditolak runtime
2. sistem lanjut dengan aturan valid
3. audit log menyimpan context conflict (`stageSkillAuditLogs`)
4. kirim alert ke `systemAlerts` (contoh `alertType: stage_skill_runtime_conflict`)

---

## 11) Observability dan QA Gates

Metrics minimum:
1. `skill_resolver_hit_rate`
2. `skill_resolver_fallback_rate`
3. `skill_validation_fail_count`
4. `stage_runtime_conflict_count`
5. `approve_success_rate_by_stage_after_skill_activation`

Alert channel minimum:
1. `stage_skill_resolver_fallback` tercatat di `systemAlerts`.
2. `stage_skill_runtime_conflict` tercatat di `systemAlerts`.
3. Detail event teknis tetap tersimpan di `stageSkillAuditLogs`.

QA gates pra-aktivasi:
1. lint markdown lulus
2. format validator lulus
3. language validator lulus
4. dry-run check untuk 13 stage matrix
5. sampled conversation replay (minimal 2 per stage)

---

## 12) Rencana Implementasi Bertahap

1. Phase A - Infrastructure
   - schema + indexes + base CRUD
   - resolver + fallback wiring
2. Phase B - Admin Activation Path
   - validator pipeline + RBAC + audit logs
   - preview panel + activate flow
3. Phase C - Runtime Hardening
   - telemetry + alerts + conflict logging
   - replay tests and regression suite
4. Phase D - Rollout
   - canary activation (2-3 stages)
   - full 13-stage activation after stability

---

## 13) Acceptance Criteria

Desain dianggap siap implementasi bila:
1. Skill aktif bisa dipakai runtime untuk semua 13 stage.
2. Guard core (`stage lock`, `ringkasan required`, `tool routing constraints`) tetap tidak berubah.
3. Fallback hardcoded berjalan saat skill store bermasalah.
4. Publish/activate ditolak jika skill non-English.
5. Create/edit/publish/activate/rollback hanya untuk role `admin` dan `superadmin`.
6. Validasi `Output Contract` mengacu ke whitelist backend `convex/paperSessions.ts` sebelum aktivasi.
7. Audit log tercatat untuk semua aksi penting (create, edit, publish, activate, rollback, runtime_conflict).
8. Event fallback/conflict juga tercatat di `systemAlerts` untuk monitoring admin panel.

---

## 14) Referensi

1. `docs/skill-per-stage/README.md`
2. `docs/skill-per-stage/skill-format-reference.md`
3. `docs/skill-per-stage/skills/verification-audit.md`
4. `convex/paperSessions/constants.ts`
5. `convex/paperSessions.ts`
6. `convex/permissions.ts`
7. `convex/systemAlerts.ts`
8. `src/app/api/chat/route.ts`
9. `src/lib/ai/paper-mode-prompt.ts`
10. `src/lib/paper/stage-types.ts`
11. https://skills.sh/docs
12. https://github.com/vercel-labs/skills
