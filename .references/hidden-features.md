# Hidden Features

Dokumentasi fitur-fitur yang sementara disembunyikan karena belum diimplementasikan.

## QuickActions (Agent Bubble)

**File:** `src/components/chat/QuickActions.tsx`

### Fitur yang Disembunyikan

| Fitur | Task ID | Deskripsi | Status |
|-------|---------|-----------|--------|
| Insert to Paper | CHAT-046 | Menyisipkan konten AI ke artifact/paper | Belum diimplementasi |
| Save to Snippets | CHAT-047 | Menyimpan konten ke koleksi snippets user | Belum diimplementasi |

### Fitur yang Aktif

| Fitur | Deskripsi | Status |
|-------|-----------|--------|
| Copy | Copy konten ke clipboard | Aktif |

### Cara Mengaktifkan Kembali

Untuk mengaktifkan fitur yang disembunyikan:

1. Buka `src/components/chat/QuickActions.tsx`
2. Tambahkan import yang diperlukan:
   ```tsx
   import { CopyIcon, FileTextIcon, BookmarkIcon, CheckIcon } from "lucide-react"
   ```
3. Tambahkan handler functions:
   ```tsx
   const handleInsert = () => {
       // Implementasi CHAT-046
   }

   const handleSave = () => {
       // Implementasi CHAT-047
   }
   ```
4. Tambahkan UI buttons setelah Copy button (lihat git history untuk referensi)

### Alasan Penyembunyian

- UI menampilkan tombol yang tidak berfungsi memberikan pengalaman buruk
- Menghindari kebingungan user dengan fitur placeholder
- Fitur akan diaktifkan setelah backend dan integrasi siap

### Tanggal Disembunyikan

2026-01-25
