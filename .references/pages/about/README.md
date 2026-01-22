# Dokumentasi Halaman About (UI Lama)

## Cakupan
- Gue scan UI/components halaman About di `.development/knowledge-base/ui-old-makalah/app` dan `.development/knowledge-base/ui-old-makalah/src`.
- Fokus ke struktur section, komponen UI, serta styling/typography yang dipakai.

## Titik masuk halaman
- `.development/knowledge-base/ui-old-makalah/app/about/page.tsx` - halaman About (server component) dengan metadata judul/deskripsi.

## Struktur UI utama
1) Hero
- Wrapper: `<section className="hero-vivid hero-grid-thin">`.
- Judul: "AI Yang Menumbuhkan Pikiran" (font-heading).
- Subjudul: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya".
- Tombol ajakan: "Hubungi Kami" (link ke Gmail compose) pakai `buttonVariants` + class `btn-green-solid`.
- Label item:
  - Tombol: "Hubungi Kami".
  - Subjudul: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya".

2) Manifesto
- Wrapper section: `px-6 py-16 section-separator`.
- Judul: "Jadi, begini...".
- Ringkasan: blok `prose prose-invert` dengan teks manifesto pendek.
- Detail tambahan: `Accordion` (item `manifesto-more`) dengan trigger bulat posisi absolut, konten `prose prose-invert`.
- Label item:
  - Accordion item: "manifesto-more" (trigger tanpa teks, hanya ikon panah default Accordion).

3) Apa Saja Persoalan Yang Dijawab?
- Wrapper section: `px-6 py-16 section-separator`.
- Judul section: "Apa Saja Persoalan Yang Dijawab?".
- Mobile: `Accordion` 6 item (judul/teks), trigger teks kiri.
- Desktop: grid 2 kolom `Card` berisi ikon + judul + deskripsi.
- Label item (mobile/desktop sama):
  - "Ai Mematikan Rasa Ingin Tahu?"
  - "Prompting Yang Ribet"
  - "Sitasi & Provenance"
  - "Plagiarisme? Dipagari Etis"
  - "Transparansi proses penyusunan"
  - "Deteksi AI Problematik"

4) Ai Agents: Fitur & Pengembangan
- Wrapper section: `px-6 py-16 section-separator`.
- Judul: "Ai Agents: Fitur & Pengembangan".
- Mobile: `Accordion` dengan badge status di trigger ("Tersedia"/"Proses").
- Desktop: grid 2 kolom `Card` dengan badge status di kanan atas.
- Label item (mobile/desktop sama):
  - "Sparring Partner" (badge: "Tersedia")
  - "Dosen Pembimbing" (badge: "Proses")
  - "Peer Reviewer" (badge: "Proses")
  - "Gap Thinker" (badge: "Proses")
  - "Novelty Finder" (badge: "Proses")
  - "Graph Elaborator" (badge: "Proses")

5) Karier & Kontak
- Wrapper section: `px-6 py-16 section-separator`.
- Judul: "Karier & Kontak".
- Mobile: `Accordion` untuk "Bergabung dengan Makalah" dan "Hubungi Kami".
- Desktop: dua `Card` berdampingan ("Karier" dan "Kontak").
- Label item:
  - Accordion: "Bergabung dengan Makalah", "Hubungi Kami".
  - Card desktop: "Karier", "Kontak".

## Komponen UI yang dipakai
- `Button` + `buttonVariants` (tombol "Hubungi Kami").
- `Card`.
- `Badge` (status "Tersedia"/"Proses").
- `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`.

## Ikon (lucide-react)
- Hero/section dan kartu: `Brain`, `MessageSquare`, `Quote`, `ShieldCheck`, `GitBranch`, `AlertTriangle`, `BookOpen`, `Search`, `Lightbulb`, `Sparkles`, `Share2`, `Briefcase`, `Mail`.

## Styling & typography
- Font global dari `.development/knowledge-base/ui-old-makalah/app/layout.tsx`:
  - `Inter` → `--font-sans`, `Nunito_Sans` → `--font-heading`, `Victor_Mono` → `--font-hero`, `JetBrains_Mono` → `--font-mono`.
- Class global dari `.development/knowledge-base/ui-old-makalah/app/globals.css`:
  - `.hero-vivid`, `.hero-grid-thin` untuk latar hero.
  - `.btn-green-solid` untuk tombol ajakan.
  - `.section-screen*` (pola tinggi viewport di halaman publik lain, konsisten dengan layout global).
- Typografi `prose`/`prose-invert` untuk konten manifesto.

## File indeks
- Detail file per komponen ada di `./files-index.md`.
