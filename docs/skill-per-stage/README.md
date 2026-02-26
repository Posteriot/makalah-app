# Desain Skill Per Stage untuk Paper Workflow

Tanggal: 25 Februari 2026
Status: Draft Desain
Scope: Arsitektur prompt/skill untuk paper workflow 13 tahap + manajemen via admin panel

---

## 1) Latar Belakang Berpikir

Makalah AI saat ini sudah punya fondasi workflow 13 tahap yang kuat: ada stage lock, validasi user per tahap, guard backend, dan tool-calling terkontrol. Namun, instruksi perilaku AI per tahap masih dominan hardcoded di kode (`paper-stages/*`, `paper-mode-prompt.ts`).

Konsekuensinya:
1. Setiap perubahan strategi prompt butuh deploy code.
2. Iterasi kualitas prompt lambat karena harus lewat siklus engineering penuh.
3. Tim non-engineering (ops/content/admin) tidak bisa melakukan tuning langsung.
4. Risiko mismatch antar stage meningkat saat perubahan prompt makin sering.

Tujuan desain ini adalah memindahkan kontrol instruksi tahap ke model "skill per stage" yang bisa dikelola dari admin panel, tanpa mengorbankan guardrail runtime yang sudah terbukti stabil.

---

## 2) Masalah Utama yang Mau Diselesaikan

1. Bagaimana membuat instruksi AI per tahap bisa diedit cepat tanpa redeploy?
2. Bagaimana menjaga konsistensi dengan aturan workflow 13 tahap yang sudah ketat?
3. Bagaimana menjaga keamanan, anti-hallucination, dan batasan tool-calling tetap enforced?
4. Bagaimana membuat rollback prompt aman saat kualitas jawaban turun?

---

## 3) Tujuan dan Non-Goal

## 3.1 Tujuan

1. Menyediakan sistem `skill prompt` per stage yang dapat dikelola di admin panel.
2. Mendukung versioning, publish, activate, dan rollback prompt.
3. Menjaga kompatibilitas penuh dengan runtime sekarang (paper session + stage lock + tool routing).
4. Menjaga perubahan bersifat additive, bukan rewrite total.

## 3.2 Non-Goal

1. Tidak mengganti model data `paperSessions` inti.
2. Tidak menghapus guard backend existing (`updateStageData`, `submitForValidation`, `approveStage`).
3. Tidak langsung mengadopsi dependency runtime eksternal marketplace skill.
4. Tidak membuka raw chain-of-thought model ke user.

---

## 4) Kondisi Sistem Saat Ini (Baseline)

1. Urutan resmi 13 tahap disimpan di:
   - `convex/paperSessions/constants.ts`
2. Instruksi per tahap saat ini di-hardcode:
   - `src/lib/ai/paper-stages/foundation.ts`
   - `src/lib/ai/paper-stages/core.ts`
   - `src/lib/ai/paper-stages/results.ts`
   - `src/lib/ai/paper-stages/finalization.ts`
   - Dispatcher: `src/lib/ai/paper-stages/index.ts`
3. Prompt mode paper dirakit di:
   - `src/lib/ai/paper-mode-prompt.ts`
4. Tool paper dibuat di:
   - `src/lib/ai/paper-tools.ts`
5. Guard backend kritikal:
   - Stage mismatch ditolak: `convex/paperSessions.ts`
   - Submit tanpa `ringkasan` ditolak: `convex/paperSessions.ts`
   - Approval tanpa `ringkasan` ditolak: `convex/paperSessions.ts`
6. Constraint teknis penting:
   - `google_search` (provider-defined tool) tidak bisa dicampur dengan function tools dalam 1 request:
   - `src/app/api/chat/route.ts`

Implikasi: skill system baru wajib "nempel" ke arsitektur existing, bukan menggantikan guardrail yang ada.

---

## 5) Prinsip Desain

1. Safety-first: stage lock dan approval gate tetap jadi sumber kebenaran.
2. Configurable behavior: prompt bisa diubah dari admin panel.
3. Deterministic runtime: pemilihan skill berdasarkan stage aktif + policy mode search.
4. Backward-compatible: jika skill DB gagal dimuat, fallback ke prompt hardcoded existing.
5. Auditable: setiap perubahan prompt tercatat versi, author, timestamp, reason.
6. V1 single-skill-per-stage: setiap stage hanya boleh punya satu skill aktif.
7. Language policy: konten skill (frontmatter + body) wajib full English sebagai bahasa utama instruksi model.

---

## 6) Arsitektur Solusi (Skill Registry Internal)

## 6.1 Gambaran Umum

Alih-alih langsung pakai runtime skill eksternal, Makalah AI menggunakan **Skill Registry Internal**:
1. Skill disimpan di database sebagai konfigurasi/versioned content.
2. Runtime mengambil skill aktif berdasarkan stage.
3. Skill content disisipkan ke `paper-mode prompt composer`.
4. Guard backend/tool routing existing tetap berlaku.

## 6.2 Komponen Baru

1. `Skill Catalog`
   - Metadata skill per stage (id, label, stageScope, allowedTools, status).
2. `Skill Version Store`
   - Menyimpan naskah prompt per versi (`draft`, `published`, `active`).
3. `Skill Resolver`
   - Menentukan skill aktif berdasarkan `paperSession.currentStage`.
4. `Prompt Composer Adapter`
   - Menggabungkan base rules global, stage context, dan skill prompt aktif.
5. `Admin Skill Panel`
   - UI untuk create/edit/version/publish/activate/rollback.

## 6.3 Diagram Alur

```mermaid
flowchart LR
  A["User Message"] --> B["Chat Route"]
  B --> C["Fetch Paper Session"]
  C --> D["Resolve Active Stage"]
  D --> E["Resolve Active Skill Prompt"]
  E --> F["Compose Paper Mode Prompt"]
  F --> G["Tool Routing (search or function tools)"]
  G --> H["Model Response"]
  H --> I["Stage Guard + Persist"]
```

---

## 7) Model Data yang Diusulkan

## 7.1 Tabel/Collection Baru (usulan)

1. `stageSkills`
   - `skillId` (string, unique)
   - `name` (string)
   - `description` (string)
   - `stageScope` (enum: `gagasan|topik|...|judul`, unique untuk V1)
   - `allowedTools` (string[])
   - `isEnabled` (boolean)
   - `createdAt`, `updatedAt`

2. `stageSkillVersions`
   - `skillId` (ref ke `stageSkills`)
   - `version` (number)
   - `content` (string, markdown/plain prompt)
   - `changeNote` (string)
   - `status` (enum: `draft|published|active|archived`)
   - `createdBy`, `createdAt`

3. `stageSkillAuditLogs` (wajib)
   - `skillId`, `version`, `action` (`create|publish|activate|rollback`)
   - `actorId`, `metadata`, `createdAt`

## 7.2 Aturan Integritas

1. Satu stage maksimal punya satu version `active`.
2. Aktivasi version baru otomatis menonaktifkan version aktif sebelumnya.
3. Skill `active` wajib non-empty dan lolos validasi minimum format.
4. `allowedTools` tidak boleh melanggar policy runtime existing.
5. Enforce data-level (V1):
   - `stageSkills.stageScope` dibuat unik (satu catalog skill per stage).
   - Aktivasi hanya lewat mutation khusus `activateStageSkillVersion`.
6. Kontrak authorization mutation skill (berlaku untuk create/edit/publish/activate/rollback):
   - Wajib cek authorization dengan `requireRole(db, requestorUserId, "admin")` (berlaku untuk `admin` dan `superadmin`).
   - Ambil active version saat ini untuk `skillId`.
   - Ubah active lama menjadi `published`.
   - Ubah target version menjadi `active`.
   - Jalankan post-condition check: jumlah `active` untuk `skillId` harus tepat 1; jika tidak, throw error.
7. Index minimum yang wajib:
   - `stageSkills.by_stageScope`
   - `stageSkillVersions.by_skillId`
   - `stageSkillVersions.by_skillId_status`

---

## 8) Desain Runtime Integration

## 8.1 Urutan Eksekusi

1. Chat route ambil `paperSession`.
2. Ambil `currentStage`.
3. Resolver cari skill aktif untuk stage tersebut.
4. Jika ditemukan:
   - gunakan skill content sebagai instruksi stage.
5. Jika tidak ditemukan / error:
   - fallback ke instruksi hardcoded existing (`getStageInstructions`).
6. Prompt gabungan tetap melewati policy tool-routing existing.

## 8.2 Titik Integrasi Utama

1. `src/lib/ai/paper-mode-prompt.ts`
   - ganti source stage instructions dari hardcoded-only menjadi:
   - `skill-active-first`, fallback hardcoded.
2. `src/lib/ai/paper-stages/index.ts`
   - tetap dipertahankan sebagai fallback baseline.
3. `src/app/api/chat/route.ts`
   - tidak diubah secara prinsip untuk routing tool; hanya pastikan skill content tidak menabrak constraint routing.

## 8.3 Prioritas Aturan (Wajib, Deterministik)

Urutan prioritas final saat ada konflik:
1. Guard backend database (paling tinggi)
   - contoh: stage mismatch, submit tanpa ringkasan, approval gate.
2. Tool routing/runtime constraints
   - contoh: mode web search tidak bisa mencampur `google_search` dengan function tools dalam request yang sama.
3. System prompt global.
4. Skill prompt per stage.
5. Respons model.

Jika skill prompt bertentangan dengan level 1-3:
1. Instruksi skill dianggap invalid untuk turn tersebut.
2. Runtime tetap mengikuti guard/routing yang berlaku.
3. Event konflik dicatat ke audit log untuk review admin.

## 8.4 Validasi Skill Sebelum Aktivasi

Sebelum `activate`, jalankan validator:
1. Wajib memuat instruksi ringkasan (`ringkasan`) untuk stage yang butuh approval.
2. Tidak boleh memerintahkan bypass guard (`lompat stage`, `skip validation`).
3. Tidak boleh memerintahkan kombinasi tool yang invalid dalam satu request (`google_search` + function tools).
4. Panjang content di bawah batas aman context budget.
5. Jika validator menemukan konflik dengan aturan prioritas runtime, aktivasi ditolak.
6. Konten skill wajib full English; jika terdeteksi dominan non-English, publish/activate ditolak (`reject non-English content`).

---

## 9) Desain Admin Panel

## 9.1 Fitur Inti

1. Daftar stage + status skill aktif.
2. Editor skill prompt (draft).
3. Diff antar versi.
4. Publish draft.
5. Activate versi published.
6. Rollback ke versi sebelumnya.

## 9.2 UX Flow

1. Admin pilih stage (contoh: `pendahuluan`).
2. Admin edit draft prompt.
3. Admin isi `changeNote`.
4. Admin klik `Publish`.
5. Admin review preview metadata.
6. Admin klik `Activate`.

## 9.3 Guard UI

1. Tombol activate disabled jika validasi gagal.
2. Tampilkan warning jika prompt terlalu panjang.
3. Tampilkan warning jika ada kata/frasa forbidden (mis. instruksi bypass validation).
4. Role yang boleh `create`, `edit`, `publish`, `activate`, `rollback`: `superadmin` dan `admin`.

---

## 10) Strategi Kompatibilitas dengan Konsep skills.sh

Makalah AI akan adopsi **konsep dan struktur** skill (modular, reusable, scoped), tapi untuk fase awal runtime tetap internal:

1. Adopt:
   - skill manifest mindset (`name`, `description`, `scope`, `rules`)
   - separation of concern per fase/stage
2. Not adopt yet:
   - dependency langsung ke external skill runtime/marketplace
3. Alasan:
   - menjaga determinisme sistem paper workflow
   - menekan risiko dependency eksternal
   - menjaga compliance guard yang sudah ada
4. Compliance format skill:
   - Gunakan format referensi internal di [skill-format-reference.md](/Users/eriksupit/Desktop/makalahapp/docs/skill-per-stage/skill-format-reference.md) yang menyesuaikan prinsip `skills.sh`.

---

## 11) Risiko dan Mitigasi

| Risiko | Level | Mitigasi |
| --- | --- | --- |
| Prompt admin merusak kualitas respons | Medium | Versioning + rollback cepat + preview validator |
| Instruksi skill bertabrakan dengan guard backend | Medium | Validator forbidden patterns + guard backend tetap final authority |
| Peningkatan token context | Medium | hard cap length + context budget monitor existing |
| Drift antar stage (style tidak konsisten) | Medium | template skill standar + review checklist sebelum activate |
| Human error saat activate | Low-Medium | audit log + konfirmasi ganda di UI |

---

## 12) Rollout Plan Bertahap

1. Fase 1 (Foundational)
   - Schema + API CRUD + versioning
   - Resolver + fallback hardcoded
2. Fase 2 (Admin Control)
   - UI editor + publish/activate/rollback
   - validator minimum
3. Fase 3 (Operational Hardening)
   - audit log
   - metric dashboard per stage-skill
   - quality gate otomatis

## 12.1 Bootstrap & Backfill Baseline (Wajib Sebelum Go-Live)

1. Seed 13 skill catalog berdasarkan stage resmi (`gagasan` s/d `judul`).
2. Migrasi konten instruksi hardcoded existing ke `stageSkillVersions` versi `v1`.
3. Set semua versi `v1` sebagai `active` agar perilaku awal setara baseline saat ini.
4. Jalankan smoke-check:
   - resolver menemukan skill aktif untuk semua 13 stage.
   - fallback hardcoded hanya dipakai jika query skill gagal (bukan karena data kosong).
5. Simpan snapshot hash konten baseline untuk kebutuhan diff/rollback.

---

## 13) Acceptance Criteria Desain

Desain dianggap siap implementasi jika:
1. Skill aktif per stage bisa dimuat runtime tanpa memutus fallback.
2. Admin bisa edit, publish, activate, rollback prompt per stage.
3. Guard existing (stage lock, approval, tool-routing constraint) tetap tidak berubah.
4. Ada audit trail jelas untuk setiap perubahan prompt.
5. Kegagalan baca skill DB tidak memblokir chat (graceful fallback).
6. Create/edit versi prompt hanya bisa dilakukan oleh role `superadmin` dan `admin`, dan pembatasan ini enforced di API/backend serta UI.
7. Aktivasi versi prompt hanya bisa dilakukan oleh role `superadmin` dan `admin`, dan pembatasan ini enforced di API/backend serta UI.
8. Validator bahasa berjalan aktif dan menolak skill non-English sebelum publish/activate.

---

## 14) Dampak ke File/Modul (Rencana)

1. `convex/schema.ts`
   - tambah collection skill + version + audit.
2. `convex/*` (baru)
   - query/mutation CRUD skill prompt.
3. `src/lib/ai/paper-mode-prompt.ts`
   - integrasi resolver skill aktif.
4. `src/app/api/admin/*` atau `src/components/admin/*`
   - panel manajemen skill prompt.
5. `src/lib/ai/paper-stages/*`
   - tetap dipakai sebagai fallback baseline.

---

## 15) Open Questions (Harus Diputuskan Sebelum Implementasi)

1. V1 sudah diputuskan single-skill-per-stage. Kapan evaluasi multi-skill composition dilakukan (mis. setelah 2-4 minggu telemetry)?
2. Perlu approval dua langkah untuk activate production?
3. Apakah preview testing wajib terhadap dataset percakapan uji sebelum activation?

---

## 16) Referensi

1. Internal codebase:
   - `convex/paperSessions/constants.ts`
   - `convex/paperSessions.ts`
   - `src/lib/ai/paper-tools.ts`
   - `src/lib/ai/paper-mode-prompt.ts`
   - `src/lib/ai/paper-stages/index.ts`
   - `src/app/api/chat/route.ts`
2. Studi konsep skill:
   - https://skills.sh/docs
   - https://github.com/vercel-labs/skills
   - https://developers.openai.com/codex/skills
3. Referensi format skill internal:
   - [skill-format-reference.md](/Users/eriksupit/Desktop/makalahapp/docs/skill-per-stage/skill-format-reference.md)
