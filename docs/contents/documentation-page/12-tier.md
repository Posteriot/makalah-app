---
doc_id: "S12"
slug: "tier"
title: "Tier"
group: "Subskripsi"
order: 9
icon: "Users"
isPublished: true
status: "final"
lastVerifiedAt: "2026-02-19"
---

# Tier

## Ringkasan

Halaman ini menjelaskan perbedaan tier user reguler di Makalah AI, supaya lo bisa pilih mode pemakaian yang paling cocok.

## Konten Utama

### Tier User Reguler

Saat ini ada tiga tier yang dipakai user reguler:

1. `Gratis`: cocok untuk mulai mencoba dengan batas pemakaian tertentu.
2. `BPP` (Bayar Per Paper): pemakaian berbasis kredit, lebih fleksibel saat butuh.
3. `Pro`: kuota bulanan besar untuk pemakaian lebih intens.

### Cara Kerja Tier Secara Sederhana

1. Sistem membaca status akun user untuk menentukan tier aktif.
2. Setiap tier punya aturan kapasitas yang berbeda.
3. Saat kapasitas tidak cukup, sistem akan memberi arahan `Upgrade` atau `Top Up`.

### Saat Perlu Upgrade

Pertimbangkan upgrade jika:

1. pemakaian rutin sudah sering mentok batas;
2. lo butuh proses penyusunan paper yang lebih panjang;
3. lo pengin alur kerja lebih leluasa tanpa sering berhenti karena limit.

### Catatan Penting

Tier adalah pengaturan akses user. Jadi perubahan tier berdampak langsung ke kuota, kredit, dan alur penggunaan fitur.

## Rujukan Kode (Wajib)

- `src/lib/utils/subscription.ts:12` - Penentuan tier efektif user reguler.
- `convex/billing/constants.ts:117` - Definisi batas per tier (`gratis`, `bpp`, `pro`).
- `convex/billing/quotas.ts:373` - Normalisasi status free menjadi gratis pada pemeriksaan kuota.
- `convex/billing/quotas.ts:459` - Tier gratis diarahkan upgrade saat kuota habis.
- `convex/billing/quotas.ts:387` - Tier BPP diarahkan top up saat kredit tidak cukup.
- `convex/billing/quotas.ts:429` - Tier Pro dapat fallback ke kredit tambahan.
- `src/app/(dashboard)/subscription/overview/page.tsx:21` - UI membaca tier efektif untuk tampilan ringkasan.

## Catatan Verifikasi

- [x] Hanya membahas tier user reguler.
- [x] Tidak membuka detail tier internal rahasia.
- [x] Klaim sesuai logika kuota di backend.

## Riwayat Revisi

- Final:
  - Tanggal: 2026-02-19
  - Ringkasan finalisasi: Dokumen dipecah menjadi menu terpisah kategori Subskripsi.
