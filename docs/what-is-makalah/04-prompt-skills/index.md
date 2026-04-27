# Kategori 04: Prompt & Skills

Bagian ini mendokumentasikan sistem instruksi (prompting) dan katalog kemampuan (skills) yang menjadi otak dari Makalah AI. Sistem ini dirancang untuk memberikan kendali penuh kepada pengguna (Pawang) sambil memastikan AI (Tukang) bekerja sesuai standar akademik yang ketat.

## Filosofi Instruksi

Makalah AI menggunakan pendekatan **Layered Instruction Stack**, di mana instruksi kepada model tidak diberikan sebagai satu blok teks statis yang besar, melainkan disusun secara dinamis berdasarkan konteks percakapan dan tahap (stage) penulisan saat ini.

Pemisahan ini memungkinkan:
1.  **Dinamisme**: AI bisa beralih dari mode riset ke mode penulisan kreatif hanya dengan mengganti lapisan skill.
2.  **Kontrol**: Admin dapat memperbarui instruksi sistem global tanpa mengganggu logika spesifik tiap stage.
3.  **Safety**: Membatasi penggunaan *tools* tertentu pada stage yang tidak relevan (misal: dilarang manggil tool penulisan saat masih di stage pencarian gagasan).

## Daftar Dokumen

### 1. [01-orchestration.md](./01-orchestration.md)
Bagaimana berbagai lapisan instruksi (Base, Paper Mode, Stage Skills) digabungkan menjadi satu prompt utuh yang dikirim ke LLM.

### 2. [02-system-prompts.md](./02-system-prompts.md)
Dokumentasi tentang manajemen system prompt global melalui database Convex, termasuk versioning dan sistem aktivasi.

### 3. [03-stage-skills.md](./03-stage-skills.md)
Daftar kemampuan spesifik untuk masing-masing dari 14 stage penulisan, lengkap dengan konfigurasi `allowedTools`.

### 4. [04-hardcoded-prompts.md](./04-hardcoded-prompts.md)
Daftar instruksi statis yang tertanam di kode program (Paper Mode, Choice YAML, dll) untuk menjamin konsistensi perilaku inti.

### 5. [05-runtime-enforcers.md](./05-runtime-enforcers.md)
Logika penjaga (guardrails) yang memaksakan model untuk mengikuti alur kerja tertentu selama eksekusi turn, memastikan integritas data dan workflow.
