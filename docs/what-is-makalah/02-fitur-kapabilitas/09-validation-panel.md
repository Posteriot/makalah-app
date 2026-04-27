# Validation Panel (Persetujuan Akhir)

Validation Panel adalah "gerbang pintu" terakhir yang wajib dilewati User di setiap tahapan (stage). Fitur ini berfungsi sebagai tanda transisi resmi dari satu tahapan ke tahapan berikutnya, memastikan bahwa Agent (Tukang) tidak pernah melangkah sendirian tanpa restu eksplisit dari User (Pawang).

## Fungsi Utama

Validation Panel muncul di dalam jendela chat setelah draf selesai disusun. Ia memiliki dua fungsi kendali utama:

1. **Setujui & Lanjutkan (Approve)**:
   - Menandai draf seksi saat ini sebagai draf final (**Approved**).
   - Mengunci data agar tidak berubah secara tidak sengaja.
   - Memberikan instruksi kepada Agent untuk secara otomatis berpindah ke tahapan (stage) penulisan berikutnya.
2. **Minta Revisi (Revise)**:
   - Membuka formulir feedback bagi User untuk memberikan instruksi perbaikan.
   - Mengirimkan umpan balik tersebut ke Agent untuk diproses menjadi draf versi terbaru (v2, v3, dst).
   - Menjaga draf tetap dalam status **Revision** sampai User merasa puas.

## Fitur Guardrail (Keamanan Data)

Sistem memiliki mekanisme keamanan bernama **Dirty State Detection**. Jika User terus berdiskusi di chat setelah draf dibuat—sehingga muncul ide atau data baru—Validation Panel akan menampilkan peringatan:

> _"Percakapan berubah sejak data terakhir disimpan. Perintahkan Agen Makalah sinkronkan data sebelum menyetujui & melanjutkan."_

Ini memastikan bahwa naskah final User tidak akan ketinggalan informasi terbaru yang baru saja dibahas di chat.

## Lokasi & Tampilan (Chat Window)

Validation Panel muncul di dalam **Jendela Chat**. Posisinya berada di paling bawah alur percakapan dengan urutan:

1. **Respons Agent**: Pesan teks terakhir dari model.
2. **Kartu Artifak**: Indikator draf yang baru saja dihasilkan.
3. **Validation Panel**: Kartu persetujuan yang muncul secara otomatis setelah draf siap.

Panel ini sengaja diletakkan di alur chat agar User bisa langsung mengambil keputusan ("Setujui" atau "Revisi") tepat setelah membaca respons AI, tanpa harus berpindah fokus dari jendela percakapan.

## Detail Teknis & Arsitektur

Validation Panel dibangun sebagai komponen **React** yang terintegrasi penuh dengan ekosistem aplikasi:

- **UI & Styling**: Menggunakan **Tailwind CSS** untuk desain yang responsif dan **Shadcn/UI** untuk komponen dasar seperti tombol dan area teks.
- **Ikonografi**: Menggunakan pustaka **Iconoir** untuk indikator visual (centang, revisi, peringatan).
- **Animasi**: Dilengkapi dengan efek _fade-in_ dan _slide-in-from-bottom_ menggunakan `tw-animate-css` (kelas `animate-in fade-in slide-in-from-bottom-4 duration-500`) untuk transisi kemunculan yang halus di dalam chat.

## Rujukan Kode

- `src/components/paper/PaperValidationPanel.tsx`: Komponen utama yang mengatur logika persetujuan dan formulir revisi.
- `convex/paperSessions.ts`: Berisi fungsi backend `approveStage` dan `requestRevision` yang mengatur transisi antar tahapan.
