# 02 — Kontak, Dukungan & Karier

**Sumber kode**: `src/components/about/data.ts`, `src/components/layout/footer/footer-config.ts`, `src/app/(marketing)/privacy/page.tsx`, `src/app/(marketing)/terms/page.tsx`, `src/app/api/support/technical-report/route.ts`, `src/lib/email/templates/EmailLayout.tsx`

---

## Kontak Utama

### Email Dukungan Produk

```
dukungan@makalah.ai
```

Email ini muncul secara konsisten di **8+ lokasi kode produksi** sebagai satu-satunya kanal dukungan resmi:

| Lokasi | Konteks |
|---|---|
| `src/components/about/data.ts` | Kontak card di halaman About |
| `src/app/(marketing)/privacy/page.tsx` | Kontak di halaman Privacy Policy |
| `src/app/(marketing)/terms/page.tsx` | Kontak di halaman Terms of Service |
| `src/app/api/support/technical-report/route.ts` | `const SUPPORT_EMAIL = "dukungan@makalah.ai"` |
| `src/lib/email/templates/EmailLayout.tsx` | Footer semua email transaksional |
| `src/lib/email/templates/PaymentSuccessEmail.tsx` | Email konfirmasi pembayaran sukses |
| `src/lib/email/templates/PaymentFailedEmail.tsx` | Email notifikasi pembayaran gagal |

### Email Korporat

```
info@themanagement.asia
```

Sumber: dokumen NIB (`izin-perusahaan.md`, baris 11). Email korporat perusahaan induk — bukan kanal dukungan produk Makalah AI.

---

## Alamat Fisik

```
PT THE MANAGEMENT ASIA
Jl. H. Jian II No. 11
Kelurahan Cipete Utara, Kec. Kebayoran Baru
Kota Adm. Jakarta Selatan, DKI Jakarta 12150
```

Alamat ini tercantum di:
- Halaman About (`src/components/about/data.ts`) — versi singkat: `Jl. H. Jian, Kebayoran Baru, Jakarta Selatan`
- Halaman Privacy Policy — `Jl. H. Jian, Kebayoran Baru, Jakarta Selatan`
- Halaman Terms of Service — `PT THE MANAGEMENT ASIA, Jl. H. Jian, Kebayoran Baru, Jakarta Selatan`
- Dokumen NIB — alamat lengkap dengan kode pos 12150

---

## Kanal Kontak di Aplikasi

### 1. Halaman About — Kartu Kontak

Lokasi: `/about#hubungi-kami`

Komponen: `CareerContactSectionCMS.tsx` / `CareerContactSection.tsx`

Data statis (`data.ts`):
```typescript
{
  id: "kontak",
  anchorId: "hubungi-kami",
  iconName: "Mail",
  title: "Kontak",
  content: {
    company: "PT The Management Asia",
    address: ["Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"],
    email: "dukungan@makalah.ai",
  },
}
```

Klik email membuka Google Mail client (`mailto:dukungan@makalah.ai`) menggunakan `openMailClientOrGmail()`.

### 2. Form Laporan Masalah Teknis

Lokasi: `/support/technical-report`

Sumber: `src/app/api/support/technical-report/route.ts`

Kanal ini tersedia di footer aplikasi dengan label **"Lapor Masalah"** (didefinisikan di `footer-config.ts` baris 19:
```typescript
export const FOOTER_SUPPORT_PATH = "/support/technical-report?source=footer-link"
export const FOOTER_SUPPORT_LABEL = "Lapor Masalah"
```

### 3. Footer Website

Struktur footer default (`footer-config.ts`):

| Section | Label | URL |
|---|---|---|
| Sumber Daya | Kerja Sama Bisnis | `/about#kontak` |
| Sumber Daya | Lapor Masalah | `/support/technical-report?source=footer-link` |
| Perusahaan | Karier | `/about#bergabung-dengan-tim` |
| Perusahaan | Tentang Kami | `/about` |
| Legal | Privacy | `/privacy` |
| Legal | Security | `/security` |
| Legal | Terms | `/terms` |

---

## Karier

### Status Saat Ini

```typescript
// src/components/about/data.ts — baris 142–144
{
  id: "karier",
  title: "Karier",
  content: "Update posisi akan kami tampilkan di halaman ini.",
}
```

Tidak ada posisi terbuka yang dipublikasikan saat ini. Informasi lowongan akan ditampilkan di halaman `/about#bergabung-dengan-tim`.

### Akses

- **URL di aplikasi**: `/about#bergabung-dengan-tim`
- **Link footer**: "Karier" → `/about#bergabung-dengan-tim`
- **Anchor ID pada elemen**: `bergabung-dengan-tim`

---

## Email Transaksional (Otomatis)

Sistem mengirim email otomatis ke user dari `dukungan@makalah.ai` dalam konteks berikut:

| Trigger | Template | Pengirim |
|---|---|---|
| Verifikasi email baru | Email verification | `dukungan@makalah.ai` |
| Magic link login | Magic link email | `dukungan@makalah.ai` |
| Reset password | Password reset email | `dukungan@makalah.ai` |
| OTP 2FA | Two factor OTP email | `dukungan@makalah.ai` |
| Pendaftaran berhasil | Signup success email | `dukungan@makalah.ai` |
| Pembayaran berhasil | Payment success email | `dukungan@makalah.ai` |
| Pembayaran gagal | Payment failed email | `dukungan@makalah.ai` |

Semua email transaksional dikirim via **Resend** (lihat Kategori 03: Technology Stack) dengan footer standar yang memuat nama perusahaan dan email kontak.
