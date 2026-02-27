# Makalah Trace: Kerangka Integritas Akademik

**Makalah Trace** adalah sistem audit yang menyajikan indikator keterlibatan intelektual siswa/mahasiswa sepanjang proses penyusunan paper akademik berkolaborasi dengan AI, berbasis jejak percakapan yang dapat diaudit.

> [!TIP]
> **Landing Page Teaser**: "Gunakan fitur Makalah Trace yang melacak jejak keterlibatan intelektual secara transparan: apakah paper disusun bersama AI, atau dibuatkan oleh AI?"

Alat ini menyediakan indikator proses yang dapat diaudit bagi dosen/guru untuk menilai keaktifan mahasiswa, melampaui hasil deteksi AI yang sering kali tidak akurat. Melalui laporan yang transparan, Makalah Trace membantu penilaian akademik tetap adil, akuntabel, dan berbasis pada proses berpikir manusia. Seberapa aktif dan komprehensif percakapan user, apakah hanya "Oke", "lanjutkan", "Kau bikinkan", dan semacamnya, atau ada diskusi intensif dengan AI, itu yang jadi alat ukur keaktifan.

## Argumentasi Utama

Sebagian besar kampus saat ini terjebak dalam dilema: melarang AI sepenuhnya (yang sulit diterapkan) atau mengandalkan detektor AI (Turnitin, dsb) yang sering memberikan *false positive*. Tulisan akademik yang rapi dan formal sering kali dituduh sebagai buatan AI secara serampangan.

**Makalah Trace hadir sebagai jembatan *fairness* dan akuntabilitas:**
1.  **Transformasi Kebijakan**: Mendukung dicabutnya larangan total AI di kampus, menggantinya dengan paradigma AI sebagai **alat bantu/sparring partner** yang terukur.
2.  **Bahan Pertimbangan Dosen**: Memberikan data tambahan bagi dosen agar penilaian tidak hanya tergantung pada Turnitin.
3.  **Bukti Otentik**: Mahasiswa memiliki bukti nyata bahwa mereka yang memegang kendali intelektual, bukan mesin.

---

## Hasil Eksplorasi Konsep

### 1. Sistem 4 Pilar Audit & Klasifikasi Substansif
Kita menetapkan parameter awal yang adil dan terukur sebagai indikator proses (bukan verifikasi final):

*   **Pillar 1: Originalitas Input (Inisiasi Ide)**
    *   *Low Score Case*: User meminta "Bikin paper tentang ekonomi digital." (Terlalu umum, minim kontribusi pikir).
    *   *High Score Case*: User input "Dampak regulasi TikTok Shop 2023 pada UMKM Tanah Abang, saya melihat ada pergeseran perilaku belanja di X..." (Sangat spesifik, *high density*).
*   **Pillar 2: Refleksivitas Kritis (Core)**
    *   *Low Score Case (Level 0)*: Klik "Approve" tanpa chat tambahan atau hanya bilang "Ok".
    *   *High Score Case (Level 4)*: "Saya tidak setuju draf metodologi ini, kenapa pakai kualitatif? Harusnya kuantitatif karena saya mau ukur korelasi X ke Y. Ubah fokus surveinya ke pedagang kecil." (Substansif dan korektif).
*   **Pillar 3: Integritas Proses (Dwell Time)**
    *   *Anomali Case*: Draf paper 2000 kata di-approve dalam waktu 5 detik. (Indikasi tidak dibaca/rubber stamping).
    *   *Healthy Case*: User terpantau "diam" (membaca) selama 15 menit, lalu memberikan revisi spesifik sebelum Approve. (Indikator membaca, bukan bukti langsung).
*   **Pillar 4: Sinkronisasi Semantik (Suara User)**
    *   *High Alignment Case*: User di chat meminta fokus ke "Teori Agensi". Hasil akhir paper menunjukkan porsi dominan pembahasan teori tersebut sesuai instruksi chat. (Indikasi keselarasan, bukan bukti tunggal).

### 2. Output untuk Akademisi (Contoh Lembar Audit)
Dosen akan menerima ringkasan indikator proses yang mencakup:

*   **Persentase Kontribusi** (contoh simulasi):
    *   [████████░░] **Mahasiswa: 78%**
    *   [██░░░░░░░░] **Agen AI: 22%**
*   **Label Integritas**: `HIGHLY SUBSTANTIVE` (Mahasiswa aktif mengoreksi argumen).
*   **Ringkasan Bukti (Summary of Evidence)** (contoh simulasi):
    *   Input orisinal mahasiswa: 1.200 kata (Ide awal & Data lapangan).
    *   Intervensi Substansif (Level 3-4): 14 kali (Perdebatan teori & metode).
    *   Durasi Review Internal: 3 Jam 45 Menit (Total waktu baca/edit draf).
*   **Verifikasi**: [QR Code Unik] - Scan untuk masuk ke *Read-Only Discussion Player* (opsional/konsep).

---

## Cakupan & Batasan (Draf)
- Makalah Trace adalah indikator proses yang dapat diaudit, bukan alat vonis pelanggaran akademik.
- Skor kontribusi bersifat estimasi berbasis sinyal interaksi (revisi, koreksi, dan pola diskusi).
- Indikator tidak menggantikan penilaian dosen; diposisikan sebagai bahan pertimbangan tambahan.

## Kesimpulan Desain
Sistem ini memposisikan Makalah-App bukan sebagai "mesin pembuat paper otomatis", melainkan sebagai **"Partner Riset yang Ter-audit"**. Ini memenuhi standar transparansi yang dibutuhkan institusi pendidikan modern.
