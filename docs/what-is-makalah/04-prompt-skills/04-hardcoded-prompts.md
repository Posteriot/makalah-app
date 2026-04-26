# Hardcoded Prompts

Selain instruksi dinamis yang dikelola di database, Makalah AI memiliki serangkaian instruksi statis yang tertanam langsung di dalam kode program (*Hardcoded*). Instruksi ini berfungsi sebagai kerangka dasar perilaku AI yang menjamin konsistensi sistem pada tingkat fundamental.

## 1. Paper Mode Prompt

Instruksi ini aktif secara otomatis ketika percakapan terdeteksi memiliki sesi penulisan paper yang aktif. Ini adalah instruksi paling padat dan kompleks di Makalah AI.

### Lokasi Kode
- `src/lib/ai/paper-mode-prompt.ts`

### Tanggung Jawab Utama
- **Memory Anchor**: Mengingatkan AI akan keputusan-keputusan yang sudah diambil di *stage* sebelumnya melalui *Memory Digest*.
- **Sync Contract**: Memastikan AI menyadari jika ada ketidaksinkronan data antara konteks percakapan dan database (*Dirty Context*).
- **Tool Logic**: Memberikan instruksi spesifik tentang kapan harus menggunakan `updateStageData`, `createArtifact`, atau `submitStageForValidation`.
- **Citations Rules (APA)**: Memaksa aturan sitasi yang sangat ketat, termasuk larangan menggunakan nama domain sebagai penulis (misal: dilarang menggunakan `(Kompas.com, 2024)` dan harus mencari nama penulis asli).

## 2. Choice YAML Prompt

Instruksi ini mendefinisikan "Bahasa Visual" AI. AI diinstruksikan untuk tidak hanya menjawab dengan teks, tetapi juga menyajikan kartu pilihan interaktif (*Choice Cards*).

### Lokasi Kode
- `src/lib/json-render/choice-yaml-prompt.ts`

### Komponen Utama
- **Visual Language**: AI dilarang menggunakan daftar nomor atau *bullet points* untuk pilihan jika kartu interaktif tersedia.
- **Workflow Action**: AI harus menentukan apa yang terjadi setelah pengguna memilih. Ada **4 nilai valid** `workflowAction` pada `ChoiceCardShell`:
  - `continue_discussion`: User masih eksplorasi — jangan trigger artifact lifecycle.
  - `finalize_stage`: Pilihan user adalah titik komit — model HARUS finalisasi (updateStageData + createArtifact/updateArtifact + submitStageForValidation).
  - `compile_then_finalize`: Stage butuh kompilasi server-side sebelum finalisasi (khusus `daftar_pustaka`).
  - `special_finalize`: Stage memiliki jalur finalisasi deterministik (khusus `judul`, `lampiran`, `hasil`).
- **Mandatory Recommendation**: AI **wajib** memberikan satu rekomendasi terbaik dari pilihan yang ada, mencerminkan perannya sebagai pendamping ahli (*Guide*).

## 3. Style & Academic Integrity (Konstitusi Gaya)

Instruksi ini memastikan AI bekerja sesuai standar integritas akademik yang ketat. Instruksi ini tersebar di seluruh *stage-specific prompts* dan *paper mode prompt*.

- **Anti-Hallucination (Zero Tolerance)**: AI dilarang keras mengarang referensi. Instruksi eksplisit menyatakan: "`EVERY reference MUST come from web search OR from Phase 1... NEVER create PLACEHOLDER citations`".
- **Narrative Elaboration**: AI diinstruksikan untuk membangun narasi akademik yang kuat menggunakan metode *Inverted Pyramid* (terutama pada tahap Pendahuluan).
- **Proactive Collaboration**: AI dilarang hanya bertanya ("What do you think?"). AI harus selalu memberikan analisis, rekomendasi, dan opsi konkret kepada pengguna.

## 4. Review Finalization Discipline

Instruksi tambahan yang aktif pada tahap-tahap akhir (Hasil, Diskusi, Kesimpulan, dll) untuk menjaga profesionalitas:
- AI dilarang menceritakan masalah teknis internal (seperti kegagalan API atau *retry*) kepada pengguna.
- AI harus memberikan jawaban yang sangat singkat (1-3 kalimat) setelah berhasil melakukan eksekusi *tool* yang berat.

---
**Lihat Juga:**
- [Orkestrasi Instruction Stack](./orchestration.md)
- [Runtime Enforcers](./runtime-enforcers.md)

## Referensi Kode
- `src/lib/ai/paper-mode-prompt.ts`: Konstruksi prompt mode paper lengkap (Memory Digest, Dirty Context, Tool Logic, APA Rules).
- `src/lib/json-render/choice-yaml-prompt.ts`: Konstanta `CHOICE_YAML_SYSTEM_PROMPT` — spesifikasi visual language untuk choice cards.
- `src/lib/ai/paper-stages/`: Berisi `getStageInstructions()` — instruksi hardcoded per-stage sebagai fallback saat stage skill dari database tidak tersedia.
