# Stage Recommendation UI Context

Dokumen ini menjelaskan kenapa Makalah App membutuhkan recommendation UI di halaman chat, kebutuhan apa yang dijawab, dan pendekatan implementasi yang harus dijaga agar tetap selaras dengan paper workflow yang sudah ada.

Dokumen ini belum membahas kontrak event submit atau format streaming final. Fokusnya adalah konteks produk dan arsitektur supaya keputusan implementasi berikutnya tidak salah arah.

## Ringkasan

Makalah App sudah memiliki paper workflow 14 stage yang bersifat dialog-first, stage-aware, dan validation-driven. Di banyak stage, model sudah diwajibkan memberi rekomendasi atau opsi, bukan hanya bertanya atau menulis monolog. Masalahnya, rekomendasi itu saat ini masih dominan keluar sebagai teks bebas. Akibatnya, user tetap harus mengetik untuk memilih, mengoreksi, atau mengonfirmasi arah, padahal bentuk interaksinya sebenarnya sudah cukup terstruktur untuk diubah menjadi UI yang bisa diklik.

Pendekatan yang dipilih adalah custom renderer berbasis `data-stage-recommendation` message part. Model mengisi payload terstruktur untuk komponen interaksi yang sudah disiapkan tim aplikasi, misalnya recommendation card, option picker, atau approval helper. Ini menjawab kebutuhan aplikasi untuk membuat paper workflow lebih cepat, lebih jelas, dan lebih konsisten tanpa membongkar shell chat yang sudah ada.

## Masalah Yang Ingin Diselesaikan

### 1. Rekomendasi model masih dominan berupa teks

Di paper workflow, banyak keputusan user sebenarnya berbentuk pilihan yang jelas:

- memilih angle gagasan
- memilih topik definitif
- memilih struktur outline
- memilih keyword abstrak
- memilih metode
- memilih prioritas saran
- memilih judul final

Saat semua itu keluar sebagai teks biasa, friction UI tetap tinggi karena user harus membalas manual walaupun konteks pilihan sudah tersedia.

### 2. Kewajiban rekomendasi per stage belum punya bentuk UI yang stabil

Instruksi stage sudah menuntut model memberi rekomendasi atau opsi hampir di seluruh workflow, tetapi sistem belum punya representasi data yang konsisten untuk menampilkan rekomendasi itu sebagai block interaktif. Akibatnya:

- pengalaman user tidak seragam antar stage
- rendering recommendation masih bergantung pada parsing teks
- pilihan user sulit diperlakukan sebagai input terstruktur

### 3. Validasi user masih terlalu bergantung pada ketikan

Paper workflow Makalah menempatkan user sebagai pengambil keputusan akademik final. Itu berarti validasi user harus mudah dan eksplisit. Untuk keputusan yang memang berbentuk opsi, interaksi klik jauh lebih tepat daripada memaksa user selalu mengetik ulang pilihannya.

### 4. Chat shell tidak boleh dikorbankan

Kebutuhan aplikasi bukan mengganti seluruh chat page menjadi generative UI. Kebutuhannya lebih sempit dan lebih presisi:

- shell chat tetap deterministik
- recommendation block di dalam message boleh dinamis
- approval final, persistence, dan mutation backend tetap dikontrol aplikasi

## Kenapa Pendekatan Custom Renderer

### 1. Interaksi dibatasi oleh komponen internal, bukan UI arbitrer

Model tidak diberi kuasa membuat UI arbitrer. Model hanya mengisi payload terstruktur untuk komponen interaksi yang sudah disiapkan tim aplikasi. Komponen yang tersedia tetap dan terbatas pada kebutuhan paper workflow.

Artinya:

- model mengisi data untuk pola interaksi yang tersedia
- model tidak bisa menciptakan komponen di luar kontrak
- renderer tetap dipegang penuh oleh aplikasi

### 2. Selaras dengan arsitektur chat saat ini

Chat page Makalah sudah punya fondasi yang cocok untuk pendekatan message-part based:

- frontend memakai `useChat` dan `UIMessage`
- backend memakai `createUIMessageStream`
- frontend sudah membaca `tool-*` dan `data-*` parts dari stream
- paper workflow sudah stage-aware dan punya tool validation terpisah

Karena itu, recommendation UI tidak perlu dipasang sebagai sistem asing. Ia masuk sebagai extension dari lifecycle message yang sudah berjalan sekarang.

### 3. Cocok dengan pola paper workflow yang dialog-first

Paper workflow Makalah bukan generator satu arah. Setiap stage dirancang untuk:

- memberi opsi
- merekomendasikan yang terbaik
- meminta respons user
- baru kemudian menyimpan keputusan dan masuk ke validasi

Custom renderer cocok karena kebutuhan interaksinya fixed dan domain-specific: 4 tipe interaksi tetap (`single-select`, `multi-select`, `ranked-select`, `action-list`) yang langsung mengikuti kontrak domain paper workflow.

### 4. Bisa menurunkan friction tanpa mengubah otoritas keputusan

Pendekatan ini tidak memindahkan keputusan ke model. Keputusan tetap ada di user. Yang berubah adalah media interaksinya:

- dari teks bebas menjadi pilihan terstruktur
- dari balasan manual menjadi klik yang jelas
- dari ambigu menjadi eksplisit

Ini penting untuk kualitas paper workflow, karena banyak keputusan akademik perlu terekam dengan jelas.

## Tujuan Implementasi

Implementasi recommendation UI untuk chat page harus punya tujuan yang spesifik. Bukan "biar UI lebih canggih", tapi untuk memperbaiki cara user mengambil keputusan di tiap stage paper.

### Tujuan utama

- membuat recommendation dan option dari model bisa langsung dipilih user tanpa selalu mengetik
- membuat pola interaksi per stage menjadi lebih konsisten
- menurunkan friction di paper workflow tanpa mengubah alur linear stage
- menjaga user tetap sebagai validator dan decision maker

### Tujuan UX

- mempercepat keputusan di stage yang memang choice-driven
- mengurangi kebingungan saat model menawarkan beberapa arah
- membuat alasan rekomendasi model tampil lebih jelas
- memberi fallback agar user tetap bisa mengetik manual jika tidak cocok dengan opsi yang ada

### Tujuan teknis

- mengubah recommendation dari teks bebas menjadi payload UI terstruktur
- menjaga semua UI dinamis tetap dibatasi komponen internal
- mempertahankan shell chat, artifact panel, sidebar, dan approval lifecycle yang sudah ada
- memisahkan recommendation block dari mutation final agar kontrol backend tetap aman

## Cakupan Yang Tepat

Pendekatan recommendation UI di branch ini difokuskan pada recommendation block di dalam message assistant, terutama untuk paper workflow.

Contoh use case yang cocok:

- pilihan angle di `gagasan`
- pilihan topik atau working title di `topik`
- pilihan struktur di `outline`
- pilihan keyword di `abstrak`
- pilihan metode di `metodologi`
- pilihan format hasil di `hasil`
- pilihan prioritas implikasi atau saran di `diskusi` dan `kesimpulan`
- pilihan judul final di `judul`

Contoh use case yang tidak boleh jadi target utama:

- layout utama chat page
- sidebar, activity bar, top bar, artifact viewer
- mutation approval final yang langsung mengubah stage tanpa kontrol aplikasi
- rendering markdown assistant utama secara penuh

## Batasan Yang Harus Dijaga

### 1. Recommendation UI bukan pengganti shell chat

Ia hanya cocok sebagai renderer untuk interaction block kecil di dalam pesan, bukan fondasi seluruh halaman chat.

### 2. Semua komponen harus berasal dari set internal

Komponen yang boleh dirender harus dibatasi, misalnya:

- recommendation card
- single select option list
- multi select option list
- ranked priority picker
- action list
- helper block untuk approve/revise guidance

### 3. Aksi penting tetap milik aplikasi

Klik user pada UI recommendation tidak boleh langsung dianggap sebagai mutasi final ke `paperSessions`. Ia harus diterjemahkan dulu menjadi event terstruktur yang kemudian diproses oleh aplikasi.

### 4. User tetap bisa override lewat teks

Rekomendasi model tidak boleh menjadi jalan tunggal. User harus tetap bisa:

- menolak semua opsi
- memberi revisi manual
- mengetik preferensi sendiri

## Kenapa Ini Penting Untuk Makalah App

Makalah App punya karakter yang berbeda dari chat AI generik. Ia tidak hanya menjawab pertanyaan, tapi memandu workflow penulisan paper yang panjang, bertahap, dan banyak keputusan kecil. Karena itu, UI recommendation bukan aksesoris. Ia bisa menjadi mekanisme inti untuk menjaga interaksi tetap:

- cepat
- tertib
- kontekstual
- bisa divalidasi

Tanpa recommendation UI, banyak kewajiban prompt per stage tetap jatuh menjadi teks panjang yang harus diurai user sendiri. Dengan recommendation UI, struktur keputusan yang sebenarnya sudah ada di prompt bisa tampil sebagai pengalaman yang lebih tepat.

## Hubungan Dengan Tahap Lanjutan

Dokumen ini menjadi landasan sebelum masuk ke dua desain berikutnya:

1. kontrak recommendation block lintas 14 stage
2. kontrak event submit dan format message part streaming untuk renderer chat

Urutannya penting. Sebelum bicara event dan streaming, rationale produk dan tujuan implementasi harus dikunci dulu supaya implementasi tidak melebar ke luar kebutuhan aplikasi.

## File Terkait

- `src/app/api/chat/route.ts`
- `src/components/chat/ChatWindow.tsx`
- `src/components/chat/MessageBubble.tsx`
- `src/components/paper/PaperValidationPanel.tsx`
- `src/lib/ai/paper-tools.ts`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`
- `convex/paperSessions/types.ts`
- `src/lib/ai/paper-stages/formatStageData.ts`

## Status Dokumen

- Status: context baseline
- Fungsi: justification dan arah desain
- Belum mencakup: kontrak payload UI, kontrak submit event, format stream part, dan rencana rollout implementasi
