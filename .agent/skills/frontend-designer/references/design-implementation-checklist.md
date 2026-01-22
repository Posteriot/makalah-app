# Design Implementation Checklist

## Source Mockup
- Baca file utama di `.development/ui-mockup/html-css` (HTML/CSS/JS).
- Identifikasi section, layout grid, typography, dan warna.
- Catat behavior JS yang perlu dipindah ke React.

## Mapping ke Next.js
- Tentukan route di `src/app` sesuai halaman mockup.
- Pecah ke komponen reusable di `src/components` bila pola berulang.
- Gunakan App Router patterns yang sudah ada.

## Styling
- Konversi CSS ke Tailwind class (prioritas reuse dan consistency).
- Jika perlu CSS khusus, taruh di file yang sesuai pola repo.
- Pastikan responsive breakpoint jelas.

## Assets
- Pastikan gambar/icon terhubung ke `public/` atau komponen existing.
- Samakan font dan token warna dengan referensi lama.

## Behavior
- Pindahkan JS DOM ke hook React (useEffect/useState).
- Hindari direct DOM manipulation kalau bisa.

## Hygiene
- Hindari unused import.
- Pastikan type aman di TS.
