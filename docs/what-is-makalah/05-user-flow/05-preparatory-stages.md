# Tahap Persiapan (Preparatory Stages)

Tahap Persiapan (Stage 1-3) adalah fondasi dari seluruh proses penulisan di Makalah AI. Pada tahap ini, sistem bekerja untuk mengubah ide mentah menjadi struktur penelitian yang solid dan koheren.

## 1. Stage 1: Gagasan (Ideation)
**Tujuan**: Membentuk ide mentah menjadi arah riset yang layak (*feasible*) dengan klaim kebaruan (*novelty*) yang jelas.

- **Perilaku Khusus**: Ini adalah satu-satunya tahap (selain Tinjauan Literatur) di mana AI diizinkan melakukan pencarian web secara proaktif (*Active Search*).
- **Dual Search Mode**: AI mencari sumber akademik (jurnal) dan non-akademik (berita/data) untuk memvalidasi ide.
- **Output**: Artifak Gagasan yang berisi ringkasan ide, analisis kelayakan, dan sudut pandang (*angle*) riset.

## 2. Stage 2: Topik (Topic Definition)
**Tujuan**: Menentukan judul definitif dan mengidentifikasi *Research Gap* yang eksplisit.

- **Relasi**: Tahap ini adalah derivasi langsung dari artifak Gagasan. AI dilarang melakukan pencarian web baru kecuali diminta (status: *Passive Search*).
- **Narrowing Flow**: AI menyaring ide luas dari Stage 1 menjadi satu pernyataan topik yang spesifik dan dapat diukur.
- **Output**: Judul draf definitif dan pernyataan celah penelitian (*Research Gap*).

## 3. Stage 3: Outline (Structure Blueprint)
**Tujuan**: Membangun arsitektur paper yang lengkap, termasuk hirarki bab, alokasi jumlah kata (*word budget*), dan daftar periksa (*living checklist*).

- **Signifikansi**: Ini adalah tahap persiapan terakhir. Setelah disetujui, struktur ini menjadi "kontrak" yang wajib diikuti oleh AI di seluruh tahap penulisan berikutnya.
- **Living Checklist**: Setiap bagian dalam outline memiliki ID stabil yang akan di-track progresnya hingga tahap akhir.
- **Output**: Struktur bab dan sub-bab lengkap dengan estimasi panjang tulisan.

---

## Ringkasan Teknis (Audit Forensik)

| Fitur | Stage 1: Gagasan | Stage 2: Topik | Stage 3: Outline |
| :--- | :--- | :--- | :--- |
| **Search Policy** | Active (Dual Mode) | Passive (Derivation) | Passive (Blueprint) |
| **Input Utama** | Input User | Artifak Gagasan | Artifak Gagasan & Topik |
| **Research Req.** | Minimal 2 Sumber | (None) | (None) |
| **Interaksi Utama** | Eksplorasi & Validasi | Spesialisasi & Fokus | Strukturasi & Blueprint |

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **Search Policy** | [paper-mode-prompt.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-mode-prompt.ts) | `gagasan` dual search (L389), `topik` no search (L390) |
| **Research Reqs** | [paper-search-helpers.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-search-helpers.ts) | `gagasan` minCount: 2 (L25) |
| **Rollback Block** | [compute-rollback-plan.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/rollback/compute-rollback-plan.ts) | `MINIMUM_ROLLBACK_TARGET = "topik"` (L4); `gagasan` di bawah minimum, guard di (L57) |
| **Stage Skills** | [resolve-instruction-stack.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/chat-harness/context/resolve-instruction-stack.ts) | Injeksi recent-source skill (L127); stage skill utama di-resolve via `paper-mode-prompt.ts` |

---

## Referensi Dokumen Sumber
- [User Flows 01: Gagasan](./user-flows-01-gagasan.md)
- [User Flows 02: Topik](./user-flows-02-topik.md)
- [User Flows 03: Outline](./user-flows-03-outline.md)

---
> [!IMPORTANT]
> Transisi dari Stage 3 ke Stage 4 (Abstrak) menandai perubahan besar dalam perilaku AI, dari mode "Diskusi Perencanaan" ke mode "Penulisan Konten Akademik". Tahap Gagasan tidak dapat dijadikan **target rewind** — ini adalah batas minimum yang ditentukan oleh `MINIMUM_ROLLBACK_TARGET = "topik"` di `compute-rollback-plan.ts`.
