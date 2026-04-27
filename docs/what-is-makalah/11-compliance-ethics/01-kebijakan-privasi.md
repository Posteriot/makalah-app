# 01 — Kebijakan Privasi & Tata Kelola Data

**Sumber**: `src/app/(marketing)/privacy/page.tsx`

Makalah AI (dioperasikan oleh PT The Management Asia) berkomitmen penuh pada transparansi tata kelola data. Sebagai platform *AI Academic Writing Assistant*, kami memastikan data penelitian dan percakapan Anda dikelola sesuai standar keamanan industri.

---

## 1. Klasifikasi Data yang Dikumpulkan

Untuk menjalankan fungsinya, Makalah AI mengumpulkan dan memproses empat kategori data utama:

1. **Data Profil**: Nama dan alamat email yang diperoleh saat pendaftaran (baik secara langsung maupun melalui OAuth Google).
2. **Konten Riset**: Pesan percakapan (chat), draf paper (*working title*, abstrak, dll), dan file PDF referensi yang diunggah pengguna untuk dianalisis oleh AI.
3. **Data Transaksi**: Informasi transaksi langganan dan pembelian kuota.
4. **Data Teknis**: Log aktivitas dasar yang dibutuhkan untuk memastikan stabilitas layanan, deteksi anomali, dan pemeliharaan keamanan.

---

## 2. Tujuan Pemrosesan Data

Data pengguna digunakan semata-mata untuk:
- Mengoperasikan layanan penulisan, analisis dokumen, dan riset akademis berbasis AI.
- Memproses pembayaran dan pemberian hak akses fitur Pro/BPP.
- Memenuhi kebutuhan keamanan sistem, termasuk verifikasi login, pencegahan *abuse* (rate limiting), dan pemulihan akun.
- Mengirimkan komunikasi penting terkait layanan (email transaksional).

---

## 3. Integrasi Pihak Ketiga

Untuk menghasilkan output berkualitas, Makalah AI berintegrasi dengan pihak ketiga secara aman:

- **Penyedia AI (LLM)**: Konten riset dikirimkan secara selektif ke penyedia model AI (seperti Google Gemini atau OpenAI via Vercel AI Gateway / OpenRouter) untuk diproses menjadi draf. Data *prompt* ini bersifat transaksional dan mengikat kebijakan privasi penyedia model terkait pelarangan penggunaan data pengguna untuk melatih model (*opt-out by default* pada API tier).
- **Penyedia Pembayaran**: Makalah AI terintegrasi dengan Payment Gateway berstandar PCI-DSS (Xendit). **Kami tidak menyimpan nomor kartu kredit atau PIN pengguna di database kami.**
- **Autentikasi**: Kami menggunakan Google OAuth (melalui BetterAuth) untuk meminimalisasi penyimpanan kata sandi.

---

## 4. Standar Penyimpanan & Keamanan

- **Enkripsi Data**: Seluruh data tersimpan dalam basis data (Convex) dengan enkripsi otomatis saat transit dan *at-rest*.
- **Ownership Enforcement**: Kami menerapkan *Role-Based Access Control* (RBAC) dan pemeriksaan kepemilikan yang ketat. Sistem menjamin bahwa **hanya akun pemilik data** yang memiliki akses ke percakapan dan dokumen yang diunggah.

---

## 5. Hak dan Kontrol Pengguna

Pengguna memiliki hak penuh atas datanya di dalam platform Makalah AI:
- Memperbarui informasi profil langsung melalui aplikasi.
- **Menghapus secara permanen** riwayat percakapan, draf paper, atau lampiran dokumen kapan saja melalui antarmuka aplikasi.
- Mengajukan penutupan akun secara keseluruhan melalui kanal dukungan resmi (`dukungan@makalah.ai`).
