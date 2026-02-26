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

## 3.2 Format Berkas Referensi Skill (Git/Repo)

Direktori skill per stage (referensi authoring):

```text
skill-stage-<stage-id>/
└── SKILL.md
```

Format `SKILL.md` yang dipakai:

```md
---
name: stage-<stage-id>
description: Instruksi stage <stage-id> untuk workflow paper Makalah AI. Gunakan saat currentStage = <stage-id>.
metadata:
  internal: true
---

Skill Stage: <Label Stage>

## Objective
Tujuan tahap dan outcome yang harus dicapai.

## Input Context
Konteks minimum yang harus dibaca sebelum menjawab.

## Tool Policy
Aturan tool yang boleh/tidak boleh dipakai.

## Output Contract
Field output yang wajib ada untuk stage ini.

## Guardrails
Larangan yang tidak boleh dilanggar.

## Done Criteria
Kondisi tahap dianggap siap submit validasi.
```

Catatan:
1. `name` dan `description` wajib.
2. `metadata.internal: true` direkomendasikan agar skill ini dianggap internal.
3. Field lain di frontmatter tidak dijadikan ketergantungan runtime V1.

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
1. `stage-gagasan`
2. `stage-topik`
3. `stage-outline`
4. `stage-abstrak`
5. `stage-pendahuluan`
6. `stage-tinjauan-literatur`
7. `stage-metodologi`
8. `stage-hasil`
9. `stage-diskusi`
10. `stage-kesimpulan`
11. `stage-daftar-pustaka`
12. `stage-lampiran`
13. `stage-judul`

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
- ringkasan: wajib, max 280
- ringkasanDetail: opsional, max 1000
- ...

## Guardrails
- Dilarang lompat stage
- Dilarang submit tanpa konfirmasi user
- ...

## Done Criteria
- User eksplisit konfirmasi puas
- Semua field wajib sudah ada
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

---

## 8) Contoh Skill Siap Pakai (Stage Pendahuluan)

```md
---
name: stage-pendahuluan
description: Instruksi tahap pendahuluan untuk workflow paper Makalah AI. Gunakan saat currentStage = pendahuluan.
metadata:
  internal: true
---

Skill Stage: Pendahuluan

## Objective
Menyusun pendahuluan yang jelas: latar belakang, rumusan masalah, research gap, tujuan, signifikansi, dan hipotesis (jika relevan).

## Input Context
Baca ringkasan tahap sebelumnya, referensi tersimpan di stageData, dan feedback terbaru user.

## Tool Policy
Allowed:
- google_search (saat butuh data/fakta terbaru)
- updateStageData
- createArtifact
- submitStageForValidation (hanya setelah user konfirmasi eksplisit)
Disallowed:
- Lompat ke stage lain
- Submit saat ringkasan belum tersedia

## Output Contract
- ringkasan (wajib, max 280)
- latarBelakang
- rumusanMasalah
- researchGapAnalysis
- tujuanPenelitian
- signifikansiPenelitian
- hipotesis (opsional)
- sitasiAPA

## Guardrails
- Jangan mengarang referensi.
- Jangan gunakan domain sebagai author sitasi.
- Jangan submit tanpa konfirmasi eksplisit user.

## Done Criteria
- User menyatakan isi tahap sudah sesuai.
- Field wajib sudah tersimpan.
- Siap dikirim ke validasi.
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
