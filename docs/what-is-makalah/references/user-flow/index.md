# Technical References: User Flow & Stage Instructions

Folder ini berisi spesifikasi teknis "mentah" yang mendefinisikan perilaku AI, instruksi skill, kebijakan pencarian (*search policy*), dan struktur data untuk setiap tahapan penulisan di Makalah AI.

## ⚙️ Mekanisme Umum (General Mechanisms)

Sebelum masuk ke detail per stage, sangat disarankan untuk memahami mekanisme sistem yang mendasarinya:
- **[User Flows 00: General Mechanisms](./user-flows-00.md)**: Arsitektur Lifecycle, Lifecycle States, Tool Calling Protocol, dan Syncing Contract.

---

## 🛤️ Detail Instruksi per Tahap (Stage 1-14)

Berikut adalah panduan teknis mendalam untuk masing-masing dari 14 tahap penulisan paper:

### Fase 1: Persiapan (Preparatory)
1. **[Stage 1: Gagasan](./user-flows-01-gagasan.md)** — Eksplorasi ide dan validasi kelayakan riset.
2. **[Stage 2: Topik](./user-flows-02-topik.md)** — Penentuan judul definitif dan research gap.
3. **[Stage 3: Outline](./user-flows-03-outline.md)** — Penyusunan blueprint struktur naskah.

### Fase 2: Penulisan (Writing)
4. **[Stage 4: Abstrak](./user-flows-04-abstrak.md)** — Ringkasan rencana penelitian awal.
5. **[Stage 5: Pendahuluan](./user-flows-05-pendahuluan.md)** — Latar belakang dan rumusan masalah.
6. **[Stage 6: Tinjauan Literatur](./user-flows-06-tinjauan-literatur.md)** — Pemetaan State of the Art (SotA).
7. **[Stage 7: Metodologi](./user-flows-07-metodologi.md)** — Desain penelitian dan teknis analisis.
8. **[Stage 8: Hasil](./user-flows-08-hasil.md)** — Presentasi temuan data.
9. **[Stage 9: Diskusi](./user-flows-09-diskusi.md)** — Interpretasi dan perbandingan temuan.
10. **[Stage 10: Kesimpulan](./user-flows-10-kesimpulan.md)** — Jawaban rumusan masalah dan saran.

### Fase 3: Finalisasi (Finalization)
11. **[Stage 11: Pembaruan Abstrak](./user-flows-11-pembaruan-abstrak.md)** — Sinkronisasi abstrak dengan temuan akhir.
12. **[Stage 12: Daftar Pustaka](./user-flows-12-daftar-pustaka.md)** — Kompilasi dan audit sitasi akhir.
13. **[Stage 13: Lampiran](./user-flows-13-lampiran.md)** — Penambahan materi pendukung riset.
14. **[Stage 14: Judul Final](./user-flows-14-judul.md)** — Penetapan identitas akhir paper.

---

## 🤖 Panduan Navigasi LLM

- **Implementasi Fitur**: Jika Anda diminta mengimplementasikan atau memperbaiki fitur di tahap tertentu, bacalah file referensi tahap tersebut untuk memahami *expected behavior* (Plan template, Search policy, dll).
- **Instruction Stack**: Dokumen-dokumen ini adalah sumber utama teks yang disuntikkan ke dalam `resolve-instruction-stack.ts`.
- **Integritas Alur**: Selalu rujuk `user-flows-00.md` untuk memastikan protokol komunikasi (seperti penggunaan *Choice Card*) tetap konsisten di seluruh tahap.

---
> [!IMPORTANT]
> Seluruh instruksi dalam folder ini bersifat **Otoritatif**. Perubahan pada perilaku sistem harus selalu tercermin dalam dokumen referensi ini terlebih dahulu.
