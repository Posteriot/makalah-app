# Kategori 05: User Flow & System Behavior

Kategori ini berisi dokumentasi teknis mengenai bagaimana Makalah AI mengelola interaksi pengguna, transisi status sesi, dan penegakan alur kerja (*workflow enforcement*). Seluruh dokumen dalam kategori ini telah melalui **Audit Forensik** terhadap codebase faktual (Convex & Harness).

## 🗺️ Peta Navigasi Dokumen

Dokumen dibagi menjadi dua kelompok besar: Mekanisme Sistem dan Panduan Tahapan (Stages).

### 🛠️ Mekanisme Sistem (System Internals)
Dokumen ini menjelaskan "mesin" yang menjalankan user flow:
- **[Diagram Alur Visual (Mermaid)](./01-visual-flow.md)**: Gambaran visual siklus 14-stage dan status lifecycle.
- **[Mekanisme Inti (Core Mechanisms)](./02-core-mechanisms.md)**: Arsitektur *Plan-Spec* (capture + persistensi), *Choice Card*, dan *Tool Chain Enforcement*.
- **[Status Sesi & Lifecycle](./03-lifecycle-states.md)**: State machine status sesi (`drafting`, `pending_validation`, `revision`, `approved`) dan *Auto-Rescue*.
- **[Logika Lintas Stage](./04-cross-stage-logic.md)**: Mekanisme *Rewind*, *Memory Digest*, *Dirty Context Detection*, dan *Context Compaction*.

### ✍️ Panduan Alur per Tahap (Stage-by-Stage)
Detil perilaku AI dan kebijakan search pada setiap blok tahapan:
- **[Tahap Persiapan (Stage 1-3)](./05-preparatory-stages.md)**: Dari ide mentah (`gagasan`) ke struktur paper (`outline`).
- **[Tahap Penulisan (Stage 4-11)](./06-writing-stages.md)**: Pembuatan konten akademik dari Abstrak hingga Kesimpulan dengan disiplin sitasi APA.
- **[Tahap Finalisasi (Stage 12-14)](./07-finalization-stages.md)**: Kompilasi Daftar Pustaka, Lampiran, dan penetapan Judul Akhir.
- **[Output & Ekspor](./08-output-and-export.md)**: Naskah Bertumbuh dan jalur ekspor PDF/Word setelah sesi `completed`.

---

## 📚 Referensi Teknis (Technical References)

Untuk detil implementasi per stage (instruksi mentah, limit task, dan policy), silakan merujuk ke folder referensi utama:
👉 **[User Flow Technical References](../references/user-flow/)**

Beberapa referensi kunci:
- [General Mechanisms (User Flows 00)](../references/user-flow/user-flows-00.md)
- [Gagasan & Ideation (User Flows 01)](../references/user-flow/user-flows-01-gagasan.md)
- [Tinjauan Literatur (User Flows 06)](../references/user-flow/user-flows-06-tinjauan-literatur.md)
- [Daftar Pustaka (User Flows 12)](../references/user-flow/user-flows-12-daftar-pustaka.md)

---

## 🤖 Panduan untuk Model LLM (LLM Navigation)

Jika Anda bekerja dengan flow penulisan paper di Makalah AI:
1. **Verifikasi Status**: Gunakan `03-lifecycle-states.md` untuk memahami status sesi saat ini.
2. **Pahami Batasan**: Gunakan `05-preparatory-stages.md`, `06-writing-stages.md`, atau `07-finalization-stages.md` untuk mengetahui apakah *Active Search* diizinkan atau tidak di stage saat ini.
3. **Cek Rujukan Kode**: Setiap dokumen menyertakan section **Rujukan Kode (Audit Forensik)**. Selalu rujuk baris kode tersebut untuk memastikan implementasi Anda *compliant* dengan codebase.
4. **Gunakan Referensi**: Folder `../references/user-flow/` berisi instruksi "mentah" yang disuntikkan ke sistem; gunakan itu untuk memahami *nuance* perintah per stage.
5. **Output & Ekspor**: Gunakan `08-output-and-export.md` untuk memahami Naskah Bertumbuh, jalur rebuild, dan perbedaan endpoint ekspor PDF/Word.

---
> [!IMPORTANT]
> Seluruh alur kerja Makalah AI bersifat **Linear** dan **Human-in-the-loop**. AI tidak diizinkan melompati tahap atau mengubah data pada status `pending_validation` tanpa melalui mutasi `requestRevision`.
