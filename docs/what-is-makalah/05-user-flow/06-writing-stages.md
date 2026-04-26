# Tahap Penulisan (Writing Stages)

Tahap Penulisan (Stage 4-11) adalah fase di mana Makalah AI menghasilkan konten sesungguhnya dari paper tersebut. Pada fase ini, perilaku AI bergeser dari rekan diskusi menjadi **Penulis Akademik** yang disiplin.

## Karakteristik Tahap Penulisan

Berbeda dengan tahap persiapan, tahap penulisan memiliki aturan main yang lebih ketat:

1.  **Berbasis Kontrak (Outline-Driven)**: AI wajib mengikuti struktur bab dan alokasi kata (*word budget*) yang telah disepakati di Stage 3 (Outline).
2.  **Integritas Sitasi**: AI diizinkan kembali menggunakan *Source Tools* (`inspectSourceDocument`, `quoteFromSource`) untuk memastikan setiap klaim akademik didukung oleh referensi yang valid dengan format APA.
3.  **Narrative Elaboration**: AI tidak langsung menulis artifak. AI harus mengusulkan pendekatan narasi (*narrative approach*) terlebih dahulu melalui *Choice Card* sebelum pengguna mengizinkan penulisan draf final.

## Daftar Tahap Penulisan

*   **Stage 4: Abstrak** — Ringkasan singkat seluruh rencana penelitian (150-300 kata).
*   **Stage 5: Pendahuluan** — Latar belakang, rumusan masalah, dan tujuan penelitian.
*   **Stage 6: Tinjauan Literatur** — Pemetaan teori dan penelitian terdahulu (Tahap paling intensif sitasi).
*   **Stage 7: Metodologi** — Penjelasan desain dan teknik analisis data.
*   **Stage 8: Hasil** — Presentasi temuan penelitian.
*   **Stage 9: Diskusi** — Interpretasi hasil dan perbandingannya dengan teori.
*   **Stage 10: Kesimpulan** — Jawaban atas rumusan masalah dan saran.
*   **Stage 11: Pembaruan Abstrak** — Sinkronisasi abstrak awal dengan temuan akhir penelitian.

## Integritas Akademik (Audit Forensik)

Sistem menerapkan *Guardrails* khusus untuk menjaga kualitas tulisan:

- **Narrative Elaboration**: AI wajib menawarkan 2-3 pendekatan narasi melalui *Choice Card* sebelum menulis draf (L47, L182 di core.ts).
- **APA Citation Discipline**: Larangan keras penggunaan sitasi fiktif atau *placeholder* seperti "(Penulis, Tahun)". Wajib menggunakan data asli dari web search (L152-167).
- **Evidence Breadth**: Stage 6 (Tinjauan Literatur) memiliki ambang batas minimal 5 referensi akademik untuk menjamin kedalaman teori (L30 di search-helpers.ts).
- **Stage 11 Baseline**: Pembaruan Abstrak dipaksa menggunakan data Stage 4 sebagai basis revisi untuk memastikan kontinuitas.

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Search Reqs (S6)** | [paper-search-helpers.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-search-helpers.ts) | `tinjauan_literatur` minCount: 5 (L30) |
| **Writing Rules (S4-7)** | [core.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-stages/core.ts) | Proactive Choice Card (L47, L182, L322, L431) |
| **APA Citation Rules** | [core.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-stages/core.ts) | Citation Format & Anti-Placeholder (L152-167) |
| **Update Abstract (S11)** | [finalization.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-stages/finalization.ts) | Baseline update dari Stage 4 (L25): `Stage 4 (Abstrak): ringkasanPenelitian, keywords — baseline that must be updated` |

---

## Referensi Dokumen Sumber
- [User Flows 04: Abstrak](./user-flows-04-abstrak.md) s/d [11: Pembaruan Abstrak](./user-flows-11-pembaruan-abstrak.md)

---
> [!IMPORTANT]
> Setiap artifak yang dihasilkan pada tahap ini akan langsung masuk ke dalam **Naskah Bertumbuh**, yang merupakan representasi visual utuh dari paper pengguna. Keberadaan sitasi yang valid (APA) adalah syarat mutlak kelulusan validasi tahap.
