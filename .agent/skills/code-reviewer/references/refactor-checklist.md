# Refactor Checklist

## Prinsip
- Minim perubahan behavior.
- Keep diff kecil dan fokus.
- Jaga type safety.

## Simplifikasi
- Kurangi nested if/ternary berlebihan.
- Gabungkan kondisi yang duplikatif.
- Ekstrak helper kecil bila logic berulang.

## Cleanup
- Hapus unused import, dead code, dan console mubazir.
- Hapus type/interface yang tidak dipakai.

## Struktur
- Pastikan file/fungsi tidak overlong.
- Pertahankan pola yang sudah ada di codebase.

## Validasi
- Jalankan lint/test/typecheck/build.
- Jika gagal, perbaiki atau jelaskan kenapa.
