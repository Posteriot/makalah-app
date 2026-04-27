# Orkestrasi Instruction Stack

Makalah AI menggunakan sistem orkestrasi instruksi yang dinamis untuk memastikan model AI (Tukang) memiliki konteks yang tepat pada setiap giliran (*turn*) percakapan. Proses ini dikelola oleh modul `resolve-instruction-stack.ts`.

## Mekanisme Stack

Alih-alih mengirimkan satu system prompt statis, sistem menyusun serangkaian pesan sistem (*Instruction Stack Entries*) dalam urutan prioritas tertentu. Urutan ini krusial untuk memastikan instruksi yang lebih spesifik dapat menimpa atau melengkapi instruksi yang lebih umum.

### Urutan Prioritas (Ordered Stack)

Sistem menyusun instruksi dalam urutan berikut (1-13):

1.  **Base System Prompt**: Instruksi dasar kepribadian dan aturan umum (diambil dari database).
2.  **Paper Mode Prompt**: Instruksi khusus ketika aplikasi berada dalam mode penulisan paper.
3.  **File Context**: Isi teks dari file yang diunggah pengguna (jika ada).
4.  **Attachment Awareness**: Instruksi tentang cara merujuk pada lampiran.
5.  **Raw Sources Context**: Konten mentah hasil ekstraksi pencarian web (kondisional — hanya dimasukkan jika `shouldIncludeRawSourcesContext` bernilai true).
6.  **Source Inventory**: Daftar terstruktur dari sumber daya yang tersedia.
7.  **Exact Source Inspection**: Aturan ketat untuk memeriksa keaslian sumber.
8.  **Source Provenance**: Aturan atribusi dan sitasi.
9.  **Recent-Source Skills**: Instruksi kemampuan spesifik berdasarkan sumber yang baru ditemukan.
10. **Context Notes**: Catatan dinamis berdasarkan interaksi kartu pilihan (*Choice Card*) **atau** input teks bebas — keduanya **mutually exclusive**: jika `choiceContextNote` ada, maka `freeTextContextNote` diabaikan (choice takes priority).
11. **Choice YAML Prompt**: Instruksi format khusus untuk menghasilkan kartu pilihan (hanya pada tahap *drafting*).
12. **Workflow Discipline**: Aturan perilaku saat tahap finalisasi (misal: dilarang curhat masalah teknis ke pengguna).
13. **Completed Session Override**: Instruksi penutup jika paper sudah selesai.

## Workflow Response Discipline

Pada tahap-tahap kritis (seperti daftar pustaka atau finalisasi), sistem menyuntikkan instruksi **Mandatory Discipline**:

- **No Technical Jargon**: AI dilarang menceritakan kegagalan tool, retry, atau perbaikan format internal kepada pengguna.
- **Conciseness**: Jawaban akhir dibatasi maksimal 1-3 kalimat untuk menjaga fokus pada workflow.
- **Deterministic Chains**: Untuk tahap tertentu (misal: Daftar Pustaka), AI dipaksa mengikuti urutan pemanggilan tool yang sangat spesifik (Compile -> Update Artifact -> Submit).

## Implementasi Kode

Logika utama penyusunan ini dapat ditemukan di:
- `src/lib/chat-harness/context/resolve-instruction-stack.ts`
- `src/lib/ai/skills/index.ts` (untuk `composeSkillInstructions`)

---
**Lihat Juga:**
- [System Prompts (Database)](./system-prompts.md)
- [Runtime Enforcers](./runtime-enforcers.md)
