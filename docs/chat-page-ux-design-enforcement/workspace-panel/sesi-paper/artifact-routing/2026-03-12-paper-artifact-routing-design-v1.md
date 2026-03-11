# Design Doc: Paper Artifact Routing and Return Navigation

**Tanggal:** 12 Maret 2026
**Scope:** Desktop chat workspace
**Status:** Draft tervalidasi obrolan, baseline sebelum audit compliance

---

## 1. Ringkasan Masalah

Saat ini user bisa membuka artifact panel dari tiga jalur berbeda:

1. hasil generate model di chat window
2. sidebar `Sesi Paper` aktif
3. workspace panel `Sesi Paper Lainnya`

Masalah UX muncul ketika artifact dibuka dari subsistem paper:

- artifact panel mengambil alih viewport kanan
- konteks asal artifact hilang
- user tidak punya jalur balik yang eksplisit ke:
  - daftar `Sesi Paper Lainnya`
  - folder parent nonaktif
  - konteks sesi aktif di sidebar
- untuk artifact orphan, status percakapan sumber harus tetap aman dan pasif
- untuk artifact yang masih punya parent conversation, aksi `Lihat percakapan terkait` sekarang belum cukup deterministik ke pemantik artifact di chat window

Intinya: `paper session navigation` dan `artifact viewing` adalah satu subsistem UX, walaupun secara layout tetap hidup di panel berbeda.

---

## 2. Tujuan

Desain ini harus memastikan:

1. artifact yang dibuka dari subsistem paper selalu punya jalur balik yang eksplisit
2. `workspace panel sesi paper` tetap khusus untuk sesi nonaktif
3. `sidebar sesi paper` tetap khusus untuk sesi aktif
4. preview readonly tidak mengubah status sesi
5. hanya navigasi ke chat sumber yang mengubah sesi nonaktif menjadi aktif
6. navigasi ke chat sumber harus deterministik ke pemantik artifact di chat window
7. artifact orphan tetap bisa dibuka dan menampilkan status pasif `Percakapan tidak ditemukan`

---

## 3. Boundary Sistem yang Dikunci

### 3.1 Sidebar kiri

Sidebar `Sesi Paper` tetap hanya untuk sesi aktif conversation yang sedang dibuka.

Yang tetap hidup di sana:

- header `Sesi Paper`
- jumlah sesi pada sublabel
- list artifact sesi aktif
- klik artifact dari sesi aktif

Yang tidak boleh hidup di sana:

- daftar sesi nonaktif

### 3.2 Workspace panel kanan

Workspace panel kanan untuk sesi paper harus diberi label eksplisit:

- `Sesi Paper Lainnya`

Panel ini hanya untuk sesi paper yang tidak aktif terhadap conversation yang sedang dibuka.

Yang boleh hidup di sana:

- list sesi nonaktif
- detail folder nonaktif
- klik artifact readonly dari sesi nonaktif

Yang tidak boleh hidup di sana:

- sesi aktif
- label `nonaktif` sebagai istilah produk utama

### 3.3 Artifact panel

Artifact panel tetap viewer generik, tetapi harus menjadi `origin-aware`.

Artifact panel tidak boleh menganggap semua artifact datang dari konteks yang sama.

Origin minimal yang harus dikenali:

- `chat`
- `paper-active-session`
- `paper-session-manager-root`
- `paper-session-manager-folder`

---

## 4. Model Navigasi yang Direkomendasikan

### 4.1 Prinsip utama

`paper workspace` adalah satu subsistem UX, tetapi terdiri dari dua entry point yang berbeda:

- sesi aktif di sidebar
- sesi nonaktif di workspace panel kanan

Karena entry point-nya berbeda, affordance balik di artifact panel juga harus kontekstual.

### 4.2 Aturan origin

#### Origin `chat`

- artifact panel tidak menampilkan rail paper
- perilaku artifact tetap seperti flow chat sekarang

#### Origin `paper-active-session`

- artifact panel menampilkan rail paper yang mengembalikan user ke konteks sesi aktif
- rail ini tidak boleh mengarahkan user ke `Sesi Paper Lainnya`

#### Origin `paper-session-manager-root`

- artifact panel menampilkan affordance balik ke `Sesi Paper Lainnya`
- target baliknya adalah root list semua sesi nonaktif

#### Origin `paper-session-manager-folder`

- artifact panel menampilkan affordance balik ke:
  - root `Sesi Paper Lainnya`
  - folder parent nonaktif yang barusan dibuka

### 4.3 Rekomendasi bentuk affordance

Pendekatan terbaik adalah breadcrumb fungsional pendek di area atas artifact panel.

Contoh:

- dari sesi aktif:
  - `Sesi Paper / [Nama Sesi Aktif]`
- dari root sesi lainnya:
  - `Sesi Paper Lainnya`
- dari folder sesi lainnya:
  - `Sesi Paper Lainnya / [Nama Folder]`

Breadcrumb ini bukan dekorasi. Setiap node yang relevan harus bisa diklik untuk kembali ke konteks asal.

---

## 5. Perilaku Status Aktif vs Nonaktif

### 5.1 Preview readonly

Preview readonly dari workspace panel sesi paper tidak mengubah status sesi.

Artinya:

- sesi nonaktif tetap nonaktif
- sesi itu tetap boleh tampil di `Sesi Paper Lainnya`
- sidebar kiri tidak berubah hanya karena user sedang membaca readonly artifact

### 5.2 Navigasi ke chat sumber

Status sesi hanya berubah ketika user benar-benar bernavigasi ke chat sumber.

Saat itu:

- route chat berpindah ke conversation sumber
- sesi tersebut menjadi sesi aktif
- sidebar kiri menampilkan sesi itu
- panel `Sesi Paper Lainnya` tidak lagi menampilkan sesi itu

---

## 6. Deterministic Return to Source

### 6.1 Masalah sekarang

Link `Lihat percakapan terkait` tidak boleh hanya membawa user ke halaman conversation umum.

Kalau user hanya mendarat ke awal percakapan, konteks sebab-akibat artifact tetap hilang.

### 6.2 Target perilaku

Saat user klik `Lihat percakapan terkait`, sistem harus:

1. masuk ke route chat sumber
2. membuka artifact panel untuk artifact yang relevan
3. memfokuskan user ke pemantik artifact di chat window

### 6.3 Bentuk fokus yang direkomendasikan

Rekomendasi terbaik:

- buka artifact panel terkait
- scroll ke message bubble pemantik
- beri highlight singkat pada bubble atau artifact signal yang sesuai

Ini yang paling deterministik dan paling jelas buat user.

---

## 7. Aturan Artifact Orphan

Artifact orphan tetap valid sebagai record artifact.

Untuk kasus ini:

- artifact readonly harus tetap bisa dibuka
- header readonly tetap tampil
- rail paper tetap tampil sesuai origin
- status conversation source harus pasif:
  - `Percakapan tidak ditemukan`
- tidak boleh ada link aktif `Lihat percakapan terkait`

Ini berlaku untuk parent artifact maupun refrasa yang source conversation-nya sudah hilang.

---

## 8. Copy dan Terminologi

Terminologi yang dikunci:

- sidebar aktif: `Sesi Paper`
- workspace panel nonaktif: `Sesi Paper Lainnya`
- status orphan di readonly artifact: `Percakapan tidak ditemukan`

Terminologi yang tidak direkomendasikan:

- `Sesi Paper Nonaktif`
- `Panel Nonaktif`
- label status teknis yang terlalu sistemik untuk header panel

---

## 9. State yang Harus Disimpan

Saat artifact dibuka dari subsistem paper, state tab artifact minimal harus membawa:

- `origin`
- `originSessionId`
- `originSessionTitle`
- `originView`
  - `active-session`
  - `session-manager-root`
  - `session-manager-folder`
- `sourceConversationId`
- `sourceArtifactId` bila relevan

Untuk deterministic return ke chat source, jalur navigasi juga harus membawa metadata yang cukup untuk memfokuskan message pemantik artifact.

---

## 10. Risiko UX dan Mitigasi

### Risiko 1: Breadcrumb statis untuk semua artifact

Ini salah karena artifact chat-generated tidak boleh diperlakukan seperti artifact paper.

Mitigasi:

- render rail paper hanya untuk origin paper

### Risiko 2: Workspace panel sesi paper bocor menampilkan sesi aktif

Ini akan membuat kontradiksi dengan tujuan panel kanan.

Mitigasi:

- pertahankan boundary: panel kanan hanya sesi lainnya

### Risiko 3: Navigasi ke chat sumber tidak deterministik

User akan merasa “dibawa ke percakapan” tapi bukan ke alasan kenapa dia ke sana.

Mitigasi:

- route harus membawa context source artifact
- chat window harus highlight trigger message

### Risiko 4: Artifact orphan berhenti di empty state

Ini akan memutus UX document recovery.

Mitigasi:

- resolver artifact harus berbasis artifact record, bukan bergantung penuh pada conversation source

---

## 11. Definisi Selesai

Desain ini dianggap terpenuhi jika:

1. artifact dari `Sesi Paper Lainnya` punya jalur balik ke root panel dan folder parent
2. artifact dari sidebar sesi aktif punya jalur balik ke konteks sesi aktif
3. artifact dari chat tidak menampilkan rail paper
4. preview readonly tidak mengubah status sesi
5. klik `Lihat percakapan terkait` mengaktifkan sesi hanya setelah benar-benar pindah route
6. route tujuan membuka artifact panel dan memfokuskan pemantik artifact di chat window
7. artifact orphan menampilkan `Percakapan tidak ditemukan` tanpa link aktif

