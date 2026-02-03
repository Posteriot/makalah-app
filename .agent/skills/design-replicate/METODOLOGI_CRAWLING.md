# Metodologi Crawling & Replikasi Desain Visual

Dokumen ini ngerangkum step-by-step teknis yang gue lakuin buat ngejiplak desain `gitingest.com` secara utuh. Metode ini dirancang biar hasilnya 100% akurat secara visual dan fungsional (untuk mockup).

## 1. Fase Audit Visual & Teknis (Research)

Langkah awal adalah bedah daleman web target pake `browser_subagent`.

-   **Analisis Gaya Desain**: Identifikasi gaya (misal: *Neubrutalism* dengan border tebal `3px` dan hard shadow).
-   **Crawl Warna & Typo**: Gue ambil nilai computed style buat:
    -   CSS Variables (`:root`).
    -   Font family, weight, dan letter spacing.
    -   Palet warna background, input, dan tombol.
-   **Pemetaan Komponen**: Nyatet struktur utama (Header, Hero, Form Ingest, Footer).

## 2. Fase Ekstraksi Resource (Crawling)

Gue nggak mau cuma *copy-paste* kasar, jadi gue pake script Python buat otomatisasi biar data utuh.

### Struktur Folder Awal
Gue bikin folder `reference` buat nyimpen data mentah hasil download:
```bash
mkdir -p new-design-mockup/reference
```

### Script Otomatisasi (Python)
Gue jalanin script buat ambil:
1.  **HTML**: Ngambil `outerHTML` dari tag `<html>`.
2.  **JavaScript**: Download file statis internal (kayak `navbar.js`, `utils.js`, dll).
3.  **CSS**: Nyatet inline style dan link Tailwind CDN.
4.  **Aset SVG**: Download langsung dari path statis (sparkles, logo, icon social).

## 3. Fase Penataan File & Aset (Organization)

Setelah dapet mentahannya di `reference`, gue mulai rapihin buat struktur mockup yang bisa jalan mandiri (standalone).

1.  **Buat Folder Aset**:
    ```bash
    mkdir -p new-design-mockup/assets
    ```
2.  **Pemindahan File**: Mindahin semua `.svg` dari `reference` ke `assets`.
3.  **Inisialisasi Mockup**:
    -   Bikin file `index.html` (bersih dari script analytics target).
    -   Bikin file `script.js` (gabungan logic penting dari file-file mentah).

## 4. Fase Implementasi & Tweaking

Di sini tahap paling kritikal buat dapet hasil "sama persis".

-   **Tailwind Integration**: Karena web target pake Tailwind CDN dengan `@layer` custom, gue harus taro CSS itu di dalam tag `<style type="text/tailwindcss">` di `index.html` biar diproses bener sama CDN-nya.
-   **Path Correction**: Gue ubah semua `link` dan `src` yang tadinya ngarah ke `/static/...` jadi ngarah ke `./assets/...`.
-   **Logic Merging**: Gue gabungin fungsi-fungsi dari `navbar.js`, `git_form.js`, dan `utils.js` ke satu file `script.js` biar interaksi (kayak slider dan toggle) tetep aktif.

## 5. Fase Verifikasi (Validation)

Gue nggak asal klaim beres, tapi gue tes pake browser:

1.  **Visual Check**: Ambil screenshot mockup lokal, bandingin *side-by-side* sama screenshot web asli.
2.  **Bug Fixing**: Perbaikin kalau ada elemen yang nggak muncul (misal: `<h1>` yang ilang karena salah class, atau sparkle yang kegedean karena `@apply` nggak ke-load).
3.  **Interaction Test**: Mastiin slider jalan dan toggle bisa ngerubah state UI secara dinamis.

---

### Tips buat Replikasi Selanjutnya:
-   **Pake Python buat Download**: Jangan manual save page as, karena seringkali path-nya rusak atau ada data yang ke-skip.
-   **Internalize CSS**: Kalau pake Tailwind CDN, pastiin semua class `@apply` ada di file yang sama atau diproses via compiler biar nggak error.
-   **Standalone mindset**: Pastiin semua aset (icon/svg) ada di folder lokal, jangan narik dari URL target biar mockup awet.
