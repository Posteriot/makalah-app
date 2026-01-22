# Frontend Validation Checklist

## Functionality
- Interaksi UI jalan (click, hover, form, state).
- Navigasi antar page/section sesuai flow.
- Empty/loading/error state ada bila perlu.

## Responsiveness
- Layout rapi di mobile dan desktop.
- Tidak ada overflow horizontal tanpa alasan.

## Rendering
- Hindari hydration mismatch.
- Gunakan "use client" hanya kalau perlu.

## Performance
- Hindari render ulang berlebihan.
- Hindari asset besar tanpa optimasi.

## Accessibility
- Gunakan semantic HTML.
- Pastikan label/aria pada form dan tombol penting.

## Build & Lint
- Jalankan `npm run lint`.
- Jalankan `npm run build`.
- Jalankan test bila ada perubahan behavior.
