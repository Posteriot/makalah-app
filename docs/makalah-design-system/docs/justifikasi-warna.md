# Justifikasi Warna Final - Makalah-Carbon

Dokumen ini adalah **rujukan final** dan ruang kerja untuk menentukan warna yang akan diimplementasikan ke dalam Makalah App. Kita akan memetakan warna original (dari audit) ke nilai **Makalah-Carbon** yang diusulkan.

*Referensi Utama: [Carbon Design System GitHub](https://github.com/carbon-design-system/carbon)*
*Referensi Utama: [Carbon Design System GitHub](https://github.com/carbon-design-system/carbon)*

## 1. Master Palette Reference (50-950)

Ini adalah nilai "mentah" yang akan diregistrasikan ke dalam `@theme` di `globals.css`.

### Slate (Neutrals)
```css
50:  oklch(.984 .003 247.858)
100: oklch(.968 .007 247.896)
200: oklch(.929 .013 255.508)
300: oklch(.869 .022 252.894)
400: oklch(.704 .04 256.788)
500: oklch(.554 .046 257.417)
600: oklch(.446 .043 257.281)
700: oklch(.372 .044 257.287)
800: oklch(.279 .041 260.031)
900: oklch(.208 .042 265.755)
950: oklch(.129 .042 264.695)
```

### Amber (Primary Brand)
```css
50:  oklch(.987 .022 95.277)
100: oklch(.962 .059 95.617)
200: oklch(.924 .12 95.746)
300: oklch(.879 .169 91.605)
400: oklch(.828 .189 84.429)
500: oklch(.769 .188 70.08)
600: oklch(.666 .179 58.318)
700: oklch(.555 .163 48.998)
800: oklch(.473 .137 46.201)
900: oklch(.414 .112 45.904)
950: oklch(.279 .077 45.635)
```

### Emerald (Secondary Brand)
```css
50:  oklch(.979 .021 166.113)
100: oklch(.95 .052 163.051)
200: oklch(.905 .093 164.15)
300: oklch(.845 .143 164.978)
400: oklch(.765 .177 163.223)
500: oklch(.696 .17 162.48)
600: oklch(.596 .145 163.225)
700: oklch(.508 .118 165.612)
800: oklch(.432 .095 166.913)
900: oklch(.378 .077 168.94)
950: oklch(.262 .051 172.552)
```

### Teal (Success)
```css
50:  oklch(.984 .014 180.72)
100: oklch(.953 .051 180.801)
200: oklch(.91 .096 180.426)
300: oklch(.855 .138 181.071)
400: oklch(.777 .152 181.912)
500: oklch(.704 .14 182.503)
600: oklch(.6 .118 184.704)
700: oklch(.511 .096 186.391)
800: oklch(.437 .078 188.216)
900: oklch(.386 .063 188.416)
950: oklch(.277 .046 192.524)
```

### Rose (Destructive)
```css
50:  oklch(.969 .015 12.422)
100: oklch(.941 .03 12.58)
200: oklch(.892 .058 10.001)
300: oklch(.81 .117 11.638)
400: oklch(.712 .194 13.428)
500: oklch(.645 .246 16.439)
600: oklch(.586 .253 17.585)
700: oklch(.514 .222 16.935)
800: oklch(.455 .188 13.697)
900: oklch(.41 .159 10.272)
950: oklch(.271 .105 12.094)
```

### Sky (Info)
```css
50:  oklch(.977 .013 236.62)
100: oklch(.951 .026 236.824)
200: oklch(.882 .059 254.128)
300: oklch(.828 .111 230.318)
400: oklch(.746 .16 232.661)
500: oklch(.685 .169 237.323)
600: oklch(.588 .158 241.966)
700: oklch(.5 .134 242.749)
800: oklch(.443 .11 240.79)
900: oklch(.391 .09 240.876)
950: oklch(.293 .066 243.157)
```

## 2. Pemetaan Utama (Core Semantic)

Di sini kita menentukan "jiwa" visual dari Makalah App. Silakan edit nilai di kolom **Proposed Value** jika ada penyesuaian.

| Token | Original Value | **Proposed (Slate Trinity)** | Justifikasi / Alasan |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(1 0 0)` | `oklch(.984 .003 247.858)` (Slate 50) | Memberikan kesan "Digital Canvas" yang lebih modern dan premium dibanding Gray. |
| `--primary` | `oklch(0.72 0.14 175)` | `oklch(0.769 .188 70.08)` (Amber 500) | Menggunakan Amber sebagai warna aksi utama agar kontras dengan Slate. |
| `--border` | `oklch(0.922 0 0)` | `oklch(.929 .013 255.508)` (Slate 200) | Hairline border yang sangat subtle untuk UI yang bersih. |

## 3. Layering & Surface (Dark Mode)

Strategi "multi-layer" menggunakan kedalaman palet Slate agar tidak terkesan kaku.

| Token | Original Value | **Proposed (Slate Dark)** | Justifikasi |
| :--- | :--- | :--- | :--- |
| `--background` | `oklch(0.145 0 0)` | `oklch(.208 .042 265.755)` (Slate 900) | Kedalaman warna yang lebih "deep techno" daripada Gray 90. |
| `--card` | `oklch(0.205 0 0)` | `oklch(.129 .042 264.695)` (Slate 950) | Kontainer paling dalam untuk efek fokus pada konten. |
| `--secondary` | `oklch(0.269 0 0)` | `oklch(.279 .041 260.031)` (Slate 800) | Aksen subtle untuk hover atau sidebar inactive. |

## 4. Warna Semantik (Status)

Konsistensi warna untuk memberikan *feedback* kepada user. Mengacu pada palet fungsional Carbon.

| Token | Original Value | **Proposed (Semantic Trinity)** | Justifikasi |
| :--- | :--- | :--- | :--- |
| `--success` | `oklch(0.711 0.181 125.2)` | `oklch(.704 .14 182.503)` (Teal 500) | Memberikan kesan "Modern Success" yang lebih ke arah scientific daripada hijau biasa. |
| `--warning` | `oklch(0.75 0.18 55)` | `oklch(.828 .189 84.429)` (Amber 400) | Visibilitas tinggi dengan warna brand untuk atensi moderat. |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(.645 .246 16.439)` (Rose 500) | Aksi krusial/destruktif yang elegan tapi tetap punya tingkat atensi tinggi. |
| `--info` | `oklch(0.65 0.15 250)` | `oklch(.685 .169 237.323)` (Sky 500) | Komunikatif dan harmonis dengan palet Slate. |

## 5. Warna Khusus AI (Carbon for AI Pattern)

Sesuai prinsip **The Trinity**, fitur AI harus memiliki visual identitas yang unik namun tetap harmonis.

| Token | Deskripsi | **Proposed Value** | Kegunaan |
| :--- | :--- | :--- | :--- |
| `--ai-border` | System Frame | `oklch(.685 .169 237.323)` (Sky 500) | Memberikan sinyal "Machine Generated" yang teknis dan bersih. |
| `--ai-bg-subtle` | Terminal Panel | `oklch(.129 .042 264.695)` (Slate 950) | Background kontras untuk modul AI agar kerasa seperti terminal window terpisah. |

> [!TIP]
> **Identitas Visual**: AI tidak menggunakan warna ungu. Identitas utamanya adalah gaya **Dashed/Dotted Border** menggunakan warna `--ai-border`.

## 6. Warna Bisnis (Tier & Subscription)

Memetakan warna tier yang sudah ada ke palet Carbon yang lebih luas agar tetap masuk dalam satu ekosistem visual.

| Tier | Original Value | **Proposed Makalah-Carbon** | Justifikasi |
| :--- | :--- | :--- | :--- |
| **GRATIS** | `oklch(0.55 0.15 165)` | `oklch(.596 .145 163.225)` (Emerald 600) | Menggunakan Emerald (Secondary Brand). |
| **BPP** | `oklch(0.55 0.2 260)` | `oklch(.588 .158 241.966)` (Sky 600) | Menggunakan Sky sebagai warna standar profesional. |
| **PRO** | `oklch(0.65 0.18 70)` | `oklch(.769 .188 70.08)` (Amber 500) | Menggunakan Amber (Main Brand). |

## 7. Data Visualization (Charts)

Palet warna kategorikal untuk grafik agar data mudah dibaca dan memiliki kontras yang cukup.

| Token | Deskripsi | **Proposed Value** | Logic Source |
| :--- | :--- | :--- | :--- |
| `--chart-1` | Data Utama | `oklch(.685 .169 237.323)` | Sky 500 (Keywords) |
| `--chart-2` | Data Kedua | `oklch(.696 .17 162.48)` | Emerald 500 (Strings) |
| `--chart-3` | Data Ketiga | `oklch(.769 .188 70.08)` | Amber 500 (Variables) |
| `--chart-4` | Data Keempat | `oklch(.645 .246 16.439)` | Rose 500 (Alerts) |
| `--chart-5` | Data Kelima | `oklch(.704 .14 182.503)` | Teal 500 (Classes) |

## 8. Status Interaksi (Interaction States)

Menstandarisasi *feedback* visual saat user berinteraksi dengan elemen UI.

| Token | Deskripsi | **Proposed Value** | Justifikasi |
| :--- | :--- | :--- | :--- |
| `--focus` | Focus Ring | `oklch(.685 .169 237.323 / 0.5)` | Outline Sky (Cyan-Blue) transparan untuk nuansa IDE. |
| `--selected-bg` | Item Terpilih | `oklch(.929 .013 255.508)` (Slate 200) | Memberikan kontras subtle pada list/sidebar. |
| `--hover-bg` | Hover State | `oklch(.968 .007 247.896 / 0.8)` (Slate 100) | Efek "tebal" saat kursor melintas. |

## 9. Warna Brand (Amber & Emerald Identity)

Sesuai arahan lo, kita meninggalkan Orange dan menggunakan **Amber** dan **Emerald** sebagai dua pilar identitas Makalah App. Palet ini memberikan kesan yang lebih kaya, prestisius (Amber), dan segar/bertumbuh (Emerald).

### Palet Amber (Warm/Action)
| Level | OKLCH Value | Kegunaan |
| :--- | :--- | :--- |
| 50 | `oklch(.987 .022 95.277)` | Highlight sangat subtle |
| 300 | `oklch(.879 .169 91.605)` | Secondary CTA |
| 500 | `oklch(.769 .188 70.08)` | **Main Brand / Accent** |
| 900 | `oklch(.414 .112 45.904)` | Bold text / Contrast |

### Palet Emerald (Trust/Business)
| Level | OKLCH Value | Kegunaan |
| :--- | :--- | :--- |
| 50 | `oklch(.979 .021 166.113)` | Page subtle background |
| 400 | `oklch(.765 .177 163.223)` | Tier Success / Verified |
| 600 | `oklch(.596 .145 163.225)` | **Secondary Brand** |
| 950 | `oklch(.262 .051 172.552)` | Deep accents / Footer |

## 10. Analisis Trinity (Kenapa Amber & Emerald?)
1. **Amber (Gold/Warmth)**: Memberikan kesan "Premium" dan "Valuable", cocok banget buat aplikasi yang berurusan sama karya ilmiah dan riset yang berharga. Secara visual, Amber adalah komplementer yang kuat untuk Gray/Blue base Carbon.
2. **Emerald (Growth/Organic)**: Memberikan kontras yang menenangkan dan profesional. Sangat pas dipakai buat status "Lulus Audit", "Verified", atau indikator progres yang positif.
3. **Modernity**: Nilai OKLCH yang lo kasih punya *chroma* yang sangat pas—nggak terlalu menusuk mata tapi tetep berkarakter. Ini bikin aplikasi lo kerasa "lahir di tahun 2026".

## 11. Ruang Edit & Draft Validasi

Gue bakal tulis draf variabel CSS yang siap kita "tembak" ke `globals.css` nanti. **Jangan di-copy dulu** sampai kita sepakat dengan nilai di atas.

```css
/* Draf Implementasi Trinity */
:root {
  --background: oklch(.984 .003 247.858); /* Slate 50 */
  /* Master Brand */
  --primary: oklch(.769 .188 70.08);      /* Amber 500 */
  --border: oklch(.929 .013 255.508);     /* Slate 200 */
  
  /* Semantic Status */
  --success: oklch(.704 .14 182.503);     /* Teal 500 */
  --destructive: oklch(.645 .246 16.439); /* Rose 500 */
  --info: oklch(.685 .169 237.323);        /* Sky 500 */
  
  /* AI Identity (Terminal Style) */
  --ai-border: var(--info);
  --ai-bg-subtle: oklch(.129 .042 264.695); /* Slate 950 */
  
  /* Interaction States */
  --ring: oklch(.685 .169 237.323 / 0.5);   /* Sky 500 Alpha */
  --list-selected-bg: oklch(.929 .013 255.508); /* Slate 200 */
  --list-hover-bg: oklch(.968 .007 247.896 / 0.8); /* Slate 100 Alpha */
  
  /* Business Tier */
  --segment-pro: oklch(.769 .188 70.08);    /* Amber 500 */
  --segment-bpp: oklch(.588 .158 241.966);  /* Sky 600 */
  --segment-gratis: oklch(.596 .145 163.225); /* Emerald 600 */
}

.dark {
  --background: oklch(.208 .042 265.755); /* Slate 900 */
  --card: oklch(.129 .042 264.695);       /* Slate 950 */
}
```

---
> [!TIP]
> **Status:** Menunggu Validasi User.  
> Silakan beri komentar atau instruksi jika ada warna spesifik yang ingin lo pertahankan atau ubah!
