# Convex: Arsitektur Reactive Backend

Makalah AI menggunakan **Convex** sebagai infrastruktur backend utama yang mengintegrasikan basis data *realtime*, fungsi *serverless*, dan mekanisme sinkronisasi data otomatis. Penggunaan Convex menghilangkan kebutuhan akan manajemen *state* manual antara server dan klien, memastikan transisi antar tahap penulisan makalah berjalan secara instan dan reaktif.

## Pilar Utama Implementasi
1. **Realtime Database**: Setiap perubahan pada status naskah atau pesan AI langsung tersinkronisasi ke UI pengguna tanpa perlu *polling*.
2. **Schema-as-Code**: Seluruh struktur data didefinisikan secara deklaratif menggunakan TypeScript, menjamin integritas data di seluruh lapisan aplikasi (lihat `convex/schema.ts`).
3. **Reactive Orchestration**: Logic *paper workflow* dijalankan langsung di atas Convex, memungkinkan koordinasi antar stage AI (14 tahap) tetap konsisten.
4. **Scheduled Jobs (Crons)**: Mekanisme otomatis untuk pemeliharaan data dan logika bisnis berkala (lihat `convex/crons.ts`).

## Struktur Data Inti (Audit Forensik)
Berdasarkan audit pada `convex/schema.ts`, tabel-tabel berikut merupakan komponen kritikal:
- **`paperSessions`**: Mengatur status *workflow* makalah, stage aktif, dan menyimpan histori revisi untuk mekanisme *rewind*.
- **`artifacts`**: Menyimpan output terstruktur dari setiap tahap AI (Outline, Abstrak, hingga Naskah Final).
- **`usageEvents` & `userQuotas`**: Sistem pelacakan kuota token dan estimasi biaya (IDR) secara granular untuk setiap interaksi LLM.
- **`aiTelemetry`**: Monitoring kesehatan AI (latensi, provider, model, status sukses/gagal) untuk observabilitas sistem.

## Isolasi Environment
Makalah AI menerapkan pemisahan database yang ketat untuk menjamin keamanan dan stabilitas:
- **Development Environment**: `dev:wary-ferret-59` (Digunakan untuk iterasi fitur dan *testing* internal).
- **Production Environment**: `production (basic-oriole-337)` (Environment publik yang melayani pengguna asli).

## Fitur Khusus Backend
- **Rewind System**: Memanfaatkan field `revision` pada `paperSessions` untuk memungkinkan pengguna kembali ke tahap sebelumnya tanpa merusak integritas alur kerja.
- **Webhook Integration**: Penanganan notifikasi pembayaran Xendit secara asinkron di sisi server untuk pembaruan kuota (*credits*) secara instan.
- **Automated Maintenance**: Penggunaan Cron jobs untuk pengecekan langganan kedaluwarsa (`check-expired-subscriptions`) dan pembersihan telemetri tua (`cleanup-old-ai-telemetry`) secara otomatis.

---
**Rujukan Kode:**
- [convex/schema.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/schema.ts): Definisi skema tabel, indeks, dan validasi data.
- [convex/auth.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/auth.ts): Integrasi BetterAuth dengan Convex.
- [convex/crons.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/crons.ts): Definisi *scheduled jobs* otomatis.
- [src/lib/convex/retry.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/convex/retry.ts): Logika *resilience* untuk operasi database.
