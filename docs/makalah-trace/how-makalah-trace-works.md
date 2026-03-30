# How Makalah Trace Works

Status: Projected behavior document for Makalah Trace v1  
Last Updated: 2026-03-27  
Audience: Product, Engineering, Operations, and Internal Stakeholders

## 1. Purpose

Dokumen ini menjelaskan proyeksi cara kerja Makalah Trace v1 dari sudut pandang produk dan sistem. Fokus dokumen ini adalah menjawab satu hal: jika Makalah Trace dibangun sesuai keputusan arsitektur yang sudah dikunci, bagaimana tool ini akan bekerja di aplikasi Makalah App.

Dokumen ini bukan source of truth untuk role dan access control detail. Untuk aturan final role, privasi, dan state machine, tetap mengacu ke [editor-organization-management.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/editor-organization-management.md). Untuk keputusan implementasi tingkat arsitektur, mengacu ke [implementation-readiness.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/implementation-readiness.md).

## 2. What Makalah Trace Is

Makalah Trace adalah tool audit proses yang membantu dosen atau guru menilai sejauh mana user benar-benar terlibat secara intelektual saat menyusun paper dengan bantuan AI di Makalah App.

Makalah Trace tidak dirancang sebagai AI detector, alat vonis otomatis, atau mesin penalti nilai. Fungsi utamanya adalah menyajikan ringkasan audit yang bisa dipakai editor sebagai bahan pertimbangan manual.

Posisi Makalah Trace dalam produk:

- bukan pengganti penilaian akademik manusia
- bukan pembuka full transcript chat untuk editor
- bukan alat penghukuman otomatis
- bukan fitur untuk semua jenis conversation

Untuk v1, Makalah Trace hanya berlaku untuk conversation yang memiliki `paperSession`.

## 3. Who Uses It

Makalah Trace v1 melibatkan empat peran:

1. `User`  
   Siswa atau mahasiswa yang memakai chat paper-mode untuk menyusun paper.
2. `Editor`  
   Dosen atau guru yang menjalankan audit dan menilai hasilnya.
3. `Admin Organisasi`  
   Operator institusi yang mengelola assignment dan akses editor.
4. `Superadmin`  
   Tim internal platform untuk kebutuhan support terbatas, bukan operator harian audit.

## 4. When Makalah Trace Exists in the Flow

Makalah Trace tidak berjalan di awal penggunaan produk. Tool ini muncul setelah user memakai workflow paper-mode dan conversation tersebut cukup matang untuk dibagikan ke editor.

Urutan besarnya:

1. user menulis paper dengan AI dalam paper-mode
2. sistem menyimpan jejak proses di conversation dan paper session
3. user membagikan conversation untuk audit
4. editor yang berwenang menjalankan audit
5. sistem menghasilkan evaluasi per stage
6. editor mengambil keputusan per stage
7. sistem membuat PDF final hanya jika audit selesai dengan sah

## 5. High-Level Operating Model

Makalah Trace bekerja dengan model berikut:

- `conversationId` menjadi anchor audit
- `paperSession` menjadi syarat eligibility dan sumber definisi stage
- audit berjalan per stage, bukan sekali di akhir
- hasil stage disimpan sebagai attempt append-only
- editor hanya melihat evidence snippets, bukan raw transcript
- hasil audit dianggap rekomendasi, bukan putusan otomatis

## 6. End-to-End Flow

### 6.1 User Writes a Paper

User menggunakan paper-mode di Makalah App untuk mengembangkan paper melalui workflow bertahap. Selama proses ini, aplikasi sudah menghasilkan data dasar yang penting untuk Makalah Trace:

- conversation
- messages
- paper session
- file attachment
- artifacts
- reasoning trace yang aman
- interaction metadata yang relevan

Pada tahap ini, Makalah Trace belum aktif sebagai audit. Sistem hanya sedang mengumpulkan jejak proses yang nanti dapat dipakai sebagai evidence.

### 6.2 User Shares the Conversation

Saat user ingin paper tersebut bisa ditinjau oleh dosen atau guru, user menekan aksi `Share` pada conversation paper-mode itu.

Share di sini bukan berarti membuka chat mentah untuk siapa saja. Share hanya berarti:

- conversation itu menjadi eligible untuk audit
- sistem menyimpan status share aktif
- conversation dapat muncul di dashboard editor yang memang berhak

Share tetap tunduk pada kontrol akses. `conversationId` hanya berfungsi sebagai pointer audit, bukan sebagai tiket bebas akses.

### 6.3 The Editor Sees an Audit Candidate

Editor tidak melihat semua conversation user. Editor hanya melihat conversation yang lolos seluruh policy akses:

1. editor login valid
2. editor memiliki role yang sah
3. editor satu organisasi dengan user
4. user tersebut memang diassign ke editor
5. share conversation masih aktif

Jika salah satu kondisi itu gagal, conversation tidak boleh muncul sebagai audit candidate yang bisa dibuka.

### 6.4 The Editor Starts an Audit

Di dashboard editor, conversation yang eligible muncul sebagai entri audit. Dari sini editor menekan `Mulai Audit`.

Saat aksi ini dilakukan, sistem membuat `auditRun` baru. Audit run inilah yang menjadi unit kerja utama Makalah Trace.

Status awal audit run:

- `queued` saat run baru dibuat
- berubah ke `in_progress` saat proses audit mulai berjalan

Audit run selalu melekat ke satu `conversationId` dan satu editor yang sedang menjalankannya.

### 6.5 The System Audits Stage by Stage

Makalah Trace v1 tidak mengaudit semuanya sekaligus. Sistem memproses empat stage audit:

1. `Originalitas Input`
2. `Refleksivitas Kritis`
3. `Integritas Proses`
4. `Sinkronisasi Semantik`

Untuk setiap stage, backend menyusun `evidence_bundle` yang berisi:

- `audit_run_id`
- `conversation_id`
- `stage_id`
- snippets yang relevan
- sinyal proses untuk stage tersebut
- timestamp pengumpulan

Evaluator audit kemudian membaca bundle ini dan mengembalikan output terstruktur. Evaluator tidak boleh melakukan free tool-calling.

### 6.6 The Editor Reviews Each Stage

Setelah hasil satu stage tersedia, editor melihat ringkasan audit stage tersebut.

Yang ditampilkan ke editor:

- label stage
- score
- confidence
- summary
- snippets yang relevan
- metrik turunan jika tersedia

Yang tidak ditampilkan ke editor:

- full raw transcript
- email user
- seluruh isi conversation tanpa seleksi

Tujuan tampilan ini adalah agar editor bisa menilai proses secara cepat, tetapi tetap berbasis bukti.

### 6.7 The Editor Chooses an Action

Untuk setiap stage, editor mempunyai tiga aksi:

1. `Lanjut`
2. `Ulang Stage`
3. `Hentikan`

Makna tiap aksi:

- `Lanjut` berarti stage dianggap cukup dan audit boleh bergerak ke stage berikutnya
- `Ulang Stage` berarti sistem membuat attempt baru untuk stage yang sama
- `Hentikan` berarti audit run diakhiri secara manual

### 6.8 Re-Run Does Not Overwrite History

Jika editor memilih `Ulang Stage`, hasil lama tidak boleh dihapus atau ditimpa. Sistem harus menyimpan hasil baru sebagai `stage_attempt` baru secara append-only.

Konsekuensinya:

- histori audit tetap utuh
- editor dapat menilai perubahan antar attempt
- PDF final nanti hanya memakai `latest approved attempt`

Kalau belum ada approved attempt pada satu stage, stage itu dianggap `incomplete`.

### 6.9 The Audit Completes Only If All Stages Are Complete

Audit run baru boleh berstatus `completed` jika semua stage memiliki approved attempt yang sah.

Jika ada satu saja stage yang belum selesai, run tidak boleh ditutup sebagai completed.

Status terminal yang mungkin terjadi:

- `completed`
- `terminated`
- `share_revoked`
- `revoked_access`

## 7. What Exactly Gets Audited

Makalah Trace tidak mengaudit seluruh conversation secara mentah. Yang diaudit adalah sinyal proses yang dipilih untuk mendukung penilaian per stage.

### 7.1 Originalitas Input

Stage ini melihat apakah inisiasi ide benar-benar datang dari user.

Contoh sinyal yang relevan:

- prompt awal user
- rumusan ide atau masalah dari user
- arah topik yang pertama kali dimasukkan user
- bukti bahwa user tidak hanya meminta AI menulis dari nol tanpa konteks

### 7.2 Refleksivitas Kritis

Stage ini melihat apakah user benar-benar berpikir, mengevaluasi, dan mengoreksi.

Contoh sinyal yang relevan:

- user membantah atau memperbaiki hasil AI
- user meminta revisi berdasarkan alasan yang substantif
- user membandingkan opsi
- user memperjelas argumen dan struktur

### 7.3 Integritas Proses

Stage ini melihat sinyal proses kerja, termasuk ritme interaksi dan dwell time.

Contoh sinyal yang relevan:

- jeda antar interaksi
- pola iterasi
- revisi bertahap
- indikasi proses yang wajar vs pola instan yang terlalu dangkal

Stage ini tidak boleh dipakai sebagai mesin vonis cepat. Dwell time hanya indikator proses, bukan bukti tunggal.

### 7.4 Sinkronisasi Semantik

Stage ini melihat apakah output akhir masih selaras dengan suara dan arah user.

Contoh sinyal yang relevan:

- kesesuaian antara input user dan hasil AI
- apakah keputusan substantif datang dari user
- apakah output AI masih membawa niat dan framing user

## 8. What the Editor Actually Sees

Editor melihat tampilan audit, bukan tampilan chat biasa.

Minimal konten yang terlihat:

- identitas audit run
- `conversationId`
- status audit
- hasil per stage
- score, label, confidence
- summary
- snippets relevan

Editor tidak melihat:

- email user
- full raw transcript
- seluruh message history tanpa filter

Ini penting karena Makalah Trace adalah tool audit berbasis minimum exposure.

## 9. What the System Does Behind the Scenes

Di belakang layar, Makalah Trace melakukan beberapa pekerjaan internal:

1. memvalidasi apakah editor memang berhak membuka audit
2. memeriksa apakah conversation masih shared
3. memeriksa apakah assignment masih aktif
4. menyusun evidence bundle per stage
5. memanggil evaluator audit
6. menyimpan stage attempt secara append-only
7. mengubah status audit run sesuai state machine
8. memblokir export jika akses dicabut

## 10. What Happens If Access Changes Mid-Run

Makalah Trace harus tetap benar walaupun kondisi akses berubah saat audit berjalan.

### 10.1 If User Revokes Share

Jika user mencabut share atau conversation dihapus:

- akses editor ke audit harus ditutup
- run berubah ke `share_revoked`
- export baru harus ditolak

### 10.2 If Assignment Is Removed

Jika assignment editor-user dicabut:

- akses editor ke audit harus ditutup
- run berubah ke `revoked_access`
- export baru harus ditolak

### 10.3 If the Editor Stops the Audit

Jika editor memilih `Hentikan`:

- run berubah ke `terminated`
- PDF final tidak boleh dibuat

## 11. How Final PDF Works

PDF final Makalah Trace bukan sekadar export paper biasa. PDF ini adalah dokumen audit.

Isi minimum PDF:

1. identitas audit run
2. timestamp generate
3. ringkasan umum
4. hasil per stage
5. evidence snippets per stage
6. disclaimer bahwa hasil model adalah rekomendasi

PDF final hanya boleh dibuat jika:

1. audit run berstatus `completed`
2. semua stage punya `latest approved attempt`

PDF final tidak boleh dibuat jika run:

- `terminated`
- `share_revoked`
- `revoked_access`
- masih `incomplete`

Semua PDF juga harus membawa watermark waktu generate dan status akses saat generate.

## 12. Why Makalah Trace Is Not an AI Detector

Makalah Trace tidak bekerja seperti detector yang langsung menyatakan “ini ditulis AI” atau “ini murni karya manusia”.

Alasan utamanya:

- yang dinilai adalah proses, bukan hanya output akhir
- hasil model dianggap rekomendasi, bukan putusan
- editor tetap menjadi pengambil keputusan akademik
- sinyal seperti dwell time dan contribution estimate hanya estimasi

Dengan kata lain, Makalah Trace berfungsi sebagai alat bantu penilaian berbasis jejak proses, bukan mesin penghukuman otomatis.

## 13. Where Makalah Trace Lives in the Product

Secara produk dan arsitektur, Makalah Trace hidup di titik pertemuan tiga domain:

1. `conversation`
2. `paperSession`
3. `audit subsystem`

Peran masing-masing:

- `conversation` menyimpan jejak proses
- `paperSession` memberi struktur stage dan eligibility
- `audit subsystem` mengelola access, run, attempt, dan output audit

Karena itu Makalah Trace tidak boleh dimasukkan langsung ke domain `paperSessions`, walaupun ia bergantung pada paper workflow.

## 14. Summary

Jika dibangun sesuai keputusan arsitektur yang sudah dikunci, Makalah Trace v1 akan bekerja seperti ini:

- user menulis paper dalam paper-mode
- user membagikan conversation untuk audit
- editor yang berwenang melihat entri audit di dashboard
- editor memulai audit run
- sistem mengaudit conversation per stage dengan evidence bundle
- editor menilai hasil tiap stage dan bisa lanjut, ulang, atau hentikan
- sistem menyimpan histori audit secara append-only
- PDF final hanya keluar jika audit selesai dengan sah

Inti dari cara kerja Makalah Trace adalah ini: tool ini tidak mencoba menggantikan dosen atau guru, tetapi menyusun jejak proses kolaborasi AI menjadi bahan audit yang bisa dipakai manusia untuk menilai dengan lebih adil.

## 15. Related Documents

- [editor-organization-management.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/editor-organization-management.md)
- [implementation-readiness.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/implementation-readiness.md)
- [makalah-trace-concept.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/makalah-trace-concept.md)
- [brainstorming-notes.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/brainstorming-notes.md)
