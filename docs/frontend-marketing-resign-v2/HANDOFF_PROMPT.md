# Handoff Prompt: Frontend Marketing Redesign v2 — COMPLETE MOCKUP PHASE

**Konteks Utama:**
Kamu sedang melanjutkan proyek redesain landing page Makalah AI. Sesi sebelumnya telah menyelesaikan **High-Fidelity Mockup (HTML/CSS/JS)** yang sudah disetujui dan di-polish secara maksimal.

**LOKASI KERJA (MANDATORY):**
Seluruh pengerjaan fitur/redesign ini **WAJIB** dilakukan di dalam folder worktree: 
` /Users/eriksupit/Desktop/makalahapp/.worktrees/frontend-marketing-resign-v2 `
**JANGAN** bekerja di root repository utama. Segala perubahan file harus dilakukan di path ini.

**Status Saat Ini:**
- **Mockup Selesai**: Struktur lengkap (Hero, Benefits Bento, Workflow, Refrasa, Pricing, Footer) tersedia di `/docs/frontend-marketing-resign-v2/mockup/`.
- **Aestetika Premium**: Sudah diterapkan efek *Noise Texture*, *Ambient Glow*, *Bento Mouse-Tracking Glow*, *Parallax Background*, dan *Glassmorphism*.
- **Data Aktual**: Teks dan aset sudah sinkron dengan `makalah.ai` live (menggunakan data dari Convex & CMS).

**Scope Tugas Selanjutnya (Implementation Phase):**
Transformasikan mockup statis tersebut ke dalam komponen React/Next.js di dalam `src/components/marketing/` pada worktree ini.

**Constraints (Aturan Ketat):**
1. **Source of Truth**: Gunakan `/docs/frontend-marketing-resign-v2/mockup/` sebagai panduan visual dan struktural utama.
2. **Design System**: Gunakan token warna dan variabel dari `src/app/globals-new.css`.
3. **Aset**: Gunakan aset logo dan image dari folder `/public/` di dalam worktree ini.
4. **Logika Bisnis**: Pastikan komponen baru tetap terhubung dengan data fetching (Convex) sebagaimana komponen lama.

**Langkah Pertama yang Harus Kamu Lakukan (Next Steps):**
1. Buka dan pelajari file `index.html` dan `styles.css` di `docs/frontend-marketing-resign-v2/mockup/` untuk memahami cara kerja glow dan grid-nya.
2. Buat **Implementation Plan** untuk migrasi section per section ke React components.
3. Selalu tanya user (pake gaya Jakarta gue-lo) sebelum membuat keputusan arsitektural besar.

Good luck. Jaga kualitas estetika "Screen.studio/Linear" ini pas masuk ke fase kode React.
