# Status Sesi & Siklus Hidup (Lifecycle States)

Setiap tahap (*stage*) dalam Makalah AI mengikuti siklus hidup yang ketat untuk memastikan integritas data dan persetujuan pengguna sebelum sistem melangkah lebih jauh.

## Status Tahap (Stage Status)

Sesi penulisan paper dikelola melalui empat status utama yang menentukan perilaku AI dan ketersediaan *tool*:

### 1. `drafting` (Tahap Diskusi & Perancangan)
*   **Perilaku AI**: AI bertindak sebagai rekan diskusi, mengumpulkan informasi, melakukan pencarian web, dan merumuskan draf awal.
*   **Aksi Pengguna**: Memberikan input, memilih opsi dari *Choice Card*, atau meminta perubahan arah.
*   **Keluaran**: Data tersimpan sementara di `stageData` namun belum memiliki artifak formal atau status validasi.

### 2. `pending_validation` (Menunggu Persetujuan)
*   **Pemicu**: AI memanggil `submitStageForValidation()`.
*   **UI**: Panel Validasi (*PaperValidationPanel*) muncul di atas chat.
*   **Perilaku AI**: AI dilarang melakukan perubahan data lebih lanjut hingga ada keputusan dari pengguna.
*   **Aksi Pengguna**: Meninjau artifak yang dihasilkan dan memutuskan untuk menyetujui (*Approve*) atau meminta perbaikan (*Revise*).

### 3. `approved` (Disetujui)
*   **Pemicu**: Pengguna mengklik tombol "Approve" di Panel Validasi atau memberikan konfirmasi teks yang setara.
*   **Efek**: 
    - Sesi secara otomatis maju ke tahap berikutnya (*Next Stage*).
    - Data tahap saat ini dikunci sebagai referensi otoritatif untuk tahap-tah-tahap selanjutnya.
    - Artifak dimasukkan ke dalam kompilasi "Naskah Bertumbuh".

### 4. `revision` (Tahap Perbaikan)
*   **Pemicu**: Pengguna mengklik "Revise" atau memberikan umpan balik perbaikan.
*   **Perilaku AI**: AI menerima catatan revisi dan diinstruksikan untuk memodifikasi artifak yang sudah ada (`updateArtifact`) alih-alih membuat dari nol.
*   **Gating**: AI harus memanggil `requestRevision()` sebelum bisa melakukan pembaruan data di status ini.

## Panel Validasi (PaperValidationPanel)

Panel ini adalah gerbang kontrol utama bagi pengguna. 

- **Approve**: Menandai pekerjaan AI sebagai "benar secara akademik" dan memberikan lampu hijau untuk lanjut.
- **Revise**: Membuka area teks bagi pengguna untuk memberikan instruksi perbaikan spesifik.

---

## Referensi Dokumen Sumber
- [User Flows 00: General Mechanisms](./user-flows-00.md)

---
> [!TIP]
> Makalah AI didesain agar pengguna tetap memiliki kontrol penuh (*Human-in-the-loop*). Sistem tidak akan pernah maju ke tahap berikutnya tanpa persetujuan eksplisit dari pengguna di setiap langkahnya.

## Sinkronisasi Instruksi (Audit Forensik)

Transisi status ini dideteksi secara otomatis oleh `paper-mode-prompt.ts` dan diteruskan ke `resolve-instruction-stack.ts`. Bergantung pada statusnya, sistem akan menyuntikkan instruksi khusus:
- **Revision Note**: Muncul saat status `revision`, memaksa AI fokus pada feedback user dan menggunakan `updateArtifact`.
- **Pending Note**: Muncul saat status `pending_validation`, mengingatkan AI agar tidak "lancang" mengubah data sebelum disetujui.
- **Auto-Rescue**: Mekanisme otomatis yang memindahkan status ke `revision` jika AI mencoba melakukan pembaruan data tanpa permintaan revisi formal.

---

## Rujukan Kode (Audit Forensik)

Berdasarkan pembacaan kode langsung (tanpa mengandalkan komentar), berikut adalah rujukan implementasi faktual:

| Komponen | File Path | Baris/Logika |
| :--- | :--- | :--- |
| **State Transitions** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `submitForValidation` (L1262), `requestRevision` (L1477) |
| **Status Guards** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | Guard `pending_validation` di `requestRevision` (L1492) |
| **Auto-Rescue Logic** | [paperSessions.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/convex/paperSessions.ts) | `autoRescueRevision` (L1544) untuk sinkronisasi state |
| **Instruction Injection** | [paper-mode-prompt.ts](file:///Users/eriksupit/Desktop/makalahapp/.worktrees/what-is-makalah/src/lib/ai/paper-mode-prompt.ts) | `revisionNote` (L323) dan `pendingNote` (L335) |

---

## Referensi Dokumen Sumber
- [User Flows 00: General Mechanisms](../references/user-flow/user-flows-00.md)

---
> [!NOTE]
> Transisi status di Makalah AI bersifat deterministik dan dilindungi oleh guard di level database (Convex) untuk mencegah *race condition* atau inkonsistensi state AI.
