# 03 — Keamanan Data (Postur Pengguna)

**Sumber**: `src/app/(marketing)/security/page.tsx`, `convex/schema.ts`

Makalah AI dibangun dengan postur bahwa **keamanan adalah pondasi, bukan sekadar fitur tambahan**. Desain arsitektur kami memastikan hak kepemilikan data (bahwa data pengguna sepenuhnya terbatas hanya pada akun pengguna tersebut) dikawal dengan ketat.

---

## 1. Perlindungan Akses Akun & Autentikasi

Kami melindungi pintu masuk utama pengguna melalui serangkaian lapisan perlindungan:

- **Login Sosial yang Aman (Google OAuth)**: Kami mendorong penggunaan login sosial. Dengan metode ini, Makalah AI tidak menyimpan *password* pengguna dalam bentuk apa pun di database kami. 
- **Verifikasi Kepemilikan (Ownership Enforcement)**: Tidak ada *endpoint* atau akses data (API) yang dibiarkan terbuka. Semua pengambilan data dari basis data (Convex) melalui pemeriksaan *Identity* dan `userId`. Meskipun seseorang berhasil menebak URL dokumen atau ID percakapan secara acak, sistem backend akan langsung menolak akses jika akun yang *login* tidak memiliki data tersebut.

---

## 2. Keamanan Integritas Dokumen & Proses

Pembuatan *paper* merupakan proses yang rentan terhadap modifikasi tak terduga. Untuk itu, kami merancang pengamanan integritas:

- **Alur Kerja Terkunci (Locked Workflows)**: Pembuatan dokumen ilmiah di platform kami dibagi ke dalam fase dan tahapan *state-machine* yang ketat (misal: Gagasan $\rightarrow$ Topik $\rightarrow$ Abstrak). Struktur ini mengunci data dari *stage* yang sudah disetujui (validated), mencegah manipulasi sewenang-wenang tanpa *history* revisi.
- **Transparansi Jejak (Provenance Tracking)**: Setiap referensi atau dokumen sumber yang dimasukkan oleh AI memiliki pelacakan metadata (asal URL, tahun publikasi, dll). Pengguna dapat memverifikasi darimana AI mengambil argumen tersebut, menjaga keaslian riset dan mencegah pemalsuan (*hallucinated citations*).

---

## 3. Keamanan File dan Lampiran Fisik

Bagi dokumen PDF atau materi riset pendukung yang diunggah pengguna ke sistem:

- **Penyimpanan Terenkripsi**: Semua file fisik diletakkan pada infrastruktur Convex Storage yang dienkripsi secara penuh. File ini terlindungi dari tautan publik dan hanya dapat diambil dengan *token* autentikasi valid dari sang pemilik.
- **Batas Aman 10MB**: Untuk mencegah serangan injeksi memori atau penyalahgunaan sumber daya (DDoS via file raksasa), sistem memberlakukan limit keras ukuran maksimal file unggahan sebesar 10MB per dokumen. Hal ini juga menjamin stabilitas performa proses ekstraksi teks ke model LLM.

---

## 4. Standar Pembayaran Global

- **Mitra Terverifikasi PCI-DSS**: Pemrosesan pembayaran dan manajemen kartu langganan diserahkan sepenuhnya kepada *payment gateway* berstandar keamanan internasional (PCI-DSS). **Sistem Makalah AI tidak pernah menyentuh, membaca, apalagi menyimpan data nomor kartu kredit atau PIN pengguna.**
- **Proteksi Webhook Idempotent**: Seluruh sinyal konfirmasi pembayaran dari Xendit diverifikasi menggunakan Token rahasia khusus dan divalidasi dengan logika *Idempotency* (mencegah manipulasi kuota atau kredit dari pengiriman sinyal *success* duplikat/palsu oleh pihak tak bertanggung jawab).

---

## 5. Partisipasi Keamanan Pengguna

Sistem diatur sebaik mungkin, namun keamanan *end-to-end* membutuhkan andil aktif dari pengguna:
- Jika menggunakan metode login Email & Password (bukan Google OAuth), diwajibkan menyusun **password yang kuat**.
- **Praktik Anonimisasi Mandiri**: Pengguna diimbau untuk *tidak* memasukkan atau mengunggah data identitas sensitif (seperti NIK, nomor rekening, PIN, dokumen rahasia korporat) ke dalam kolom obrolan dengan *agent* AI. 
