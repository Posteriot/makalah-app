# Context — Download Full Paper Artifact-Based

> Branch: `feature/paper-sessions-enforcement`  
> Date: 2026-04-06  
> Scope: handoff context untuk follow-up desain/implementasi mekanisme `download all paper` yang berbasis artifact/final artifact  
> Status: belum dikerjakan; sistem saat ini masih export full paper dari `paperSession.stageData`

## Ringkasan

Saat ini session paper sudah bisa mencapai status:
- `currentStage === "completed"`
- `stageStatus === "approved"`

Dan UI akhir sudah menunjukkan dua hal penting:
- riwayat artifact lengkap di sidebar percakapan
- linimasa/progress sidebar sudah penuh (`14/14`)

Masalah arsitektural yang tersisa:
- user melihat artifact history sebagai representasi hasil kerja final
- tetapi export full paper (`Word/PDF`) tidak disusun dari artifact
- export sekarang disusun dari `paperSession.stageData`

Artinya ada **dua model representasi output**:
- `artifact` = review history per tahap
- `stageData` = source of truth untuk compile/export full paper

Itu masih valid secara teknis, tetapi kurang konsisten secara mental model produk.

## Kondisi Faktual Saat Ini

### 1. Export full paper sudah ada

Endpoint export yang sudah ada:
- [word route](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/export/word/route.ts)
- [pdf route](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/export/pdf/route.ts)

Validasi export:
- [validation.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/export/validation.ts)

Compiler konten:
- [content-compiler.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/export/content-compiler.ts)

### 2. Export full paper saat ini tidak berbasis artifact

`compilePaperContent(session)` membaca dari:
- `session.stageData.judul`
- `session.stageData.abstrak`
- `session.stageData.pendahuluan`
- `session.stageData.tinjauan_literatur`
- `session.stageData.metodologi`
- `session.stageData.hasil`
- `session.stageData.diskusi`
- `session.stageData.kesimpulan`
- `session.stageData.daftar_pustaka`
- `session.stageData.lampiran`

Bukan dari isi artifact yang divalidasi satu per satu.

### 3. Riwayat artifact justru sangat terlihat di UI

Di flow paper mode, user sekarang melihat:
- artifact per tahap di sidebar riwayat percakapan
- artifact panel pada tiap stage review/validation
- final stage `completed` yang secara UX terasa seperti seluruh paper sudah tersusun rapi di artifact history

Jadi ada mismatch UX:
- UI sangat artifact-centric
- export final masih stateData-centric

## Kenapa Ini Layak Jadi Follow-Up

### Manfaat jika ada mekanisme artifact-based final paper

1. Menyatukan source of truth untuk output yang direview user.
   Yang user buka, revisi, dan approve di artifact lebih dekat ke apa yang nanti diunduh.

2. Mengurangi drift antara `stageData` dan artifact history.
   Saat ini secara teori ada risiko:
   - stageData tersimpan
   - artifact ter-update
   - tetapi ada perbedaan subtle antara keduanya

3. Memperjelas mental model produk.
   User bisa memahami:
   - “semua bagian paper ada di artifact”
   - “paper final adalah kompilasi dari artifact yang sudah disetujui”

4. Mempermudah audit.
   Bisa lebih mudah menjawab:
   - apa yang disetujui user
   - apa yang akhirnya masuk ke dokumen final

## Yang Perlu Diluruskan

### Ini bukan bug blocker untuk branch sekarang

Export final dari `stageData` tetap valid dan bisa terus dipakai.

Jadi follow-up ini sebaiknya diposisikan sebagai:
- hardening arsitektur
- penyatuan mental model UI/export
- bukan emergency fix

### Ini juga tidak harus berarti semua export harus langsung pindah dari stageData

Ada beberapa opsi desain. Tidak harus semua logic lama dibuang.

## Opsi Desain

### Opsi A — Final compiled artifact sebagai layer baru

Tambahkan konsep artifact final ketika session mencapai `completed`, misalnya:
- title: `Paper Final`
- type: bisa tetap `section` atau tipe baru jika diperlukan
- content: hasil kompilasi seluruh artifact/stage final yang sudah disetujui

Alur:
1. session menjadi `completed`
2. sistem menyusun full paper final
3. sistem membuat/update satu `final compiled artifact`
4. export `Word/PDF` bisa memakai artifact final ini atau tetap memakai compiler yang sama tetapi dengan artifact final sebagai cache/output eksplisit

Kelebihan:
- paling jelas untuk user
- ada satu artifact final yang bisa dibuka
- cocok untuk preview/download final

Kekurangan:
- perlu lifecycle baru saat stage selesai
- perlu keputusan apakah final artifact editable atau read-only

### Opsi B — Compile export langsung dari artifact per tahap

Compiler export tidak lagi membaca `stageData`, tapi membaca artifact approved/latest dari tiap tahap.

Kelebihan:
- lebih murni artifact-centric
- export benar-benar mengikuti artifact yang user review

Kekurangan:
- perlu mapping artifact-per-stage yang kuat
- harus menangani beberapa artifact khusus seperti:
  - `daftar_pustaka` yang punya history dan bisa v4
  - `lampiran` placeholder “tidak ada lampiran”
  - `pembaruan_abstrak` vs `abstrak` awal
- lebih rawan kalau artifact shape lintas tahap tidak seragam

### Opsi C — Hybrid: stageData tetap source utama, final artifact hanya representasi final

Pertahankan export dari `stageData`, tetapi setelah `completed`:
- buat `final compiled artifact`
- gunakan itu untuk preview/history/download entry point di UI

Kelebihan:
- paling kecil risiko migrasi
- tidak mengganggu pipeline export lama
- UX lebih konsisten tanpa refactor besar

Kekurangan:
- masih ada dual source of truth di backend
- hanya mengurangi mismatch, bukan menghilangkannya

## Rekomendasi

### Rekomendasi utama: mulai dari Opsi C

Untuk follow-up branch, pendekatan paling pragmatis adalah:
- **tetap pertahankan export builder berbasis `stageData`**
- **tambahkan satu final compiled artifact di session `completed`**

Kenapa ini paling aman:
- scope kecil
- tidak memaksa rewrite compiler export yang sudah ada
- UI penutup sesi bisa jujur bilang:
  - semua artifact per tahap tersedia di riwayat
  - paper final juga tersedia sebagai artifact final
  - export final melanjutkan dari hasil final yang sudah tersusun

### Kenapa belum saya rekomendasikan Opsi B

Karena saat ini artifact tiap tahap belum tentu seragam untuk dijadikan satu-satunya source compiler, misalnya:
- beberapa stage menyimpan data struktural penting di `stageData`
- daftar pustaka punya compile persist flow tersendiri
- abstrak final berasal dari `pembaruan_abstrak`, bukan abstrak awal

Opsi B layak hanya kalau memang ingin migrasi penuh ke artifact-centric architecture.

## Scope Kerja yang Mungkin di Branch Lain

### 1. Tentukan bentuk `final compiled artifact`

Putuskan:
- apakah tipe artifact baru diperlukan
- atau cukup pakai tipe existing dengan title baku seperti `Paper Final`

Hal yang perlu diputuskan:
- editable vs read-only
- visible di sidebar history vs panel khusus
- versioning saat ada revisi setelah completed

### 2. Buat compiler final artifact

Kemungkinan reuse:
- [content-compiler.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/export/content-compiler.ts)

Tambahan yang dibutuhkan:
- formatter ke markdown/text final paper
- heading/urutan section final
- kebijakan untuk:
  - lampiran kosong
  - daftar pustaka numbering
  - abstrak final vs abstrak awal

### 3. Tentukan trigger lifecycle

Contoh trigger:
- saat user approve tahap `judul` dan nextStage menjadi `completed`
- sistem langsung membuat/update final artifact

Atau:
- lazy generation saat user membuka completed session
- atau saat user menekan CTA “Lihat paper final”

### 4. Putuskan hubungan dengan export Word/PDF

Pilihan:
- export tetap dari `stageData`, final artifact hanya mirror
- export dari final artifact content
- export dari compiler yang sama, tetapi final artifact disimpan sebagai snapshot output

### 5. Pastikan sinkron dengan UI completed-state

Completed-state response/template nantinya bisa mengarahkan user ke:
- riwayat artifact seluruh tahap
- final compiled artifact
- export dokumen final

## Risiko dan Hal yang Perlu Diwaspadai

### 1. Drift antara final artifact dan stageData

Kalau final artifact dibuat sebagai snapshot, perlu aturan:
- kapan di-regenerate
- apakah invalid jika ada reopen/revision di stage akhir

### 2. Multiple versions setelah completed

Kalau user melakukan revisi setelah completed:
- apakah final artifact di-update
- apakah versi lama tetap disimpan
- apakah completed session kembali ke state non-final

### 3. Bentuk konten lintas tahap

Tidak semua stage punya bentuk artifact yang seragam atau final-ready untuk digabung mentah-mentah.

### 4. UX ambiguity

Perlu jelas membedakan:
- artifact per tahap
- final compiled artifact
- export file (`.docx` / `.pdf`)

## Pertanyaan Desain untuk Sesi Lain

1. Apakah final artifact harus read-only?
2. Apakah final artifact dibuat otomatis saat session `completed`, atau on-demand?
3. Apakah export harus membaca final artifact, atau cukup tetap membaca `stageData`?
4. Bagaimana final artifact diperbarui jika session direvisi setelah completed?
5. Apakah sidebar history perlu grup baru seperti:
   - `Paper Final`
   - `Tahapan Penyusunan`

## File Relevan

- [content-compiler.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/export/content-compiler.ts)
- [validation.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/export/validation.ts)
- [word route](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/export/word/route.ts)
- [pdf route](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/app/api/export/pdf/route.ts)
- [artifacts.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/convex/artifacts.ts)
- [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/convex/paperSessions.ts)
- [paper-mode-prompt.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/lib/ai/paper-mode-prompt.ts)
- [SidebarChatHistory.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/components/chat/sidebar/SidebarChatHistory.tsx)
- [SidebarProgress.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/agentic-paper-sessions-enforcement/src/components/chat/sidebar/SidebarProgress.tsx)

## Exit Criteria untuk Follow-Up Branch

Pekerjaan ini bisa dianggap siap jika:
1. ada keputusan arsitektur yang eksplisit: `stageData-only`, `artifact-final`, atau `fully artifact-based`
2. completed session punya jalur yang jelas untuk melihat full paper final
3. copy/template penutup sesi konsisten dengan real capability produk
4. user bisa membedakan dengan jelas:
   - riwayat artifact per tahap
   - paper final
   - export file final
5. jika final artifact ditambahkan, ada aturan update/invalidation yang jelas saat session direvisi kembali
