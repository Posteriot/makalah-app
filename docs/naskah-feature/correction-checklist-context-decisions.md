# Naskah Docs Correction Checklist

## Purpose

Dokumen ini adalah checklist kerja untuk koreksi:
- `docs/naskah-feature/context.md`
- `docs/naskah-feature/decisions.md`

Dokumen ini dipakai sebagai acuan revisi sebelum penyusunan design doc dan implementation plan.
Setiap kali satu section selesai dikoreksi, status checklist terkait wajib diperbarui di dokumen ini.

## Usage Rule

- Gunakan checklist ini sebagai source of progress selama koreksi.
- Setiap item dimulai dalam status belum selesai.
- Setelah satu section selesai direvisi, ubah checkbox item terkait menjadi selesai.
- Jika arah revisi berubah, perbarui checklist ini lebih dulu atau bersamaan dengan perubahan dokumen utama.

## Status Legend

- `[ ]` belum dikoreksi
- `[x]` sudah dikoreksi

## Context.md Correction Checklist

### Purpose
- [x] Tegaskan bahwa `context.md` hanya menyimpan konteks stabil yang sudah lolos verifikasi ke codebase, bukan hasil percakapan mentah.
- [x] Tambahkan kalimat bahwa baseline teknis di dokumen ini harus mengikuti kondisi codebase aktual.

### Source
- [x] Ubah wording dari konteks yang berasal dari percakapan menjadi konteks yang berasal dari percakapan dan telah diverifikasi ke codebase.
- [x] Kurangi framing yang membuat `chat.txt` terlihat sebagai authority utama.

### Feature Summary
- [x] Pisahkan definisi fitur dari aspirasi UX.
- [x] Tambahkan batas fase awal bahwa `Naskah` adalah workspace read-only terpisah.
- [x] Perjelas penggunaan istilah `final` dan `tervalidasi` agar tidak kabur.

### Problem Being Solved
- [x] Pertahankan problem statement produk.
- [x] Tambahkan gap arsitektural bahwa sistem belum memiliki compiled paper state yang eksplisit.

### Original Idea From Conversation
- [x] Ringkas bagian ini menjadi konteks historis singkat.
- [x] Tandai bahwa beberapa ide awal tidak dibawa ke fase 1.
- [x] Hindari format yang bisa dibaca sebagai commitment implementasi aktif.

### Working Definitions
- [x] Perjelas definisi `Naskah` sebagai compiled document workspace atau compiled document state.
- [x] Perjelas definisi `Artifact`, termasuk hubungan artifact content, artifact version, dan `stageData.artifactId`.
- [x] Pertahankan pembeda `Validation Panel`.
- [x] Tambahkan batas peran `Chat Window` sebagai host workflow, bukan pemilik state `Naskah`.

### Stable Product Model
- [x] Pisahkan model mental produk yang stabil dari perilaku fase 1 yang masih berupa target implementasi.
- [x] Kurangi detail UI yang seharusnya hidup di `decisions.md`.
- [x] Sisakan hanya prinsip produk yang benar-benar stabil.

### Artifact Workspace
- [x] Tambahkan bahwa edit artifact berjalan melalui versioning, bukan overwrite langsung.
- [x] Tegaskan bahwa artifact tetap unit kerja modular per stage.

### Naskah Workspace
- [x] Ringkas daftar bullet yang terlalu granular dan terlalu UI-specific.
- [x] Tambahkan definisi bahwa `Naskah` membutuhkan compiled snapshot atau compiled state sendiri.
- [x] Tegaskan bahwa `Naskah` bukan auto-mirror live tanpa kontrol user.
- [x] Tegaskan bahwa `Naskah` bukan sekadar render artifact tunggal.
- [x] Tandai mana yang baseline stabil dan mana yang masih target fase awal.

### Validation Flow
- [x] Tambahkan bahwa `validatedAt` adalah fondasi pertumbuhan `Naskah`.
- [x] Tegaskan bahwa `Naskah` tidak mengubah authority approval flow yang sudah ada.

### Chat Flow
- [x] Tegaskan bahwa chat hanya menjadi host navigasi dan workflow induk.
- [x] Tambahkan bahwa route atau topbar `Naskah` belum ada di codebase saat ini.

### Source Of Truth Baseline
- [x] Tulis ulang section ini secara besar.
- [x] Definisikan hubungan artifact content, artifact version chain, `stageData`, dan compiled naskah state.
- [x] Putuskan dan tulis dengan tegas sumber compile fase 1.
- [x] Tulis eksplisit gap antara ideal source of truth dan implementasi codebase sekarang.
- [x] Tambahkan rule kapan `Naskah` dianggap outdated setelah artifact berubah.

### Rendering Baseline
- [x] Pisahkan compiler dokumen, web preview renderer, dan export renderer.
- [x] Tambahkan bahwa web preview paged belum ada di codebase sekarang.
- [x] Hindari kalimat yang membuat renderer terlihat sudah tersedia.
- [x] Rapikan mapping stage-to-section agar tetap jadi konteks, bukan keputusan operasional yang kabur.

### Technical Baseline Mentioned In Conversation
- [x] Ganti heading agar tidak lagi berbasis “mentioned in conversation”.
- [x] Ubah isi menjadi baseline hasil audit codebase.
- [x] Kelompokkan menjadi `sudah ada`, `ada tapi belum cocok`, dan `belum ada`.
- [x] Tambahkan fakta export hanya valid untuk session `completed`.
- [x] Tambahkan fakta compiler existing masih compile dari `stageData`.
- [x] Tambahkan fakta artifact update menyinkronkan `artifactId` di `stageData`.
- [x] Tambahkan fakta topbar atau route `Naskah` belum ada.
- [x] Tambahkan fakta web paginated preview belum ada.

### Constraints
- [x] Tambahkan constraint bahwa belum ada state `naskah available`.
- [x] Tambahkan constraint bahwa belum ada state `pending update`.
- [x] Tambahkan constraint bahwa belum ada snapshot atau revision state untuk manual refresh.
- [x] Tambahkan constraint bahwa export parsial belum didukung backend sekarang.
- [x] Tegaskan bahwa `Artifact Viewer` bukan fondasi reusable langsung untuk `Naskah`.

### Risks Baseline
- [x] Tambahkan risiko mismatch antara ideal source of truth dan compiler aktual.
- [x] Tambahkan risiko keputusan UI mendahului model data.
- [x] Tambahkan risiko badge update palsu tanpa compiled revision state.
- [x] Tambahkan risiko design doc salah arah bila partial export diasumsikan sudah supported.

### Maintenance Rule
- [x] Tambahkan rule bahwa baseline teknis harus bisa ditelusuri ke codebase.
- [x] Tambahkan rule bahwa gap antara ideal arsitektur dan codebase harus ditulis eksplisit.

## Decisions.md Correction Checklist

### Purpose
- [x] Tegaskan bahwa keputusan di dokumen ini harus implementable atau jelas statusnya.
- [x] Tambahkan bahwa keputusan UI tidak boleh berdiri tanpa keputusan model data yang mendasari.

### Current Active Direction
- [x] Tulis ulang jadi ringkasan operasional.
- [x] Tambahkan posisi compiler source fase 1.
- [x] Tambahkan posisi state update model.
- [x] Tambahkan posisi export parsial.

### D-001 Artifact Tetap Menjadi Source Of Truth
- [x] Perjelas definisi `source of truth`.
- [x] Putuskan apakah compile membaca artifact content langsung atau normalized state turunan dari artifact.
- [x] Tambahkan implikasi ke versioning dan refresh.

### D-002 Edit Tetap Terjadi Di Artifact Pada Fase Awal
- [x] Tambahkan rule kapan edit artifact memengaruhi kandidat `Naskah`.
- [x] Kaitkan keputusan ini dengan lifecycle `validatedAt`.

### D-003 Naskah Bersifat Read-Only Pada Fase Awal
- [x] Tegaskan bahwa ini keputusan fase 1, bukan prinsip permanen.

### D-004 Arah Sinkronisasi Adalah Artifact Ke Naskah
- [x] Tambahkan definisi kapan sinkronisasi menghasilkan `update pending`.
- [x] Tambahkan model pembanding seperti snapshot, hash, timestamp, atau revision counter.

### D-005 Naskah Harus Menjadi Halaman Terpisah Fullscreen
- [x] Tambahkan dependency teknis berupa route baru, topbar route awareness, dan shell lintas halaman.

### D-006 Naskah Bukan Markdown Preview Biasa
- [x] Tambahkan implikasi teknis minimum renderer fase 1.
- [x] Bedakan preview akademik dari preview yang identik dengan export final.

### D-007 Naskah Harus Mendukung Estimasi Halaman Dan Export
- [x] Pisahkan keputusan estimasi halaman dan export menjadi dua concern yang berbeda.
- [x] Tambahkan catatan bahwa export fase awal blocked jika masih memakai pipeline backend sekarang.

### D-008 Tombol Naskah Muncul Setelah Abstrak Tervalidasi
- [x] Tambahkan definisi formal `naskah available`.
- [x] Putuskan apakah availability berbasis `validatedAt` atau hasil compiler yang sukses.

### D-009 Update Naskah Bersifat Manual Dengan Indikator
- [x] Revisi besar section ini.
- [x] Tambahkan definisi formal `update pending`.
- [x] Tambahkan pembanding antara latest compiled revision dan viewed compiled revision.
- [x] Tegaskan bahwa `isDirty` bukan pengganti state ini.

### D-010 sampai D-011
- [x] Tambahkan rule eligibilitas section.
- [x] Jelaskan apakah tervalidasi saja cukup atau masih harus lolos guard kompilasi.

### D-012 sampai D-014
- [x] Tambahkan dependency ke output compiler yang sudah memetakan section final.

### D-015 Export Tersedia Sejak Naskah Ada Dengan Label Parsial
- [x] Tinjau ulang status keputusan ini.
- [x] Pilih apakah tetap active dengan dependency backend baru atau dipindah ke deferred.
- [x] Jangan biarkan tetap active tanpa catatan bentrok dengan codebase.

### D-016 Revisi Section Menggantikan Versi Naskah Sebelumnya
- [x] Tambahkan rule apakah revisi yang belum tervalidasi ulang boleh memicu update pending.

### D-017 sampai D-037
- [x] Kelompokkan ulang keputusan yang terlalu detail UI.
- [x] Pisahkan keputusan struktur UI inti dari copy atau polish.
- [x] Jaga agar keputusan arsitektur tidak tenggelam oleh micro-decisions.

### D-018 Navigasi Ke Naskah Tidak Otomatis Memuat Update Pending
- [x] Tambahkan dependency ke model snapshot atau revision.
- [x] Jika dependency belum diputuskan, beri caveat bahwa keputusan ini belum sepenuhnya operasional.

### D-019 Chat Dan Naskah Dipindahkan Lewat Tombol Kontekstual Di Topbar
- [x] Tambahkan implikasi ke route hierarchy dan shared shell behavior.

### D-020 sampai D-035
- [x] Rapikan urutan dari struktur layout, perilaku, lalu copy.
- [x] Kurangi campuran keputusan layout dengan microcopy.

### D-038 sampai D-041
- [x] Tambahkan rule artifact atau stage mana yang benar-benar dibaca.
- [x] Tambahkan rule jika stage tervalidasi tetapi artifact sudah invalidated.
- [x] Tambahkan fallback bila working title tidak tersedia.

### D-042 sampai D-053
- [x] Tandai sebagai layout-phase decisions.
- [x] Pastikan tidak terbaca sebagai janji identik terhadap export final.

### D-054 Section Ditahan Jika Artifact Belum Cukup Rapi Untuk Dikompilasi
- [x] Tambahkan definisi minimum `cukup rapi`.
- [x] Tambahkan siapa yang menilai kelayakan compile.
- [x] Tambahkan bentuk deterministic guard atau rule evaluasi minimum.

### D-055 Preview Web Ditargetkan Sangat Dekat Dengan Export Final
- [x] Tambahkan batas realistis dari target kualitas ini.
- [x] Tegaskan bahwa ini target kualitas, bukan kontrak identik.
- [x] Tambahkan implikasi bahwa preview dan export bisa tetap lewat renderer berbeda.

### D-056 sampai D-059
- [x] Pindahkan atau kelompokkan ke subbagian khusus keputusan copy atau presentasi.

### Open Questions
- [x] Audit ulang status `resolved`.
- [x] Buka kembali atau beri caveat pada item yang baru resolved di level UX tetapi belum resolved di level arsitektur.
- [x] Fokus audit pada refresh or update state, export parsial, compile source, dan compile guard.

### Deferred Or Rejected Directions
- [x] Tambahkan alasan bahwa editable `Naskah` deferred bukan hanya karena scope UX, tetapi juga karena model sinkronisasi belum ada.

### Decision Update Rule
- [x] Tambahkan rule bahwa keputusan yang bentrok dengan codebase harus diberi status yang eksplisit.

### Change Log
- [x] Rapikan change log agar berisi perubahan substantif.
- [x] Kurangi gaya daftar isi yang terlalu panjang.
- [x] Catat revisi dengan alasan arsitektural yang jelas.

## Highest Priority Sections

- [x] `context.md` -> `Source Of Truth Baseline`
- [x] `context.md` -> `Technical Baseline`
- [x] `context.md` -> `Constraints`
- [x] `decisions.md` -> `Current Active Direction`
- [x] `decisions.md` -> `D-001` sampai `D-009`
- [x] `decisions.md` -> `D-015`
- [x] `decisions.md` -> `D-054`
- [x] `decisions.md` -> `D-055`
- [x] `decisions.md` -> `Open Questions`

## Progress Notes

- [x] Checklist disusun sebagai acuan koreksi awal.
- [x] Checklist siap dipakai untuk update progres per section setelah koreksi dimulai.
- [x] Batch koreksi pertama selesai untuk section prioritas utama di `context.md`.
- [x] Batch koreksi pertama selesai untuk sebagian besar section prioritas di `decisions.md`, dengan beberapa item masih perlu penajaman lanjutan.
- [x] Batch koreksi kedua selesai untuk penajaman source of truth, availability, update pending, compile guard, dan preview/export caveat di `decisions.md`.
- [x] Batch koreksi ketiga selesai untuk grouping keputusan UI/kompilasi/layout, penajaman rule section eligibility, dan kompresi change log.
- [x] Pass editorial ringan selesai untuk mengurangi wording yang repetitif, menguatkan ketegasan istilah, dan merapikan beberapa kalimat anchor tanpa mengubah arah arsitektur.
- [x] Pass audit keras selesai untuk membuang detail UI yang terlalu dini dari `context.md`, menurunkan potensi salah baca pada keputusan export fase 1, dan menandai open questions yang baru resolved di level intent tetapi masih punya dependency implementasi.
- [x] Residual risk terakhir dibersihkan dengan memindahkan mapping section yang masih decision-ish keluar dari `context.md`, sehingga dokumen konteks tetap lean dan `decisions.md` menjadi satu-satunya tempat untuk aturan mapping aktif.
- [x] Final pass konsistensi istilah selesai untuk menyeragamkan istilah availability `Naskah`, `update pending`, dan compiled snapshot/revision antar dua dokumen.
