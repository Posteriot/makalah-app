# Panduan Riset Codebase

## Tujuan
- Menjawab pertanyaan produk/fitur berbasis fakta kode.
- Menyediakan bahan untuk docs-writer atau content-writer.

## Langkah Riset
1) Identifikasi entry point: page/route, handler API, atau mutation/query Convex.
2) Telusuri alur data: dari UI -> API -> Convex (atau sebaliknya).
3) Catat aturan bisnis: pricing, subscription, benefit, limit, gating, role.
4) Cari konfigurasi terkait: config file, constants, enums.
5) Verifikasi dengan membaca kode inti, bukan asumsi.

## Catatan
- Jika ada ketidakpastian, tulis sebagai asumsi.
- Selalu sertakan file terkait sebagai bukti.
