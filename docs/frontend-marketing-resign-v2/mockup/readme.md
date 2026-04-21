# Makalah AI Mockup

Dokumen ini berisi panduan cara menjalankan mockup statis Makalah AI untuk keperluan desain dan pengembangan.

## Cara Menjalankan

Karena mockup ini menggunakan **React + Babel Standalone** untuk memproses file `.jsx` langsung di browser, file ini **wajib** dijalankan melalui web server (HTTP/HTTPS) agar tidak terkena blokir kebijakan CORS.

### 1. Menggunakan `npx serve` (Rekomendasi)

Jalankan perintah berikut di terminal pada direktori ini:

```bash
npx serve .
```

Setelah dijalankan, buka alamat yang muncul di browser (biasanya `http://localhost:3000` atau `http://localhost:5000`).

### 2. Menggunakan Python (Alternatif)

Jika Anda memiliki Python terinstal, jalankan:

```bash
python3 -m http.server 8000
```

Lalu buka `http://localhost:8000/Makalah AI.html` di browser.

## Struktur Folder

- `Makalah AI.html`: File entry point utama.
- `src/`: Berisi logika React (`.jsx`).
- `styles/`: Berisi CSS tokens dan komponen.
- `assets/`: Berisi gambar dan aset visual lainnya.
