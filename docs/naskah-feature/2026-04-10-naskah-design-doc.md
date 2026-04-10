# Naskah Feature Design Doc

## Status

Draft kerja yang disusun dari:
- `docs/naskah-feature/context.md`
- `docs/naskah-feature/decisions.md`
- audit codebase yang sudah dirangkum di dua dokumen tersebut

Dokumen ini diposisikan sebagai anchor desain teknis untuk fase awal `Naskah`.
Implementation plan harus diturunkan dari dokumen ini, bukan dari percakapan mentah.

## Ringkasan

`Naskah` adalah workspace terpisah untuk membaca paper akademik utuh yang dikompilasi dari artifact tervalidasi lintas stage.
Pada fase awal, `Naskah` bersifat read-only, tumbuh bertahap mengikuti validasi section, dan tidak menjadi tempat edit utama.

Desain ini sengaja tidak menumpang langsung pada pipeline export existing.
Alasannya, compiler dan export yang ada sekarang masih bertumpu pada `stageData` serta masih dibatasi untuk session `completed`.
Karena itu, fase awal `Naskah` membutuhkan compiler, state, dan shell UI sendiri yang jujur terhadap kondisi codebase saat ini.

## Problem Statement

Flow sekarang sudah mendukung kerja modular per stage melalui artifact, chat, dan validation panel.
Yang belum ada adalah pengalaman membaca paper utuh sebagai satu dokumen selama proses penulisan masih berjalan.

Akibat gap ini:
- user hanya melihat output modular, bukan paper utuh
- user sulit mengevaluasi bentuk akhir paper secara menyeluruh
- user belum punya estimasi panjang dokumen yang terasa nyata
- pengalaman melihat paper utuh belum tersambung ke arah preview akademik yang kelak dekat ke export final

Di sisi arsitektur, sistem juga belum memiliki compiled paper state yang eksplisit.
Tanpa layer itu, `Naskah` tidak bisa dibangun dengan jujur hanya dengan menyamakan artifact viewer atau export pipeline sekarang.

## Goals

- Menyediakan halaman `Naskah` terpisah dari chat sebagai workspace baca paper utuh.
- Menampilkan paper sebagai compiled academic preview read-only.
- Menumbuhkan isi `Naskah` dari section yang sudah tervalidasi saja.
- Menjaga artifact sebagai source of truth authoring.
- Menambahkan model state yang memungkinkan `availability`, `update pending`, dan compiled revision dibaca secara eksplisit.
- Menjaga preview web sangat dekat dengan hasil export final, tanpa menjanjikan identik 100%.

## Non-Goals

- Edit manual langsung di `Naskah`.
- Bi-directional sync `Naskah` ke artifact.
- Memakai export completed-only existing sebagai jalur export parsial.
- Menyediakan export `Naskah` pada fase awal sebelum jalur khusus tersedia.
- Menyimpan full version history `Naskah` sebagai pengalaman user fase 1.

## Product Scope Fase 1

Fase 1 mencakup:
- entry point `Naskah` dari halaman chat ketika `Naskah` sudah available
- halaman `Naskah` fullscreen dengan preview paper paged
- daftar section final yang sudah eligible tampil
- refresh manual berbasis `update pending`
- title resolution dari `working title` ke judul final
- compile guard untuk section yang tervalidasi tetapi belum layak tampil

Fase 1 belum mencakup:
- export `Naskah` aktif
- edit di `Naskah`
- auto-refresh saat ada perubahan artifact
- sinkronisasi balik dari `Naskah` ke artifact

Catatan:
- struktur header boleh tetap mengakomodasi area aksi dokumen, tetapi affordance export aktif tetap deferred sampai jalur export `Naskah` khusus tersedia

## Current Code Reality

Fondasi yang sudah ada:
- workflow stage-based dengan `validatedAt`
- artifact per stage sebagai unit kerja modular
- `stageData` sebagai layer koordinasi session
- export DOCX dan PDF untuk paper final

Gap yang masih ada:
- route/topbar `Naskah` belum ada
- compiled naskah state belum ada
- web paginated preview belum ada
- model `availability Naskah`, `update pending`, dan compiled snapshot belum ada
- export existing hanya valid untuk session `completed`
- compiler existing masih membaca `stageData` untuk export final, bukan layer `Naskah`

Implikasinya:
- fase awal `Naskah` harus memperkenalkan layer desain baru, bukan sekadar reuse ringan dari jalur export sekarang

## Design Principles

- Source of truth tetap artifact tervalidasi.
- `stageData` tetap layer koordinasi workflow, bukan isi final dokumen.
- `Naskah` adalah compiled view, bukan editor.
- Section hanya muncul jika tervalidasi dan lolos compiler guard.
- Preview web mengikuti semantics layout yang sama dengan export, tetapi boleh memakai renderer berbeda.
- Status user harus jujur: tidak ada affordance export atau update yang belum punya dasar data.

## Proposed Architecture

Arsitektur fase 1 dibagi menjadi lima lapisan:

1. `Artifact + Validation Layer`
   Layer existing yang menghasilkan artifact per stage dan penanda `validatedAt`.

2. `Naskah Compiler Layer`
   Layer baru yang membaca artifact tervalidasi yang direferensikan oleh `stageData`, lalu menyusun compiled document model untuk preview.

3. `Naskah Snapshot Layer`
   Layer state baru yang menyimpan hasil compile terakhir, revision metadata, dan dasar pembanding untuk `update pending`.

4. `Naskah Web Preview Layer`
   Renderer web khusus untuk menampilkan compiled document model dalam bentuk paper preview paged.

5. `Naskah Shell Layer`
   Route, topbar entry point, sidebar, banner update, dan affordance navigasi antar halaman `Chat` dan `Naskah`.

## Core Data Model

Desain fase 1 membutuhkan compiled state yang eksplisit.
Minimal shape konseptualnya:

### `NaskahAvailability`

- `sessionId`
- `isAvailable`
- `availableAtRevision`
- `reasonIfUnavailable`

Makna:
- `isAvailable` bernilai benar jika `abstrak` sudah tervalidasi dan compiler berhasil membentuk minimal compiled content

### `NaskahCompiledSnapshot`

- `sessionId`
- `revision`
- `compiledAt`
- `sourceArtifactRefs`
- `title`
- `sections`
- `pageEstimate`
- `status`

Makna:
- `revision` adalah identitas monotonik snapshot terkompilasi
- `sourceArtifactRefs` mencatat artifact/version mana yang dipakai saat compile
- `sections` berisi section final yang sudah eligible tampil
- `status` menyatakan status dokumen fase awal, misalnya status bertumbuh

### `NaskahViewedState`

- `sessionId`
- `lastViewedRevision`
- `viewedAt`

Makna:
- dipakai untuk membandingkan compiled revision terbaru vs revision yang terakhir dimuat user

### `Update Pending`

Definisi:
- `update pending = latestCompiledRevision != lastViewedRevision`

Ini sengaja dipisahkan dari `isDirty`.
`isDirty` workflow tidak cukup karena tidak bicara tentang snapshot dokumen yang benar-benar siap ditampilkan.

## Compiler Design

### Source Inputs

Compiler `Naskah` membaca:
- session `stageData` untuk menentukan referensi artifact yang relevan
- artifact tervalidasi yang direferensikan oleh `stageData`
- metadata validasi untuk menentukan eligibility section

Compiler `Naskah` tidak membaca:
- draft artifact yang belum tervalidasi ulang sebagai pengganti isi aktif
- state edit dari halaman `Naskah`

### Compiler Responsibilities

- memetakan stage internal ke section akademik final
- memilih artifact/version tervalidasi yang aktif
- menyusun title resolution
- menyusun urutan section final
- menahan section yang belum lolos compile guard
- menghasilkan compiled snapshot yang stabil untuk preview

### Section Mapping

Mapping final yang menjadi dasar compiler:
- `gagasan`, `topik`, `outline` tidak menjadi section isi
- `topik` boleh menyumbang `working title`
- `abstrak` menjadi `Abstrak`
- `pembaruan_abstrak` memperbarui section `Abstrak`
- `pendahuluan` menjadi `Pendahuluan`
- `tinjauan_literatur` menjadi `Tinjauan Literatur`
- `metodologi` menjadi `Metodologi`
- `hasil` menjadi `Hasil`
- `diskusi` menjadi `Diskusi`
- `kesimpulan` menjadi `Kesimpulan`
- `daftar_pustaka` menjadi `Daftar Pustaka`
- `lampiran` menjadi `Lampiran` jika tersedia
- `judul` tidak menjadi section, tetapi menggantikan judul dokumen

### Title Resolution

Aturan title:
- saat `Naskah` pertama kali available, compiler boleh memakai `working title` dari `topik`
- saat stage `judul` tervalidasi, judul final menggantikan `working title` sepenuhnya

### Section Eligibility

Sebuah section hanya masuk ke compiled snapshot jika:
- stage relevan sudah tervalidasi
- artifact tervalidasi yang aktif tersedia
- compiler guard menyatakan section cukup rapi untuk dirender

### Compile Guard

Guard minimal untuk `cukup rapi`:
- content wajib tersedia
- heading valid
- hasil transformasi tidak menghasilkan placeholder
- hasil transformasi tidak menghasilkan structural error yang merusak layout paper

Jika guard gagal:
- section ditahan
- section tidak tampil di `Naskah`
- compiler tetap boleh menghasilkan snapshot parsial untuk section lain yang lolos

## Snapshot Lifecycle

Lifecycle usulan:

1. Artifact tervalidasi berubah.
2. Sistem mengevaluasi apakah perubahan menyentuh input compiler `Naskah`.
3. Jika iya, sistem membuat compiled snapshot baru.
4. Snapshot baru menaikkan `revision`.
5. Jika user sedang melihat revision lama, state menjadi `update pending`.
6. Saat user menekan `Update`, viewed revision digeser ke revision terbaru.

Implikasi penting:
- perubahan artifact yang belum tervalidasi tidak otomatis mengganti isi `Naskah`
- perubahan itu baru masuk ke layer dokumen setelah menghasilkan compiled snapshot baru yang sah

## Route And Shell Design

### Routing

`Naskah` didesain sebagai halaman saudara dari `Chat`, bukan panel lokal.
Shell minimal fase 1:
- halaman `Chat` memiliki tombol `Naskah` jika available
- halaman `Naskah` memiliki tombol `Chat`
- topbar perlu route awareness untuk dua halaman ini

### Availability Rule

Entry point `Naskah` hanya muncul jika:
- `abstrak` sudah tervalidasi
- compiler dapat membentuk minimal compiled content

Kalau salah satu belum terpenuhi:
- tombol `Naskah` tidak muncul

## UI Model

UI fase 1 mengikuti keputusan aktif yang sudah ada:
- halaman fullscreen
- satu kolom preview paper di tengah
- sidebar kiri untuk daftar section eligible
- preview A4 paged dengan page break visual
- header dua baris
- status utama menggunakan badge `Bertumbuh` dan info text progresif
- estimasi halaman ditampilkan sebagai estimasi
- banner update tipis dengan CTA `Update`
- notifikasi update pada tombol `Naskah` berupa titik kecil
- area aksi dokumen di header hanya boleh menjadi affordance export aktif setelah keputusan export `Naskah` tidak lagi deferred

Dokumen ini tidak menetapkan detail visual di luar yang sudah diputuskan di `decisions.md`.
Kalau ada konflik antara copy/layout rinci dan dokumen ini, `decisions.md` tetap menang untuk keputusan presentasi.

## Preview Rendering Model

Renderer web bertanggung jawab untuk:
- menampilkan title page
- menampilkan section final dalam urutan akademik
- menerapkan rule page break untuk section utama
- memberi estimasi halaman
- menjaga semantics layout tetap dekat dengan export final

Renderer web tidak bertanggung jawab untuk:
- menjadi renderer export final
- menjamin page-perfect parity dengan Word/PDF

Aturan layout fase awal:
- halaman judul tampil dulu
- `Abstrak` mulai di halaman kedua
- section utama berikutnya mulai di halaman baru
- `Daftar Pustaka` dan `Lampiran` diperlakukan sebagai section biasa jika eligible

## Backend Responsibilities

Backend fase 1 perlu menyediakan:
- query atau endpoint untuk mengecek availability `Naskah`
- query atau endpoint untuk mengambil latest compiled snapshot
- mekanisme untuk membandingkan viewed revision vs latest revision
- trigger atau lifecycle yang membuat snapshot baru saat input compiler berubah

Backend fase 1 belum perlu menyediakan:
- export `Naskah` aktif
- editing state `Naskah`
- merge logic `Naskah` ke artifact

## Frontend Responsibilities

Frontend fase 1 perlu menyediakan:
- route `Naskah`
- tombol kontekstual `Chat`/`Naskah`
- loading, empty, unavailable, dan available states yang jujur
- sidebar section outline
- preview renderer
- banner `update pending`
- interaksi refresh manual
- highlight sementara setelah refresh

Frontend tidak boleh:
- menampilkan affordance export aktif sebelum backend export `Naskah` tersedia
- auto-refresh isi dokumen tanpa aksi user
- memakai `isDirty` sebagai pengganti state `update pending`

## State Transitions

### Unavailable -> Available

Terjadi ketika:
- `abstrak` tervalidasi
- compiler berhasil menghasilkan minimal compiled content

### Available -> Update Pending

Terjadi ketika:
- ada compiled snapshot baru
- user masih melihat revision lama

### Update Pending -> Synced

Terjadi ketika:
- user menekan `Update`
- viewed revision sama dengan latest compiled revision

## Failure And Edge Cases

### Artifact Tervalidasi Tetapi Gagal Lolos Guard

Perilaku:
- section ditahan
- `Naskah` tetap dibentuk dari section lain yang valid
- UI tidak menampilkan placeholder palsu

### Rewind Membatalkan Validasi

Perilaku:
- section yang sebelumnya eligible keluar dari candidate snapshot
- snapshot baru dibuat jika hasil dokumen berubah

### Judul Final Belum Ada

Perilaku:
- pakai `working title` dari `topik` jika ada
- jangan membuat judul baru di luar data workflow

### Tidak Ada Update State Eksplisit

Perilaku yang dilarang:
- menyimpulkan `update pending` dari `isDirty`
- menampilkan badge update tanpa dasar snapshot/revision

## Trade-Offs

### Kenapa Tidak Reuse Export Pipeline Existing

Karena:
- export sekarang completed-only
- compiler sekarang masih membaca `stageData` untuk final export path
- kebutuhan `Naskah` adalah preview parsial yang tumbuh, bukan export final yang menunggu lengkap

### Kenapa Perlu Compiled Snapshot Baru

Karena tanpa snapshot:
- `update pending` tidak punya dasar pembanding
- refresh manual tidak bisa didefinisikan dengan jujur
- highlight pasca-refresh tidak punya sumber diff yang jelas

### Kenapa `Naskah` Tetap Read-Only

Karena:
- menjaga source of truth tetap satu arah
- menahan kompleksitas sinkronisasi
- paling aman untuk fase awal

## Risks

- compiler baru berpotensi divergen dari compiler export kalau semantics layout tidak dijaga
- preview pagination bisa dianggap final kalau copy estimasi tidak jujur
- guard yang terlalu ketat bisa membuat section tervalidasi lama tidak muncul
- guard yang terlalu longgar bisa menurunkan kualitas preview
- snapshot lifecycle menambah kompleksitas backend dan invalidation logic

## Mitigations

- pakai mapping dan semantics section yang sama dengan keputusan aktif
- komunikasikan jumlah halaman sebagai estimasi
- definisikan guard deterministik yang eksplisit
- pastikan snapshot hanya dibangun dari artifact tervalidasi aktif
- pisahkan dengan tegas preview concern vs export concern

## Rollout Recommendation

Urutan implementasi yang paling sehat:

1. bangun compiler `Naskah` dan snapshot state
2. bangun query availability dan latest snapshot
3. bangun route + shell `Naskah`
4. bangun preview renderer dan sidebar
5. bangun `update pending` + refresh manual
6. tunda export `Naskah` ke fase setelah snapshot dan preview stabil

## Open Implementation Decisions For The Plan

Design ini sudah cukup untuk menurunkan implementation plan, tetapi plan masih harus memutuskan detail teknis berikut:
- lokasi module compiler `Naskah`
- lokasi penyimpanan compiled snapshot
- mekanisme trigger compile ulang
- format section model yang dipakai frontend renderer
- strategi diff ringan untuk highlight pasca-refresh

## Related Files

- `docs/naskah-feature/context.md`
- `docs/naskah-feature/decisions.md`
- `docs/naskah-feature/correction-checklist-context-decisions.md`
- `convex/paperSessions.ts`
- `convex/artifacts.ts`
- `src/lib/export/content-compiler.ts`
- `src/lib/export/validation.ts`
- `src/app/api/export/pdf/route.ts`
- `src/app/api/export/word/route.ts`
- `src/components/chat/shell/TopBar.tsx`

## Conclusion

Fase awal `Naskah` layak dibangun jika diperlakukan sebagai compiled read-only workspace dengan snapshot state sendiri.
Desain ini sengaja menghindari shortcut yang akan menyesatkan, terutama reuse export completed-only, penyamaan `isDirty` dengan `update pending`, dan asumsi bahwa `stageData` sudah cukup sebagai compiled paper state.

Dengan anchor ini, implementation plan bisa langsung difokuskan pada compiler, snapshot lifecycle, route/shell, dan preview renderer tanpa membuka scope yang belum siap seperti export `Naskah` atau editing dua arah.
