# Dokumentasi Halaman Home/Landing (UI Lama)

## Cakupan
- Gue scan UI/components halaman home/landing di `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur section, komponen UI, serta styling/typography yang dipakai di halaman ini.

## Titik masuk halaman
- `.development/knowledge-base/ui-old-makalah/app/page.tsx` - halaman home/landing utama (client component).

## Struktur UI utama
1) Hero (section `home-hero`)
- Wrapper: `<section className="section-screen-with-header home-hero hero-vivid hero-grid-thin">`.
- Badge interaktif: `Badge` + `Dialog` (trigger teks: "Anda Pawang, Ai Tukang") membuka dialog berjudul "Manusia adalah pawang, Ai sebatas tukang".
- Heading utama: teks "Ngobrol+Riset+Brainstorming=Paper_Akademik" dengan highlight warna `text-primary`.
- Subheading: teks "Nggak perlu prompt ruwet...".
- Tombol ajakan aktif: tombol/link "Daftarkan email untuk uji coba" ke `/auth/waiting-list`.
- Tombol ajakan lama "Ayo mulai!" disembunyikan (`{false && ...}`).
- Mock input chat (desktop-only): `ChatInputHeroMock`.
- Detail animasi mock input chat (hero):
  - Komponen: `ChatInputHeroMock` + `TypewriterText`.
  - Teks diketik otomatis (MESSAGE): “Bantuin gue bikin paper... brainstorming dulu?”.
  - State machine `phase`: `placeholder` → `typing` → `hold` → `cursorMove` → `hover` → `click` → `reset` → `return` → balik ke `placeholder`.
  - Timing per phase (ms):
    - `placeholder` → `typing`: 4000
    - `hold` → `cursorMove`: 900
    - `cursorMove` → `hover`: 800
    - `hover` → `click`: 600
    - `click` → `reset`: 200
    - `reset` → `return`: 350
    - `return` → `placeholder`: 800
    - `typing`: durasi variatif, per karakter 35–58 ms + faktor tanda baca `1.8`.
  - Placeholder shimmer: teks “Ketik obrolan” dengan class `hero-text-shimmer` (mati jika `prefers-reduced-motion`).
  - Caret: blink dari `hero-caret-blink` di `TypewriterText`.
  - Cursor overlay: ikon `MousePointer2` bergerak ke tombol kirim (Send) dengan transform + transisi.
  - Durasi animasi cursor:
    - `cursorMove`: transisi `transform 800ms ease-in-out`.
    - `hover`: transisi `transform 150ms ease-out`.
    - `click`: transisi `transform 200ms ease-out`.
    - `return`: transisi `transform 800ms ease-in-out` (balik ke tengah).
  - Guard performa: `IntersectionObserver` (hanya animasi saat in-view) + `prefers-reduced-motion`.
  - Visual frame: kartu gelap bergaya “browser bar” + input area dengan ikon `Plus` dan `Send`.
- Fade bawah: overlay gradient ke background.

2) Kenapa Makalah AI (section `#why-makalah`)
- Header section: judul "Kenapa Makalah AI?".
- Mobile: `Accordion` dengan 4 item ("Sparring Partner", "Percakapan Natural", "Sitasi Akurat", "Dipandu Bertahap").
- Desktop: grid 2x2 `Card` dengan ikon (UserCheck, MessageSquare, ShieldCheck, ListChecks), label "Benefit #1" s/d "Benefit #4" dan list poin.

3) Pricing
- Header: judul "Pilih paket penggunaan sesuai kebutuhan" + link "Lihat detail paket lengkap" ke `/pricing`.
- Komponen: `PricingSection` (layout grid di desktop, carousel di mobile).

4) Section lain
- Bagian "Learn + Resources" ada tapi disembunyikan (`{false && ...}`), termasuk konten video dan daftar resource.

## Dialog & toast
- Dialog hero: `Dialog` + `DialogContent` + `DialogClose` untuk badge "Anda Pawang, Ai Tukang".
- Toast: `useToast()` dipakai untuk notifikasi `waitlist=success` (title: "Terima kasih!", description: "Email kamu masuk daftar tunggu. Makasih!").

## Komponen kunci
- `ChatInputHeroMock` (desktop-only): simulasi input chat dengan animasi typewriter, cursor, dan shimmer placeholder.
- `TypewriterText`: animasi ketik teks dengan caret blink (`hero-caret-blink`).
- `PricingSection`: kartu harga (desktop) + carousel (mobile) dari data `pricingTiers`.

## Styling & typography
- Font global dari `.development/knowledge-base/ui-old-makalah/app/layout.tsx`:
  - `Inter` → `--font-sans`, `Nunito_Sans` → `--font-heading`, `Victor_Mono` → `--font-hero`, `JetBrains_Mono` → `--font-mono`.
- Class global di `.development/knowledge-base/ui-old-makalah/app/globals.css`:
  - `.section-screen-with-header`, `.section-screen`, `.section-screen-with-footer` untuk tinggi viewport.
  - `.hero-vivid`, `.home-hero.hero-vivid::before`, `.hero-grid-thin` untuk latar aurora/grid hero.
  - `.hero-text-shimmer` dan `.hero-caret-blink` untuk animasi mock input.
  - `.btn-green-solid` dipakai di tombol ajakan tertentu (lihat `PricingSection`).
- Typography elemen `nav` dan heading mengikuti `--font-hero/--font-heading` dari global CSS.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
