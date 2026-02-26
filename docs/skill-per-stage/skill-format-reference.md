# Referensi Format Skill (Adaptasi untuk Makalah AI)

Tanggal: 26 Februari 2026
Status: Reference Draft (siap dipakai sebagai acuan implementasi)
Ruang lingkup: Format skill per stage untuk workflow 13 tahap + integrasi admin panel

---

## 1) Tujuan Dokumen

Dokumen ini menjelaskan format skill yang akan diadaptasi untuk Makalah AI dengan dua target:
1. Tetap kompatibel dengan pola umum `SKILL.md` dari ekosistem `skills.sh`.
2. Tetap cocok dengan arsitektur internal Makalah AI (stage lock, tool routing, dan guard backend).

Dokumen ini melengkapi desain utama di [README.md](/Users/eriksupit/Desktop/makalahapp/docs/skill-per-stage/README.md).

---

## 2) Baseline dari skills.sh (yang diadopsi)

Berdasarkan dokumentasi `skills.sh` dan README `vercel-labs/skills`:
1. Skill berbentuk direktori yang minimal berisi file `SKILL.md`.
2. `SKILL.md` menggunakan YAML frontmatter + markdown body.
3. Frontmatter minimal: `name` dan `description`.
4. Ada optional field tertentu seperti `metadata.internal`.

Contoh baseline minimal:

```md
---
name: my-skill
description: What this skill does and when to use it
---

My Skill

Instructions for the agent to follow when this skill is activated.
```

Referensi:
1. https://skills.sh/docs
2. https://github.com/vercel-labs/skills

---

## 3) Keputusan Adaptasi Makalah AI (Format V1)

## 3.1 Prinsip V1

1. V1 tetap pakai pola `SKILL.md` supaya mudah dipahami tim dan portable.
2. Runtime produksi Makalah AI tetap pakai **Skill Registry Internal** (database + admin panel), bukan load file langsung dari filesystem saat inferensi.
3. Struktur isi skill dipaksa konsisten antar stage agar aman untuk editor admin.
4. Language policy wajib: seluruh konten skill (`name`, `description`, heading, instruction body) harus full English.

## 3.2 Format Berkas Referensi Skill (Git/Repo)

Direktori skill per stage (referensi authoring):

```text
<stage-id>-skill/
└── SKILL.md
```

Format `SKILL.md` yang dipakai:

```md
---
name: <stage-id>-skill
description: Stage instruction for <stage-id> in Makalah AI paper workflow. Use when currentStage = <stage-id>.
metadata:
  internal: true
---

Skill Stage: <Label Stage>

## Objective
Define the stage goal and the expected outcome.

## Input Context
List the minimum context that must be read before responding.

## Tool Policy
Define allowed and disallowed tools for this stage.

## Output Contract
Define required output fields for this stage.

## Guardrails
List hard constraints that must never be violated.

## Done Criteria
Define conditions that make this stage ready for validation.
```

Catatan:
1. `name` dan `description` wajib.
2. `metadata.internal: true` direkomendasikan agar skill ini dianggap internal.
3. Field lain di frontmatter tidak dijadikan ketergantungan runtime V1.
4. Seluruh isi skill wajib full English; konten campuran/non-English ditolak oleh validator publish/activate.

---

## 4) Format Internal yang Dipakai Runtime/Admin Panel

Walau referensi authoring berbasis `SKILL.md`, sistem runtime menggunakan format data internal:

## 4.1 Stage Skill Catalog

```ts
type StageSkill = {
  skillId: string
  stageScope: "gagasan" | "topik" | "outline" | "abstrak" | "pendahuluan" | "tinjauan_literatur" | "metodologi" | "hasil" | "diskusi" | "kesimpulan" | "daftar_pustaka" | "lampiran" | "judul"
  name: string
  description: string
  isEnabled: boolean
  allowedTools: string[]
  createdAt: number
  updatedAt: number
}
```

## 4.2 Stage Skill Version

```ts
type StageSkillVersion = {
  skillId: string
  version: number
  content: string
  status: "draft" | "published" | "active" | "archived"
  changeNote: string
  createdBy: string
  createdAt: number
}
```

---

## 5) Mapping Nama Skill untuk 13 Tahap

Naming convention V1:
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

Aturan:
1. Satu stage = satu skill aktif (V1).
2. Skill harus eksplisit menyebut stage target di `description`.

---

## 6) Kontrak Isi Body Skill per Stage (Wajib)

Agar editor admin konsisten dan aman, body skill wajib memuat blok berikut:
1. `Objective`
2. `Input Context`
3. `Tool Policy`
4. `Output Contract`
5. `Guardrails`
6. `Done Criteria`

Template ringkas:

```md
## Objective
...

## Input Context
...

## Tool Policy
Allowed:
- ...
Disallowed:
- ...

## Output Contract
- ringkasan: required, max 280
- ringkasanDetail: optional, max 1000
- ...

## Guardrails
- Never jump across stages
- Never submit without explicit user confirmation
- ...

## Done Criteria
- User gives explicit confirmation
- All required fields are present
```

---

## 7) Validasi Format Sebelum Publish/Activate

Validator minimum V1:
1. Frontmatter memiliki `name` dan `description`.
2. `description` menyebut stage target.
3. Body memiliki 6 blok wajib (Objective sampai Done Criteria).
4. Tidak ada instruksi yang melanggar guard runtime:
   - bypass stage lock
   - submit tanpa ringkasan
   - mencampur `google_search` dan function tools dalam satu request
5. Panjang `content` tidak melewati batas context budget internal.
6. Reject non-English content:
   - gunakan language detector pada `description` + body text.
   - jika confidence English di bawah threshold (mis. < 0.90), status validasi gagal.
   - pengecualian hanya untuk proper noun, stage ID, nama tool/API, dan schema field keys.

---

## 8) Contoh Skill Siap Pakai (Stage Pendahuluan)

```md
---
name: pendahuluan-skill
description: Stage instruction for pendahuluan in Makalah AI paper workflow. Use when currentStage = pendahuluan.
metadata:
  internal: true
---

Skill Stage: Introduction

## Objective
Write a clear introduction section: background, problem statement, research gap, research objective, significance, and hypothesis when relevant.

## Input Context
Read the previous stage summary, stored references in stageData, and the latest user feedback.

## Tool Policy
Allowed:
- google_search (when recent facts or evidence are required)
- updateStageData
- createArtifact
- submitStageForValidation (only after explicit user confirmation)
Disallowed:
- Jumping to another stage
- Submitting when summary is missing

## Output Contract
- summary (required, max 280)
- latarBelakang
- rumusanMasalah
- researchGapAnalysis
- tujuanPenelitian
- signifikansiPenelitian
- hipotesis (opsional)
- sitasiAPA

## Guardrails
- Never fabricate references.
- Never use a domain name as citation author.
- Never submit without explicit user confirmation.

## Done Criteria
- User confirms the stage content is acceptable.
- Required fields are stored.
- Stage is ready for validation.
```

---

## 9) Aturan Perubahan Format

1. Perubahan format major harus update dokumen ini + design doc utama.
2. Perubahan format harus backward-compatible untuk skill versi aktif.
3. Semua perubahan format wajib punya migration note.

---

## 10) Referensi

1. `skills.sh` docs: https://skills.sh/docs
2. `vercel-labs/skills` README: https://github.com/vercel-labs/skills
3. Design utama skill-per-stage: [README.md](/Users/eriksupit/Desktop/makalahapp/docs/skill-per-stage/README.md)
