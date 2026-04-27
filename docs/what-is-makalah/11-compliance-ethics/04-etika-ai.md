# 04 — Etika AI & Integritas Akademik

**Sumber**: `src/components/about/data.ts` (PROBLEMS_ITEMS)

Makalah AI menyadari adanya polemik yang mengitari eksistensi AI di ranah pendidikan tinggi dan penulisan akademik. Sejak awal, sistem ini tidak dirancang sebagai "mesin pembuat instan yang menumbuhkan kemalasan", melainkan diposisikan secara etis sebagai **mitra diskusi interaktif** atau *sparring partner*.

Berikut adalah landasan etika AI dan pengamanan integritas akademik yang tertanam dalam platform kami:

---

## 1. Memicu, Bukan Mematikan Nalar

> *"Konon AI kerap bikin malas berpikir. Makalah sebaliknya, justru memantik diskusi dan menyangga teknis penulisan, supaya pengguna fokus menajamkan dan elaborasi gagasan."*

Makalah AI menggeser posisi pengguna dari sekadar "pemberi *prompt* statis" menjadi kolaborator. Sistem dirancang iteratif—setiap *drafting* fase (Gagasan, Outline, Abstrak, dll) mengharuskan AI mendengarkan argumen asli dari pengguna terlebih dahulu sebelum mensintesis hasilnya. Kami mengalihkan beban teknis (format APA, gaya bahasa EYD) kepada AI, dan membiarkan beban kognitif (novelty, penarikan kesimpulan) tetap dipandu oleh pemikiran manusia.

---

## 2. Transparansi Proses via Riwayat Terrekam

> *"Riwayat interaksi terekam rapi—menjamin akuntabilitas dan membedakan kolaborasi dengan generasi otomatis."*

Makalah AI menolak budaya kerja *"one-shot prompt"* yang tidak dapat dipertanggungjawabkan prosesnya. 
Seluruh sesi penulisan di sistem direkam (*reasoningTrace*, sejarah versi *plan*, dan *chat logs* tidak dapat dimusnahkan secara selektif per baris). Hal ini memberikan bukti (*audit trail*) transparan bahwa sebuah *paper* tidak di-*generate* secara ajaib, melainkan dilalui lewat puluhan fase diskusi, kritik iteratif, penyusunan *outline*, dan persetujuan pengguna.

---

## 3. Sikap terhadap "AI Detector" Bias

> *"AI atau bukan tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi."*

Makalah AI berpegang pada fakta saintifik bahwa perangkat **AI Detectors (seperti Turnitin AI atau GPTZero) memiliki tingkat positif-palsu (*false positive*) yang membahayakan**. Detektor tersebut kerap bias (sering kali menghukum *non-native speaker* atau gaya penulisan formal murni).

Oleh karena itu, Makalah AI meyakini bahwa integritas bukan diukur dari *"apakah ini diketik oleh tangan manusia atau keyboard?"*, melainkan *"apakah gagasan ini bisa dipertanggungjawabkan asalnya?"*. Transparansi log (*provenance*) adalah jawaban etis kami terhadap paranoia pendeteksi AI.

---

## 4. Pagar Etis Anti-Plagiarisme (Copyright Fencing)

> *"LLM dipagari etis untuk tidak menulis persis teks berhak cipta lebih dari 10 kata. Batasan ini sekaligus menutup celah plagiarisme dan menjaga orisinalitas gagasan pengguna."*

Kami menyuntikkan instruksi khusus di level sistem (lapisan *System Prompt* yang tidak dapat ditimpa oleh pengguna) untuk mengekang tendensi LLM meniru (*memorization recall*). 

- Secara teknis, instruksi (*prompt engineering*) platform secara eksplisit melarang AI untuk mengeluarkan *string* kata demi kata (*verbatim*) lebih dari 10 kata jika mengutip dokumen hak cipta atau referensi pihak ketiga. 
- AI dipaksa mem-parafrase secara holistik (*Refrasa*) atau wajib meletakkan tanda kutip formal berikut sitasinya jika terpaksa menggunakan frasa orisinal.

---

## 5. Auditabilitas Sitasi

> *"Makalah memastikan setiap sumber tersitasi dengan format standar dan menyimpan asal-usul ide (provenance) agar kutipan mudah dilacak dan diaudit."*

*Hallucination* (AI mengarang fakta) adalah musuh terbesar integritas akademik. Kami mengatasinya dengan fitur pelacakan *Provenance* (*SourceChunks* di `schema.ts`). Setiap kutipan teks didukung referensi tertaut (URL atau ekstrak PDF asli). Pengguna maupun dosen penguji dapat memvalidasi langsung keabsahan kutipan tanpa harus menebak dari mana AI mendapatkan informasi tersebut.
