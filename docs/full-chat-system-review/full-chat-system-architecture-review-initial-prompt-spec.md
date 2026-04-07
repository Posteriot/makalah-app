# Full Chat System Architecture Review Initial Prompt Spec

Dokumen ini berisi prompt final utuh untuk sesi tugas baru yang berfokus pada audit dan dokumentasi koreksi pola arsitektur di chat system / halaman chat system. Prompt ini sengaja dibuat panjang, lengkap, dan preskriptif agar agent baru tidak langsung melompat ke implementasi dangkal atau eksekusi kode sebelum arsitektur existing dipetakan dengan evidence.

Dokumen ini dipasangkan dengan template output hasil audit berikut, yang harus dipakai sebagai kerangka dokumen hasil oleh agent:

`docs/full-chat-system-review/full-chat-system-architecture-review-output-template.md`

## Initial Prompt

```text
TUGAS UTAMA

Kamu bertugas menyelidiki, memetakan, dan membuktikan dengan evidence kenapa pola reusable yang seharusnya sama belum berjalan konsisten pada seluruh 14 stage paper di chat system / halaman chat system. Fokus utama tugas ini adalah menghasilkan dokumentasi koreksi pola arsitektur, bukan langsung mengeksekusi implementasi.

Dokumentasi yang kamu hasilkan harus menjelaskan dengan presisi:
1. kondisi arsitektur saat ini,
2. titik putus dan inkonsistensi yang terjadi,
3. akar masalah yang menyebabkan flow tidak konsisten,
4. pola arsitektur target yang benar,
5. koreksi arsitektur yang diperlukan agar seluruh flow reusable lintas stage benar-benar sinkron.

Flow yang wajib kamu audit end-to-end adalah:
1. json-render YAML choice card sebagai bahasa visual model,
2. artifact lifecycle,
3. submit validation,
4. validation panel,
5. revisi artifact melalui chat,
6. revisi artifact melalui validation panel,
7. edit+resend prompt,
8. kemungkinan lahirnya artifact versi baru bila state memang menuntut versioning,
9. kontrak instruction model,
10. keterhubungan prompt, tool-calling, backend mutation, state transition, dan frontend render.

Selain itu, kamu juga wajib memastikan bahwa seluruh pola berbasis regex yang selama ini dipakai untuk membaca, memicu, mengarahkan, atau menyimpulkan perilaku model dihapus dari jalur utama, lalu diganti dengan instruction contract yang eksplisit, terstruktur, dapat diaudit, dan benar-benar mengandalkan kecerdasan model LLM.

Target akhir tugas ini bukan patch kode, melainkan dokumen koreksi arsitektur yang preskriptif, evidence-based, dan dapat dipakai sebagai acuan implementasi pada sesi terpisah berikutnya.

Gunakan file template berikut sebagai kerangka wajib untuk menyusun dokumen hasil audit:

`docs/full-chat-system-review/full-chat-system-architecture-review-output-template.md`

STAGE YANG WAJIB DIAUDIT

1. gagasan
2. topik
3. outline
4. abstrak
5. pendahuluan
6. tinjauan_literatur
7. metodologi
8. hasil
9. diskusi
10. kesimpulan
11. pembaruan_abstrak
12. daftar_pustaka
13. lampiran
14. judul

KONTEKS TAMBAHAN YANG WAJIB DIPAKAI

Selain kode aplikasi, kamu juga wajib mengaudit skills stage dan system prompt utama yang aktif di database, karena keduanya bisa menjadi sumber ketidaksinkronan flow chat, artifact lifecycle, validation flow, choice card, dan perilaku model.

Untuk memudahkan audit dan perumusan koreksi, salinan aktifnya sudah disediakan di folder referensi berikut:

`.references/system-prompt-skills-active/updated-2`

Gunakan folder referensi tersebut sebagai sumber utama untuk:
1. memeriksa kontrak system prompt utama,
2. memeriksa skill per stage yang aktif,
3. menemukan pola regex, string matching rapuh, atau instruksi yang tidak sinkron,
4. merumuskan koreksi arsitektur prompt dan skill,
5. menyiapkan draft revisi jika memang dibutuhkan.

BATASAN KERJA

1. Jangan langsung mengeksekusi refactor atau implementasi kecuali diminta secara eksplisit pada sesi terpisah.
2. Fokus utama tugas ini adalah audit, diagnosis, perumusan koreksi pola, dan dokumentasi arsitektur yang presisi.
3. Jika menemukan bug atau inkonsistensi, jelaskan koreksi arsitektur yang diperlukan, tetapi jangan menganggap tugas ini sebagai sesi implementasi.
4. Semua rekomendasi harus ditulis dalam bentuk dokumentasi yang bisa dijadikan acuan untuk sesi eksekusi berikutnya.
5. Jika diperlukan untuk memperjelas usulan koreksi, kamu boleh menulis revisi draft langsung di folder `.references/system-prompt-skills-active/updated-2`.
6. Revisi di folder referensi tersebut diperlakukan sebagai draft koreksi untuk ditinjau, bukan deployment final.
7. Jangan menganggap perubahan di folder referensi otomatis aktif di sistem; user akan upload manual melalui admin panel.

NON-GOALS

1. Jangan menganggap tugas ini sebagai sesi untuk merapikan style code, rename file, atau refactor umum yang tidak berdampak langsung pada flow chat system.
2. Jangan menulis solusi generik tanpa mengikatnya ke evidence, stage, file, prompt, skill, mutation, atau render yang nyata.
3. Jangan berhenti pada opini arsitektur tingkat tinggi; setiap rekomendasi harus bisa ditelusuri ke masalah spesifik yang ditemukan.
4. Jangan menghasilkan dokumentasi yang hanya naratif; hasil akhir harus cukup operasional untuk dipakai sebagai acuan sesi implementasi berikutnya.

TUJUAN INVESTIGASI DAN DOKUMENTASI

Untuk setiap stage, pastikan hal-hal berikut dianalisis, dibuktikan, dan didokumentasikan dengan jelas:

1. json-render YAML choice card wajib hadir di semua stage sebagai bahasa visual model.
2. choice card tetap boleh dipakai model untuk menyuguhkan opsi, rekomendasi, atau sikap dalam human-in-the-loop tanpa merusak lifecycle stage.
3. updateStageData berjalan benar pada saat yang semestinya.
4. createArtifact atau updateArtifact berjalan benar pada saat yang semestinya.
5. submitStageForValidation berjalan benar pada saat yang semestinya.
6. backend benar-benar masuk ke status `pending_validation`.
7. validation panel benar-benar muncul ketika state backend sudah sesuai.
8. seluruh rangkaian memakai satu pola reusable yang sama, konsisten, sinkron, dan tidak saling bentrok.
9. assistant tidak boleh membuat klaim palsu tentang artifact atau validation panel jika state backend belum sesuai.
10. revisi artifact melalui chat maupun revisi lewat validation panel harus sukses tanpa kendala.
11. edit+resend prompt harus mampu menghasilkan respons yang benar dan artifact versi baru jika state memang menuntut perubahan versi.
12. seluruh pola yang mengandung regex untuk membaca, memicu, mengarahkan, atau menyimpulkan perilaku model harus dihapus dari flow ini.
13. setiap mekanisme berbasis regex harus diganti dengan instruction yang eksplisit kepada model melalui JSON, schema, structured object, typed payload, atau format kode sejenis.
14. sistem chat harus benar-benar mengandalkan kecerdasan model LLM yang diarahkan oleh instruction contract yang jelas, bukan regex heuristics yang rapuh.
15. system prompt utama dan stage skills yang aktif di database harus diperiksa apakah sinkron dengan pola reusable yang diharapkan.
16. semua hasil analisis harus dituangkan sebagai dokumentasi koreksi pola arsitektur di chat system / halaman chat system.

INVARIANTS YANG TIDAK BOLEH DILANGGAR

1. Jangan mengasumsikan artifact atau validation panel sudah ada jika state backend belum membuktikannya.
2. Jangan mengklaim submit sukses jika mutation belum benar-benar mengubah state stage.
3. Jangan mengklaim validation panel tampil jika render frontend belum membuktikannya.
4. Jangan memecah pola implementasi antar stage jika sebenarnya bisa disatukan menjadi satu reusable pattern.
5. Jika revisi menyebabkan artifact perlu versi baru, pastikan alur versioning eksplisit dan konsisten.
6. Jika revisi dilakukan via chat atau via validation panel, alur edit+resend prompt harus tetap valid dan tidak memutus lifecycle stage.
7. Jika ada perbedaan perilaku antar stage, identifikasi penyebab spesifiknya dan dokumentasikan sampai seragam.
8. Jangan mempertahankan regex sebagai mekanisme utama untuk mendeteksi intent, status, choice card, artifact action, validation action, atau transisi stage.
9. Jangan mengganti regex dengan parser rapuh lain yang tetap mengandalkan string matching implisit tanpa kontrak instruction yang jelas.
10. Kontrak instruction model harus eksplisit, dapat diaudit, konsisten lintas stage, dan sinkron dengan tool-calling, backend mutation, state transition, serta frontend render.
11. Tugas ini harus berakhir dalam bentuk dokumentasi koreksi arsitektur, bukan eksekusi implementasi.

PERTANYAAN RISET YANG HARUS DIJAWAB

1. Apakah semua stage benar-benar memakai satu pola reusable yang sama, atau implementasinya pecah-pecah?
2. Apakah json-render YAML choice card benar-benar hadir di semua stage sebagai bahasa visual model?
3. Apakah choice card tetap bebas dipakai model untuk opsi, rekomendasi, dan sikap tanpa merusak lifecycle stage?
4. Apakah updateStageData selalu terpanggil saat seharusnya?
5. Apakah createArtifact atau updateArtifact selalu terpanggil saat seharusnya?
6. Apakah artifactId benar-benar tersimpan ke state stage?
7. Apakah submitStageForValidation selalu terpanggil saat seharusnya?
8. Apakah Convex mutation benar-benar mengubah stage ke `pending_validation`?
9. Apakah validation panel benar-benar dirender saat backend state sudah sesuai?
10. Kalau artifact tidak muncul, putusnya ada di mana?
11. Kalau validation panel tidak muncul, putusnya ada di mana?
12. Apakah ada stage yang berhenti di partial save?
13. Apakah ada artifact yang berhasil dibuat tetapi tidak pernah disubmit?
14. Apakah ada submit yang sukses tetapi panel tetap tidak muncul?
15. Apakah ada false claim dari assistant tentang artifact atau validation panel?
16. Apakah json-render choice card justru ikut bentrok dengan artifact atau validation panel?
17. Apakah kontrak prompt, tool-calling, backend mutation, dan frontend render sudah benar-benar sinkron?
18. Regex apa saja yang saat ini masih dipakai dalam flow chat, stage lifecycle, artifact lifecycle, validation flow, system prompt utama, atau stage skills?
19. Regex tersebut dipakai untuk tujuan apa, dan kenapa itu berisiko, rapuh, atau membuat perilaku sistem tidak konsisten?
20. Instruction contract berbentuk JSON, schema, structured payload, atau format kode sejenis seperti apa yang harus menggantikan regex tersebut?
21. Apakah setelah regex dihapus, sistem benar-benar lebih bertumpu pada reasoning model yang diarahkan instruction yang jelas?
22. Apakah system prompt utama yang aktif sudah sinkron dengan kebutuhan lifecycle artifact, validation flow, dan choice card?
23. Apakah stage skills yang aktif sudah sinkron dengan pola reusable lintas 14 stage?
24. Bagian prompt utama atau skill stage mana yang menjadi sumber konflik, false claim, partial save, atau flow yang terputus?
25. Perbaikan apa yang diperlukan supaya seluruh stage memakai pola reusable yang sama tanpa merusak flow lain?

EVIDENCE YANG WAJIB DIKUMPULKAN

Untuk setiap temuan, sertakan evidence yang bisa diverifikasi dari:

1. kode yang relevan,
2. log runtime atau log mutation,
3. state backend yang aktual,
4. render frontend atau kondisi UI yang terbukti muncul,
5. alur tool-calling atau mutation yang benar-benar dieksekusi,
6. system prompt utama yang aktif,
7. stage skills yang aktif,
8. daftar pola regex lama yang dihapus, ingin dihapus, atau harus dieliminasi,
9. kontrak JSON atau structured instruction baru yang diusulkan untuk menggantikan regex tersebut.

Jika ada stage yang gagal, jelaskan titik putusnya secara spesifik:
1. di system prompt utama,
2. di skill stage,
3. di prompt runtime,
4. di tool-calling,
5. di backend mutation,
6. di state transition,
7. di render frontend,
atau kombinasi di atas.

OUTPUT YANG HARUS KAMU HASILKAN

Hasil akhir wajib berupa dokumentasi koreksi pola arsitektur untuk chat system / halaman chat system, bukan implementasi langsung. Dokumentasi tersebut minimal harus memuat:

1. ringkasan masalah utama dan scope 14 stage,
2. diagnosis akar masalah berbasis evidence,
3. peta pola existing per stage: mana yang sudah benar, mana yang pecah, mana yang inkonsisten,
4. temuan khusus pada system prompt utama yang aktif,
5. temuan khusus pada stage skills yang aktif,
6. daftar regex atau pola string-matching rapuh yang saat ini dipakai, beserta alasan kenapa harus dihapus,
7. rancangan pola arsitektur target yang reusable, sinkron, dan seragam lintas stage,
8. kontrak instruction baru berbentuk JSON, schema, structured payload, atau format kode sejenis yang menggantikan regex,
9. definisi alur artifact lifecycle yang benar, termasuk create, update, submit, `pending_validation`, panel render, revisi via chat, revisi via validation panel, edit+resend prompt, dan versioned artifact bila diperlukan,
10. definisi guardrail untuk mencegah false claim dari assistant,
11. daftar gap sinkronisasi antara system prompt utama, stage skills, prompt runtime, tool-calling, backend mutation, state transition, dan frontend render,
12. daftar bagian prompt/skill yang perlu dikoreksi,
13. draft koreksi prompt utama dan skill stage jika memang diperlukan,
14. acceptance criteria yang jelas untuk sesi implementasi berikutnya,
15. rekomendasi urutan perbaikan agar sesi eksekusi berikutnya bisa berjalan aman dan terarah.

FORMAT DOKUMENTASI YANG WAJIB

Dokumentasi final harus disusun dengan struktur yang tegas dan mudah ditindaklanjuti. Minimal gunakan seksi berikut:

1. Executive Summary
2. Scope and Non-Goals
3. System Context
4. Existing Architecture Findings
5. Stage-by-Stage Audit Matrix
6. System Prompt Findings
7. Stage Skills Findings
8. Regex Deletion Plan
9. Target Architecture Pattern
10. Artifact Lifecycle Contract
11. Validation Lifecycle Contract
12. Revision Flow Contract
13. False-Claim Guardrails
14. Prompt and Skill Draft Corrections
15. Evidence Appendix
16. Acceptance Criteria for Implementation Session
17. Recommended Execution Order

Gunakan file berikut sebagai template dasar, lalu isi dan sesuaikan berdasarkan hasil audit aktual:

`docs/full-chat-system-review/full-chat-system-architecture-review-output-template.md`

MATRIX STAGE YANG WAJIB ADA

Dokumentasi final wajib memiliki matriks audit untuk seluruh 14 stage. Setiap stage minimal harus memuat status dan evidence untuk:

1. choice card hadir atau tidak,
2. choice card aman atau bentrok,
3. updateStageData benar atau tidak,
4. createArtifact/updateArtifact benar atau tidak,
5. artifactId tersimpan atau tidak,
6. submitStageForValidation terpanggil atau tidak,
7. backend masuk `pending_validation` atau tidak,
8. validation panel muncul atau tidak,
9. revisi via chat berhasil atau tidak,
10. revisi via validation panel berhasil atau tidak,
11. edit+resend prompt valid atau tidak,
12. artifact versioning diperlukan atau tidak,
13. root cause utama,
14. file/path/evidence yang relevan,
15. rekomendasi koreksi arsitektur untuk stage tersebut.

TRACEABILITY YANG WAJIB ADA

Setiap temuan dan rekomendasi harus bisa ditelusuri secara eksplisit ke:

1. file kode yang relevan,
2. file system prompt atau skill yang relevan,
3. mutation/query/tool contract yang relevan,
4. state backend yang relevan,
5. render frontend yang relevan.

Jangan menulis rekomendasi yang tidak memiliki jejak sumber yang jelas.

PRIORITAS TEMUAN YANG WAJIB DIKLASIFIKASIKAN

Dokumentasi final harus mengklasifikasikan temuan minimal ke dalam prioritas berikut:

1. Critical: memutus artifact lifecycle, validation lifecycle, atau memicu false claim berat.
2. High: menyebabkan inkonsistensi lintas stage atau membuat revisi chat/panel gagal.
3. Medium: merusak reusable pattern, tetapi masih ada workaround parsial.
4. Low: gap dokumentasi, naming, atau kontrak minor yang belum langsung memutus flow.

MIGRATION VIEW YANG WAJIB ADA

Selain menjelaskan existing state dan target state, dokumentasi final juga wajib memuat:

1. gap dari existing ke target,
2. dependency atau urutan perbaikan,
3. risiko regresi,
4. guardrail implementasi,
5. hal-hal yang harus diverifikasi ulang saat sesi eksekusi nanti.

ARAH PERBAIKAN YANG DIHARAPKAN

1. Kalau ditemukan implementasi yang pecah antar stage, satukan menjadi satu pola reusable yang dipakai lintas stage.
2. Kalau choice card hilang di stage tertentu, kembalikan ke jalur render yang konsisten.
3. Kalau artifact lifecycle terputus, definisikan ulang urutan dan syarat trigger yang benar.
4. Kalau submit berhasil tetapi panel tidak muncul, jelaskan koreksi sinkronisasi state backend dan render frontend yang diperlukan.
5. Kalau revisi via chat atau via validation panel gagal, pastikan dokumentasi target flow menjelaskan versioning artifact dan edit+resend prompt sesuai kebutuhan state.
6. Kalau masih ada regex yang mengendalikan flow model, hapus dari arsitektur target dan ganti dengan kontrak instruction terstruktur yang eksplisit dan reusable.
7. Kalau system prompt utama atau skill stage memicu perilaku yang tidak sinkron, dokumentasikan koreksi yang diperlukan dan siapkan draft revisinya di folder referensi jika memang dibutuhkan.

KONDISI SUKSES

Tugas ini dianggap berhasil hanya jika semua hal berikut terpenuhi:

1. hasil akhirnya berupa dokumentasi koreksi arsitektur, bukan patch implementasi,
2. dokumentasi mencakup seluruh 14 stage,
3. dokumentasi menjelaskan pola existing, pola target, gap, dan koreksi yang diperlukan,
4. dokumentasi secara eksplisit mewajibkan penghapusan regex dari jalur utama flow model,
5. dokumentasi secara eksplisit mendefinisikan pengganti regex berupa instruction contract yang terstruktur,
6. dokumentasi secara eksplisit mencakup revisi artifact via chat, revisi via validation panel, edit+resend prompt, dan versioned artifact bila diperlukan,
7. dokumentasi secara eksplisit mencakup audit system prompt utama dan stage skills aktif dari folder `.references/system-prompt-skills-active/updated-2`,
8. jika diperlukan, draft revisi prompt/skill sudah disiapkan di folder referensi tersebut sebagai bahan upload manual via admin panel,
9. dokumentasi memiliki matriks audit lengkap untuk semua 14 stage,
10. dokumentasi memiliki traceability yang jelas dari tiap temuan ke file/path/evidence,
11. dokumentasi memisahkan dengan tegas existing state, target state, migration plan, dan draft correction,
12. dokumentasi final mengikuti atau secara eksplisit diturunkan dari template `docs/full-chat-system-review/full-chat-system-architecture-review-output-template.md`,
13. seluruh rekomendasi dan kesimpulan didukung evidence yang jelas dari kode, log, state backend, render frontend, system prompt aktif, dan stage skills aktif.

CATATAN PENTING

1. Folder `.references/system-prompt-skills-active/updated-2` adalah referensi kerja dan tempat draft revisi bila diperlukan.
2. Perubahan di folder tersebut bukan perubahan aktif otomatis di sistem.
3. User akan melakukan upload manual melalui admin panel.
4. Karena itu, hasil dokumentasi harus jelas membedakan antara kondisi existing, usulan koreksi, dan draft revisi yang disiapkan.
```

## Deep Review Notes

Audit mendalam terhadap versi awal dokumen menemukan bahwa struktur prompt utamanya sudah kuat, tetapi ada beberapa kebutuhan yang perlu dibuat eksplisit agar agent baru tidak menghasilkan dokumentasi yang terlalu naratif atau terlalu umum. Koreksi yang sudah ditambahkan di dokumen ini adalah:

1. Penambahan seksi `NON-GOALS` untuk mencegah scope creep dan refactor yang tidak relevan.
2. Penambahan `FORMAT DOKUMENTASI YANG WAJIB` agar output akhir tidak berhenti pada opini, tetapi berbentuk dokumen kerja yang siap dipakai pada sesi implementasi.
3. Penambahan `MATRIX STAGE YANG WAJIB ADA` agar audit 14 stage tidak hanya implisit, melainkan benar-benar dilaporkan secara sistematis per stage.
4. Penambahan `TRACEABILITY YANG WAJIB ADA` agar setiap temuan bisa ditelusuri ke file/path/prompt/skill/mutation/render yang nyata.
5. Penambahan `PRIORITAS TEMUAN YANG WAJIB DIKLASIFIKASIKAN` agar sesi implementasi berikutnya punya urutan tindakan yang rasional.
6. Penambahan `MIGRATION VIEW YANG WAJIB ADA` agar dokumen tidak hanya membahas existing dan target, tetapi juga lintasan koreksi dari satu kondisi ke kondisi lain.
7. Penguatan `KONDISI SUKSES` agar mewajibkan matriks 14 stage, traceability, dan pemisahan existing state vs target state vs migration plan vs draft correction.
8. Penambahan referensi eksplisit ke `docs/full-chat-system-review/full-chat-system-architecture-review-output-template.md` agar agent memakai kerangka output yang konsisten saat menulis hasil audit.

Dengan revisi ini, prompt sekarang lebih siap untuk menghasilkan dokumentasi arsitektur yang benar-benar komprehensif, dapat diaudit, dan operasional untuk sesi berikutnya.

## Saved Location

File ini disimpan di:

`docs/full-chat-system-review/full-chat-system-architecture-review-initial-prompt-spec.md`
