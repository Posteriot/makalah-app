# Katalog Stage Skills

Makalah AI membagi kecerdasan AI ke dalam **Stage Skills**, yaitu modul instruksi spesifik yang aktif hanya pada tahap penulisan tertentu. Pendekatan ini memastikan AI tetap fokus pada tugas spesifik stagenya tanpa terdistraksi oleh aturan dari tahap lain.

Arsitektur skill menggunakan **dua tabel terpisah** di Convex:

**Tabel `stageSkills`** (registry/metadata):
- **`skillId`**: Identifier unik (misal: `pendahuluan-skill`).
- **`stageScope`**: Hubungan skill dengan salah satu dari 14 stage penulisan.
- **`name`** dan **`description`**: Label dan deskripsi skill untuk admin panel.
- **`allowedTools`**: Daftar putih (*whitelist*) alat bantu yang boleh dipanggil oleh AI (misal: `updateStageData`, `createArtifact`).
- **`isEnabled`**: Flag boolean untuk mengaktifkan/menonaktifkan skill.

**Tabel `stageSkillVersions`** (konten instruksi yang diversi):
- **`content`**: Instruksi detail tentang bagaimana AI harus berperilaku, gaya penulisan yang diharapkan, dan logika penalaran spesifik stage tersebut.
- **`version`**: Nomor versi incremental.
- **`status`**: `draft` | `published` | `active` | `archived`.

## Kebijakan Pencarian (Search Policy)

Tiap stage memiliki kebijakan pencarian sumber yang berbeda untuk menjaga relevansi data:

1.  **Active Search**: AI secara aktif didorong untuk melakukan pencarian web guna mengeksplorasi informasi baru.
    - Berlaku pada stage: `gagasan`, `tinjauan_literatur`.
2.  **Passive Search**: AI menggunakan data yang sudah ada di konteks (dari stage sebelumnya atau unggahan user) dan hanya melakukan pencarian jika benar-benar diperlukan untuk verifikasi fakta.
    - Berlaku pada stage: `topik`, `outline`, `abstrak`, `pendahuluan`, `metodologi`, `hasil`, `diskusi`, `kesimpulan`, `pembaruan_abstrak`, `daftar_pustaka`, `lampiran`, `judul`.

## Daftar 14 Stage Skills

Berikut adalah pemetaan kemampuan AI berdasarkan urutan pengerjaan paper:

| No | Stage | Skill ID | Fokus Kemampuan |
|:---|:---|:---|:---|
| 1 | Gagasan | `gagasan-skill` | Eksplorasi ide awal dan validasi urgensi riset. |
| 2 | Topik | `topik-skill` | Penajaman judul dan rumusan masalah. |
| 3 | Outline | `outline-skill` | Penyusunan struktur bab dan subbab secara logis. |
| 4 | Abstrak | `abstrak-skill` | Penulisan ringkasan awal (Drafting). |
| 5 | Pendahuluan | `pendahuluan-skill` | Latar belakang, motivasi, dan kebaruan riset. |
| 6 | Tinjauan Literatur | `tinjauan-literatur-skill` | Sintesis sumber referensi dan pemetaan teori. |
| 7 | Metodologi | `metodologi-skill` | Penjelasan teknis prosedur dan alat riset. |
| 8 | Hasil | `hasil-skill` | Penyajian data dan temuan riset secara objektif. |
| 9 | Diskusi | `diskusi-skill` | Interpretasi hasil dan perbandingan dengan teori. |
| 10| Kesimpulan | `kesimpulan-skill` | Rangkuman temuan dan saran pengembangan. |
| 11| Pembaruan Abstrak | `pembaruan-abstrak-skill` | Penyelarasan abstrak dengan hasil diskusi akhir. |
| 12| Daftar Pustaka | `daftar-pustaka-skill` | Standarisasi format sitasi dan kelengkapan sumber. |
| 13| Lampiran | `lampiran-skill` | Manajemen data pendukung dan dokumen tambahan. |
| 14| Judul | `judul-skill` | Finalisasi judul yang paling representatif. |

## Standar Penulisan & Integritas

Secara sistemik, setiap skill dirancang untuk memastikan AI menghasilkan narasi akademik yang mengalir secara alami (mencegah **"Tulisan robotik"**) dan mampu melakukan **"Konverter gaya bahasa"** dari data mentah menjadi teks profesional. 

Fokus utama instruksi gaya di tingkat skill meliputi:
- **Narrative Elaboration**: Mengembangkan argumen kebaruan menjadi narasi akademik yang kuat.
- **Synthesis over Summary**: Skill seperti `tinjauan-literatur-skill` diwajibkan melakukan sintesis antar sumber, bukan sekadar meringkas satu per satu.
- **Zero Hallucination**: Larangan keras terhadap pembuatan sitasi fiktif atau data tanpa dasar hasil pencarian.

## Referensi Kode
- `convex/stageSkills.ts`: Manajemen skill di database.
- `convex/stageSkills/constants.ts`: Daftar stage, `ACTIVE_SEARCH_STAGES`, `PASSIVE_SEARCH_STAGES`, dan fungsi `toSkillId()`. Mirror dari source runtime (dibaca Convex saja).
- `src/lib/ai/stage-skill-contracts.ts`: **Source of truth runtime** untuk `ACTIVE_SEARCH_STAGES` dan `PASSIVE_SEARCH_STAGES` — digunakan langsung oleh `resolve-search-decision.ts`.
- `src/lib/ai/stage-skill-validator.ts`: Validasi format instruksi sebelum di-publish.

---
**Lihat Juga:**
- [Orkestrasi Instruction Stack](./orchestration.md)
- [Runtime Enforcers](./runtime-enforcers.md)
