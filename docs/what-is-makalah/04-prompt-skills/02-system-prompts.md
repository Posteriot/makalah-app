# System Prompts (Database Managed)

Makalah AI memungkinkan admin untuk memperbarui instruksi inti AI (*System Prompt*) secara *real-time* melalui antarmuka admin tanpa perlu melakukan *deployment* ulang kode program. Sistem ini dikelola di database Convex.

## Struktur Data

Tabel `systemPrompts` di Convex menyimpan setiap iterasi instruksi dengan atribut berikut:

- **Name**: Nama identifikasi prompt (misal: "Default AI Personality").
- **Content**: Isi teks instruksi sebenarnya.
- **Version**: Nomor versi (incremental).
- **IsActive**: Flag boolean yang menentukan prompt mana yang digunakan saat ini oleh sistem.
- **RootId**: Referensi ke versi pertama dalam rantai sejarah prompt tersebut.
- **ParentId**: Referensi ke versi langsung sebelumnya (untuk pelacakan perubahan).

## Fitur Utama

### 1. Versioning & History
Setiap kali prompt diperbarui, sistem tidak menimpa data lama. Sebaliknya, sistem membuat *record* baru dengan nomor versi yang lebih tinggi dan menghubungkannya ke `rootId` dan `parentId`. Ini memungkinkan audit perubahan instruksi dari waktu ke waktu.

### 2. Mekanisme Aktivasi
Hanya boleh ada **satu** system prompt yang aktif (`isActive: true`) dalam satu waktu. Ketika sebuah prompt baru diaktifkan, sistem secara otomatis menonaktifkan prompt yang sebelumnya aktif.

### 3. Fallback Prompt
Jika tidak ada prompt yang ditandai aktif di database (atau database gagal diakses), sistem mengaktifkan **FALLBACK MODE** via `getSystemPrompt()` di `src/lib/ai/chat-config.ts`. Fallback ini bersifat **degraded** — model beroperasi dengan instruksi minimal dan menampilkan peringatan `[⚠️ FALLBACK MODE]` secara eksplisit. Selain itu, sistem otomatis mencatat alert ke tabel `systemAlerts` agar admin mengetahui bahwa fallback telah aktif.

## API & Operasi (Admin Only)

Operasi manajemen prompt ini dibatasi hanya untuk pengguna dengan peran `admin` atau `superadmin`:

- **`listSystemPrompts`**: Mengambil daftar semua prompt unik (hanya versi terbaru dari tiap rantai).
- **`getPromptVersionHistory`**: Melihat sejarah lengkap perubahan dari satu rantai instruksi.
- **`activateSystemPrompt`**: Mengalihkan instruksi aktif ke versi tertentu.
- **`createSystemPrompt` / `updateSystemPrompt`**: Membuat atau mengiterasi instruksi.

## Referensi Kode
- `convex/systemPrompts.ts`: Logika mutasi dan query database.
- `convex/schema.ts`: Definisi skema tabel `systemPrompts`.
- `src/lib/ai/chat-config.ts`: Implementasi `getSystemPrompt()` — mengambil prompt aktif dari database dan mengaktifkan fallback mode (dengan alert logging) jika tidak ada prompt aktif.

---
**Lihat Juga:**
- [Orkestrasi Instruction Stack](./orchestration.md)
- [Katalog Stage Skills](./stage-skills.md)
