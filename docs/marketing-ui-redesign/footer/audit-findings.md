# Footer Audit Findings

**Status:** Audit findings
**Branch:** `marketing-pages-ui-design`
**Date:** 2026-03-09

## Scope

Audit ini mencakup:

- [`Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- [`src/app/(dashboard)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx)
- [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)
- kontrak CMS footer di [`siteConfig.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/siteConfig.ts) dan [`FooterConfigEditor.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx)

Dokumen ini hanya mencatat findings audit. Dokumen ini belum berisi rencana migrasi atau redesign.

## Findings

### 1. Footer terpusat secara komponen, tetapi belum terpusat secara kontrak token shell

**Severity:** High

Footer saat ini dipakai di marketing layout dan dashboard layout yang sama-sama merender komponen pusat:

- [`src/app/(marketing)/layout.tsx`#L11](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx#L11)
- [`src/app/(dashboard)/layout.tsx`#L7](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx#L7)

Namun token system baru untuk non-chat secara eksplisit hanya hidup di `[data-ui-scope="core"]`:

- [`globals-new.css`#L97](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css#L97)
- [`globals-new.css`#L268](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css#L268)
- [`globals-new.css`#L337](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css#L337)

Marketing layout sudah memberi scope `core`, tetapi dashboard layout tidak:

- [`src/app/(marketing)/layout.tsx`#L11](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx#L11)
- [`src/app/(dashboard)/layout.tsx`#L7](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx#L7)

Sementara footer memakai utility dan variabel yang diasumsikan berasal dari kontrak `core`, seperti:

- `gap-comfort`
- `text-narrative`
- `text-interface`
- `icon-interface`
- `--footer-background`
- `--core-border-hairline`

Referensi kode:

- [`Footer.tsx`#L157](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L157)
- [`Footer.tsx`#L166](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L166)
- [`Footer.tsx`#L179](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L179)
- [`Footer.tsx`#L196](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L196)

Dampak audit yang perlu dicatat:

- footer memang terpusat sebagai komponen, tetapi belum memakai shell token yang eksplisit dan seragam di seluruh non-chat layout
- dashboard footer saat ini masih berisiko bergantung pada fallback legacy dari `globals.css`, bukan kontrak `core` yang eksplisit
- ini bertentangan dengan target branch yang ingin memindahkan area marketing/non-chat ke jalur `globals-new.css`

### 2. Separator footer masih menembus semantic token layer dan mengakses token mentah `core`

**Severity:** Medium

Footer sudah memakai `bg-background`, `text-foreground`, `bg-card`, dan utility semantik lain untuk mayoritas state visual:

- [`Footer.tsx`#L156](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L156)
- [`Footer.tsx`#L157](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L157)

Tetapi hairline separator masih langsung memakai `var(--core-border-hairline)`:

- [`Footer.tsx`#L196](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L196)

Padahal jalur token semantik yang sudah tersedia di `core` adalah `--border-hairline` dan utility `.border-hairline`:

- [`globals-new.css`#L278](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css#L278)
- [`globals-new.css`#L363](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css#L363)

Temuan ini menunjukkan footer belum sepenuhnya konsisten dengan disiplin semantic token yang dipakai sebagai baseline branch.

### 3. Kontrak CMS footer masih campuran karena `Lapor Masalah` selalu dipaksa ulang oleh frontend

**Severity:** Medium

Footer mengambil `footerSections` dari CMS, tetapi lalu:

1. menghapus semua link dengan label `Lapor Masalah`
2. mencari section `Sumber Daya`
3. menyisipkan ulang `Lapor Masalah` secara programatik
4. jika section `Sumber Daya` tidak ada, membuat section baru di depan

Referensi kode:

- [`Footer.tsx`#L88](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L88)
- [`Footer.tsx`#L97](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L97)
- [`Footer.tsx`#L102](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L102)
- [`Footer.tsx`#L106](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L106)
- [`Footer.tsx`#L118](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L118)

Sementara editor CMS memperlakukan seluruh `footerSections` sebagai field yang bisa diedit bebas:

- [`FooterConfigEditor.tsx`#L188](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx#L188)
- [`FooterConfigEditor.tsx`#L304](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx#L304)
- [`FooterConfigEditor.tsx`#L357](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx#L357)

Dampak perilaku yang mungkin muncul:

- struktur footer yang disusun admin bukan struktur final yang benar-benar dirender user
- posisi `Lapor Masalah` tidak sepenuhnya dapat diprediksi dari CMS saja
- authority konten footer terbagi antara database dan logika frontend

Untuk fase audit, ini bukan vonis salah mutlak. Tetapi ini jelas kontrak yang belum bersih untuk migrasi karena sumber kebenarannya campuran.

### 4. Fallback footer masih menghasilkan pengalaman placeholder yang tampak final

**Severity:** Medium

Saat config footer belum ada atau belum lengkap, footer memakai fallback berikut:

- link section hardcoded
- logo statis
- social links placeholder `#`
- bottom bar kosong bila `companyDescription` dan `copyrightText` kosong

Referensi kode:

- [`Footer.tsx`#L85](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L85)
- [`Footer.tsx`#L89](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L89)
- [`Footer.tsx`#L132](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L132)
- [`Footer.tsx`#L140](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx#L140)

Seed default config juga masih menyimpan social URLs placeholder:

- [`seedSiteConfig.ts`#L87](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/migrations/seedSiteConfig.ts#L87)

Temuan auditnya:

- footer bisa tampak “selesai” padahal beberapa elemen dasarnya masih placeholder
- social icons dengan `href="#"` tetap terlihat interaktif dan membuka affordance palsu
- authority fallback saat ini lebih cocok sebagai transisi, belum sebagai baseline final yang bersih

### 5. Footer belum memiliki coverage test spesifik untuk kontrak terpusat, CMS fallback, dan auth redirect

**Severity:** Medium

Pada pencarian test file saat audit ini dilakukan, tidak ditemukan coverage test spesifik untuk:

- `Footer`
- sentralisasi footer di layout marketing/dashboard
- injeksi `Lapor Masalah`
- fallback CMS/social
- redirect signed-out ke `sign-in`

Implikasi langsung:

- belum ada safety net otomatis untuk memverifikasi footer tetap terpusat
- belum ada pembuktian bahwa contract CMS footer tidak merusak hierarchy render
- belum ada pembuktian bahwa perilaku auth-gated footer aman saat migrasi dilakukan

## Boundary Notes

Catatan berikut sengaja dipisahkan dari findings utama karena statusnya masih boundary context, bukan inkonsistensi yang sudah terbukti salah.

### Route family non-chat di luar marketing/dashboard

Shell yang saat ini memakai footer global hanya:

- marketing
- dashboard

Sementara route family non-chat lain seperti `cms`, `auth`, dan `onboarding` punya layout sendiri dan tidak merender footer global:

- [`src/app/cms/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/cms/layout.tsx)
- [`src/app/(auth)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(auth)/layout.tsx)
- [`src/app/(onboarding)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(onboarding)/layout.tsx)

Catatan auditnya:

- tidak ada bukti footer duplikat aktif di shell-shell tersebut
- audit footer ini tidak menyimpulkan bahwa shell-shell tersebut wajib memakai footer global
- bila target produk nanti memperluas footer global ke route family non-chat lain, area ini akan menjadi pekerjaan lanjutan

## Testing Gaps

Gap testing paling jelas untuk footer saat ini:

1. Tidak ada test render-state untuk fallback CMS.
2. Tidak ada test sentralisasi footer lintas layout non-chat.
3. Tidak ada test auth redirect untuk link `Lapor Masalah`.
4. Tidak ada test kontrak styling footer terhadap shell `core`.

## Summary

Temuan paling penting untuk saat ini:

1. Footer non-chat sudah terpusat secara komponen, tetapi belum terpusat secara kontrak token karena dashboard layout belum membawa scope `core`.
2. Footer masih menyentuh token mentah `core` dan belum sepenuhnya disiplin ke semantic token layer.
3. Kontrak CMS footer masih campuran karena `Lapor Masalah` selalu dioverride frontend.
4. Fallback footer masih memunculkan placeholder yang terlihat final, terutama social links `#`.
5. Area footer belum terlihat punya safety net test yang spesifik.
