# Footer Audit Context

Dokumen konteks awal untuk audit footer non-chat pada branch `marketing-pages-ui-design`.

## Tujuan

Dokumen ini disiapkan sebagai pijakan awal untuk task:

- audit footer global non-chat
- memetakan apakah seluruh footer non-chat sudah benar-benar terpusat
- mendeteksi dependency styling legacy, kontrak data yang rapuh, dan inkonsistensi shell sebelum migrasi dilakukan

Perhatian khusus pada audit ini:

- footer marketing
- footer dashboard admin, superadmin, dan user/settings
- route family non-chat lain yang mungkin memakai footer di luar komponen pusat
- hubungan footer dengan token `core` di `globals-new.css`

Non-scope audit ini:

- footer atau shell halaman `chat`
- redesign visual footer
- keputusan migrasi implementasi

## Komponen dan Integrasi yang Diamati

Komponen utama footer:

- [`src/components/layout/footer/Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)
- [`src/components/layout/footer/README.md`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/README.md)

Layout non-chat yang saat ini merender footer terpusat:

- [`src/app/(marketing)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(marketing)/layout.tsx)
- [`src/app/(dashboard)/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/layout.tsx)

Kontrak token dan CSS yang ikut menentukan perilaku footer:

- [`src/app/layout.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/layout.tsx)
- [`src/app/globals.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals.css)
- [`src/app/globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css)

Kontrak CMS dan admin editor yang memengaruhi footer:

- [`convex/siteConfig.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/siteConfig.ts)
- [`convex/schema.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/schema.ts)
- [`convex/migrations/seedSiteConfig.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/convex/migrations/seedSiteConfig.ts)
- [`src/components/admin/cms/FooterConfigEditor.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/admin/cms/FooterConfigEditor.tsx)

Dependensi auth dan route yang ikut memengaruhi perilaku footer:

- [`src/lib/auth-client.ts`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/lib/auth-client.ts)
- [`src/app/(dashboard)/support/technical-report/page.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/(dashboard)/support/technical-report/page.tsx)

## Peran Footer Saat Ini

`Footer` adalah komponen global untuk shell non-chat yang saat ini dipakai di dua family layout:

- marketing
- dashboard

Tanggung jawab utamanya:

- merender logo brand dengan varian light/dark
- merender section link footer dari CMS atau fallback hardcoded
- menyisipkan link `Lapor Masalah` ke section `Sumber Daya`
- merender copyright dan company description
- merender social icons dari CMS atau fallback
- merender layer background dekoratif melalui `GridPattern`, `DottedPattern`, dan `DiagonalStripes`

## State dan Data Flow yang Terlihat

### Footer content

Sumber data utama footer:

- `useQuery(api.siteConfig.getConfig, { key: "footer" })`
- fallback konstanta lokal untuk resource/company/legal links
- fallback logo statis
- fallback social links placeholder

Flow data yang terlihat:

1. Footer mengambil satu record `siteConfig` dengan key `footer`.
2. Jika `footerSections` tidak tersedia, footer memakai tiga grup link hardcoded.
3. Footer selalu memfilter link `Lapor Masalah` dari CMS lalu menyisipkannya kembali secara programatik.
4. Footer merender company description dan copyright hanya jika field CMS terisi.
5. Footer merender social links CMS hanya jika `isVisible` dan `url` terisi; selain itu fallback ke social placeholder `#`.

### Footer auth gating

Footer membaca `useSession()` untuk memutuskan target link `Lapor Masalah`:

1. Jika ada session, target menuju `/support/technical-report?source=footer-link`.
2. Jika belum ada session, target menuju `/sign-in?redirect_url=...`.

Audit ini perlu memperlakukan bagian tersebut sebagai kontrak perilaku, bukan sekadar detail copy link.

## Perilaku Penting yang Sudah Terlihat

### Sentralisasi komponen

Dari pencarian layout dan pemakaian komponen, footer non-chat yang aktif saat ini terpusat pada satu komponen:

- [`Footer.tsx`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/components/layout/footer/Footer.tsx)

Marketing layout dan dashboard layout sama-sama merender komponen yang sama.

### Scope styling

Token baru di [`globals-new.css`](/Users/eriksupit/Desktop/makalahapp/.worktrees/marketing-pages-ui-design/src/app/globals-new.css) bersifat scoped ke `[data-ui-scope="core"]`.

Marketing layout sudah memberi scope ini.
Dashboard layout saat ini belum memberi scope yang sama.

Karena footer memakai utility dan token yang diasumsikan berasal dari jalur `core`, ini menjadi hotspot audit penting.

### Background patterns

Footer memakai tiga helper dekoratif yang sama dengan language visual marketing:

- `GridPattern`
- `DottedPattern`
- `DiagonalStripes`

Ketiganya bisa diaktifkan atau dimatikan dari CMS footer.

### CMS authority

Footer content terlihat database-driven, tetapi authority-nya masih campuran:

- section links, logo, socials, pattern toggles, copyright, dan description bisa datang dari CMS
- `Lapor Masalah` tidak bisa dikontrol dari CMS karena akan selalu diinjeksi ulang
- posisi injeksi `Lapor Masalah` juga ditentukan logika frontend, bukan struktur CMS

## Hotspot Audit

Area yang layak diaudit lebih dulu:

- apakah footer benar-benar terpusat secara komponen dan kontrak styling, bukan hanya terpusat secara import
- apakah dashboard footer mendapat token `core` yang eksplisit, atau masih selamat karena fallback dari `globals.css`
- apakah utility `text-narrative`, `text-interface`, `gap-comfort`, `icon-interface`, dan variabel `--footer-background` aman dipakai di semua shell non-chat
- apakah kontrak CMS footer cukup stabil atau justru bisa menghasilkan hierarchy yang tidak terduga
- apakah fallback social links `#` dan fallback empty bottom bar memang aman untuk pengalaman user
- apakah auth-gated `Lapor Masalah` mempertahankan perilaku yang konsisten dengan jalur support non-chat

## Konteks Shell di Luar Footer Saat Ini

Selain marketing dan dashboard, ada route family non-chat lain seperti:

- `cms`
- `auth`
- `onboarding`

Route family tersebut saat ini tidak memakai footer global.

Dokumen ini tidak menyimpulkan hal itu sebagai bug.
Bagian ini hanya dicatat sebagai boundary context agar audit tidak keliru menganggap semua route non-chat memang sudah masuk ke shell footer yang sama.

## Testing Gap yang Terlihat

Pada pencarian test file saat audit ini dilakukan, tidak ditemukan coverage test spesifik untuk:

- `Footer`
- sentralisasi footer di layout non-chat
- auth redirect footer
- fallback CMS footer

Artinya, footer saat ini belum terlihat punya safety net otomatis yang eksplisit.

## Keluaran yang Diharapkan dari Audit Berikutnya

Dokumen ini disiapkan supaya audit tahap berikutnya bisa menjawab:

- apakah seluruh footer non-chat benar-benar sudah terpusat
- apakah kontrak styling footer sudah konsisten dengan baseline `core`
- apakah footer masih diam-diam bergantung pada `globals.css`
- apakah kontrak data CMS footer cukup aman untuk migrasi
- apakah ada perilaku footer yang ambigu atau misleading bagi user

Dokumen ini belum menjawab pertanyaan-pertanyaan tersebut. Dokumen ini hanya menjadi fondasi konteks awal.
