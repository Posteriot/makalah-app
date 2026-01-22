# Dokumentasi Halaman Dokumentasi (UI Lama)

## Cakupan
- Gue scan UI/components halaman Dokumentasi di `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur layout, komponen UI, sidebar, search, dan styling/typography.

## Titik masuk halaman
- `.development/knowledge-base/ui-old-makalah/app/documentation/page.tsx` - halaman dokumentasi (komponen client) dengan sidebar dan konten dinamis.

## Struktur UI utama
1) Layout dua kolom
- Wrapper: `min-h-screen bg-background text-foreground`.
- Sidebar kiri (desktop): lebar `w-64`, border kanan, background `bg-card/30`, scroll `overflow-y-auto`.
- Konten kanan: `max-w-4xl` dengan padding `p-4 md:p-8`.

2) Sidebar desktop
- Input pencarian: placeholder "Cari dokumentasi..." + ikon `Search`.
- Hasil pencarian (dropdown): list hasil dengan snippet dan highlight `<mark>`.
  - Placeholder input: "Cari dokumentasi...".
  - Label hasil kosong (desktop): "Tidak ada hasil yang cocok".
  - Footer hasil: "Tekan Enter untuk membuka hasil teratas".
- Navigasi utama (nav): section "Mulai", "Fitur Utama", "Panduan Lanjutan".
- Item menu: tombol dengan icon + label; state aktif pakai `font-medium bg-muted/70 text-primary`.

3) Sidebar mobile (Sheet)
- Trigger: tombol ikon `Menu` (ghost, size icon) + label screen reader "Toggle Sidebar".
- `SheetContent` side `left` lebar `w-64`.
- Input pencarian di header sheet + hasil pencarian.
  - Label hasil kosong (mobile): "Tidak ada hasil".
- Navigasi sama seperti desktop; klik item auto-close sidebar.

4) Konten utama (renderContent)
- Konten berubah berdasarkan `activeSection`.
- Sub-section konten pakai class `no-section-separator`.
- Section tersedia:
  - Mulai: `Selamat Datang`, `Memulai`, `Panduan Cepat`, `Konsep Dasar`.
  - Fitur Utama: `Chat dengan AI`, `7 Fase Penulisan`.
  - Panduan Lanjutan: `Keamanan Data`, `Kebijakan Privasi`.

5) Navigasi bawah (mobile)
- Tombol `Kembali` dan `Lanjut` (variant outline) muncul di bawah konten.

## Komponen UI yang dipakai
- `Button`.
- `Input`.
- `Card`, `CardHeader`, `CardContent`, `CardTitle`, `CardDescription`.
- `Sheet`, `SheetTrigger`, `SheetContent`.

## Label item per section (sidebar)
- Mulai: "Selamat Datang", "Memulai", "Panduan Cepat", "Konsep Dasar".
- Fitur Utama: "Chat dengan AI", "7 Fase Penulisan".
- Panduan Lanjutan: "Keamanan Data", "Kebijakan Privasi".

## Label utama di konten
- Heading utama tiap section mengikuti label sidebar:
  - "Selamat Datang"
  - "Memulai"
  - "Panduan Cepat"
  - "Konsep Dasar"
  - "Chat dengan AI"
  - "7 Fase Penulisan"
  - "Keamanan Data"
  - "Kebijakan Privasi (Ringkas)"
- Label tombol CTA di konten "Selamat Datang": "Mulai Sekarang" dan "Pelajari Lebih Lanjut".

## Perilaku pencarian (client)
- Indeks pencarian dibangun dari data `buildSearchIndex()`.
- Tokenisasi dan stemming sederhana untuk Bahasa Indonesia.
- Skor: kecocokan title berbobot 2x, text 1x.
- Snippet: `makeSnippetAdvanced()` + `highlightSnippet()` (wrap dengan `<mark>`).

## Styling & typography
- Font global dari `.development/knowledge-base/ui-old-makalah/app/layout.tsx`:
  - `Inter` → `--font-sans`, `Nunito_Sans` → `--font-heading`, `Victor_Mono` → `--font-hero`, `JetBrains_Mono` → `--font-mono`.
- Class global dari `.development/knowledge-base/ui-old-makalah/app/globals.css`:
  - `nav` dan heading pakai `--font-hero/--font-heading`.
  - Layout standar publik konsisten dengan header/footer global.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
