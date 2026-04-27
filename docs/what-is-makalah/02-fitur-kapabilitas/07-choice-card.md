# Choice Card (Interactive Decision)

Choice Card adalah **"bahasa visual"** dari model AI untuk mempermudah interaksi dengan User. Fitur ini bukan sekadar tombol, melainkan representasi dari rekomendasi pilihan, sikap, pendapat, atau langkah selanjutnya (*what-next?*) yang disusun secara sistematis oleh Agent.

## Konsep "Decision Gateway"
Choice Card muncul di area chat untuk mempermudah jalannya diskusi. Alih-alih mengharuskan User mengetik instruksi panjang, Agent menyajikan opsi yang bisa dipilih secara instan. 

Penting untuk dipahami bahwa **bobot setiap klik pada Choice Card sama dengan ketika User mengirimkan prompt manual**. Saat User memilih sebuah opsi, sistem mengirimkan data aksi tersebut ke server untuk diproses sebagai instruksi resmi dari User.
- **Navigasi Arah**: User menentukan sudut pandang atau argumen mana yang ingin didalami lebih lanjut.
- **Konfirmasi Data**: User memverifikasi apakah sumber atau referensi yang ditemukan Agent sudah sesuai sebelum diproses lebih jauh.
- **Transparansi Proses**: Setiap opsi menyertakan penjelasan tentang apa yang akan dilakukan Agent jika pilihan tersebut diambil.

## Jenis Interaksi (Workflow Actions)
Setiap pilihan pada Choice Card mengarahkan Agent ke salah satu dari dua jalur utama:

1.  **Jalur Eksplorasi (`continue_discussion`)**: Digunakan saat User memilih untuk memperdalam materi. Agent merespons dengan ringkasan diskusi dan memberikan kartu pilihan baru untuk langkah selanjutnya.
2.  **Jalur Finalisasi**: Digunakan saat User memilih opsi konklusif. Bergantung pada tahapan, jalur ini bisa berupa:
    -   **`finalize_stage`**: finalisasi langsung (mayoritas tahapan, e.g. Topik, Metodologi).
    -   **`compile_then_finalize`**: compile dulu sebelum finalisasi (e.g. Daftar Pustaka).
    -   **`special_finalize`**: executor khusus untuk tahapan kompleks (e.g. Hasil, Lampiran, Judul).

Routing ini dikelola oleh `STAGE_REGISTRY` di `choice-workflow-registry.ts` yang memetakan setiap tahapan ke `WorkflowClass` dan `ToolStrategy`-nya.

## Kedaulatan User
Dengan Choice Card, User tidak lagi menjadi penonton pasif. Fitur ini mengubah AI dari "mesin yang mendikte" menjadi "asisten yang selalu meminta arahan", memastikan bahwa integritas intelektual paper tetap sepenuhnya berada di tangan User.

## Teknologi di Balik Layar (Generative UI)
Choice Card dibangun menggunakan framework **`json-render`**, sebuah sistem **Generative UI** yang memungkinkan AI menyusun antarmuka keputusannya sendiri secara dinamis namun tetap aman. (Referensi Teknis: [json-renderer-vercel.md](../references/json-renderer/json-renderer-vercel.md))

### Detail Teknis & Arsitektur:
-   **Data Validation (Zod)**: Setiap payload JSON divalidasi ketat menggunakan skema Zod (`choicePayloadSchema`, `choiceSpecSchema`) untuk memastikan struktur opsi (label, optionId, workflowAction) selalu valid dan aman sebelum dirender.
-   **Submission via Vercel AI SDK**: Interaksi User (klik) membangun sebuah `interactionEvent` dan teks sintetis `[Choice: ...]`, lalu dikirim ke backend via **`sendMessage`** dari Vercel AI SDK `useChat` — bukan Convex mutation langsung. Backend (`/api/chat`) membaca `interactionEvent` di request body untuk menentukan workflow yang akan dijalankan.
-   **Convex untuk State Persistence**: Convex digunakan untuk menyimpan history pesan (termasuk `jsonRendererChoice` payload) dan subscribe ke state sesi secara real-time — bukan sebagai mekanisme pengiriman choice.
-   **Modular UI Components**: Dibangun menggunakan **React** dan **Tailwind CSS** dengan rendering engine **`@json-render/react`** (npm package `^0.14.1`). Komponen Choice Card (`ChoiceCardShell`, `ChoiceOptionButton`, `ChoiceTextarea`, `ChoiceSubmitButton`) adalah komponen React native yang didaftarkan ke registry `@json-render/react`.
-   **Streaming & Native Rendering**: Meski jalurnya digenerate oleh AI, komponen yang muncul adalah komponen asli (*native*) platform yang dirender secara progresif.

## Rujukan Kode
- `src/lib/chat/choice-workflow-registry.ts`: Pengaturan jalur logika *Exploration* vs *Commit*.
- `src/lib/json-render/choice-payload.ts`: Definisi skema dan tipe data untuk Choice Card.
- `src/components/chat/json-renderer/components/ChoiceCardShell.tsx`: Komponen UI utama untuk merender Choice Card di web.
