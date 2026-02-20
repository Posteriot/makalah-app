# Chat Page Style Standardization Context Rules

Dokumen ini adalah acuan tunggal untuk standarisasi styling halaman chat sampai migrasi selesai.  
Tujuan utamanya menjaga konsistensi keputusan saat sesi chat panjang, compact context, atau pergantian agent.

## 1. Status dan Tujuan

- Status: `ACTIVE`
- Domain: halaman chat saja (`/chat` dan `/chat/[conversationId]`)
- Target akhir:
- `0 hardcoded color` di seluruh komponen chat
- `0 dark:` untuk warna/border/shadow di komponen chat
- Semua style color state terpusat pada token di `src/app/globals-new.css`

## 2. Prinsip Utama

- Baseline visual chat saat ini dipertahankan 100%.
- `globals-new.css` menjadi staging contract token, belum jadi standar app global.
- Arah migrasi dibalik: global token mengikuti kondisi frontend faktual yang sudah ada.
- Perapihan visual hanya boleh dilakukan jika dibutuhkan agar token konsisten (warna, border, line size, spacing, font, dsb).

## 3. Keputusan Arsitektur Token

### 3.1 Prefix dan Struktur

- Prefix token tunggal: `--ds-*`
- Dilarang membuat prefix domain khusus seperti `--chat-*`

### 3.2 Layer Token

- Reference token: `--ds-ref-*`
- Semantic token: `--ds-*` non-ref (mis. `--ds-surface-base`, `--ds-text-primary`, `--ds-border-subtle`)
- Aturan pakai:
- Komponen UI chat hanya boleh pakai semantic token
- Reference token hanya dipakai untuk definisi internal di `globals-new.css`

### 3.3 Dark/Light Strategy

- Nilai token didefinisikan pada:
- `:root` untuk light
- `.dark` untuk dark
- Komponen chat tidak boleh tergantung `dark:` untuk warna/border/shadow setelah file dimigrasi.

## 4. Scope Implementasi Tahap Ini

- Scope awal mencakup seluruh UI yang dipakai halaman chat:
- UI selalu terlihat
- UI kondisional saat interaksi AI
- UI akibat interaksi (streaming state, error state, citation, artifact state, paper validation, rewind state, dll)

- Root scope token di tahap awal: hanya chat root (bukan global app penuh) sampai stabil.
- Selector scope resmi (fixed rule): `data-ds-scope="chat-v1"`.
- Seluruh semantic token chat v1 wajib di-scope ke `[data-ds-scope="chat-v1"]`.
- Dilarang menggunakan selector scope lain untuk fase standardisasi chat v1 tanpa update dokumen ini.

## 5. Kebijakan Migrasi Bertahap

- `dark:` tidak dihapus brutal di hari pertama.
- Aturan per-file:
- Jika file belum dimigrasi token: `dark:` masih boleh sementara
- Jika file sudah dimigrasi token: `dark:` untuk warna/border/shadow dilarang
- Satu file dianggap selesai jika:
- Tidak ada hardcoded color
- Tidak ada `dark:` untuk warna/border/shadow
- Seluruh nilai style warna terhubung ke semantic token

## 6. Exit Criteria Chat Page

- Semua komponen chat memenuhi:
- `0 hardcoded color`
- `0 dark:` (warna/border/shadow)
- Seluruh token reusable seragam
- Satu sumber token terpusat: `src/app/globals-new.css`

## 7. Governance Perubahan

- Semua keputusan baru soal token/chat style wajib ditambahkan ke dokumen ini.
- Jika ada konflik keputusan antar dokumen, dokumen ini menjadi acuan prioritas untuk domain chat style standardization.
- Dokumen ini aktif sampai migrasi chat selesai dan token siap dipromosikan dari `globals-new.css` ke `globals.css`.
- Keputusan selector `data-ds-scope="chat-v1"` bersifat final untuk fase chat v1 dan hanya boleh diubah lewat revisi eksplisit dokumen ini.

## 8. Referensi

- `docs/chat-page/baseline-file-map.md`
- `docs/chat-page/chat-runtime-architecture.md`
- `docs/chat-page/chat-ui-shell-responsive-and-theme-spec.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
