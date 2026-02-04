# Global CSS Standard - Makalah Hybrid Design System (shadcn + Makalah-Carbon)

Dokumen ini mendefinisikan "Trinity" antara **Makalah-Carbon** (Aesthetics), **shadcn/ui** (Structure), dan **Tailwind CSS** (Utility). Fokus utamanya adalah menghilangkan custom CSS dan mengandalkan sistem token terpusat.

*Referensi: [IBM Carbon Design System](https://github.com/carbon-design-system/carbon)*

## 1. Hybrid Token Mapping

Kita memetakan variabel standar shadcn ke token warna Makalah-Carbon dalam format `oklch`.

### Light Mode (Makalah-Carbon Gray 10)
```css
:root {
  /* Makalah-Carbon Tokens */
  --gray-10: oklch(0.96 0.01 250);
  --gray-20: oklch(0.92 0.01 250);
  --blue-60: oklch(0.60 0.18 250);
  
  /* shadcn/ui Mapping */
  --background: var(--gray-10);
  --foreground: oklch(0.15 0 0); /* Makalah-Carbon Text Primary */
  --card: var(--gray-10);
  --popover: var(--gray-10);
  --primary: var(--blue-60);
  --primary-foreground: oklch(1 0 0);
  --muted: var(--gray-20);
  --muted-foreground: oklch(0.40 0.01 250);
  --border: var(--gray-20);
  --radius: 0px; /* Makalah-Carbon vibe: tajam */
}
```

### Dark Mode (Makalah-Carbon Gray 90/100)
```css
.dark {
  /* Makalah-Carbon Tokens */
  --gray-90: oklch(0.25 0.02 250);
  --gray-100: oklch(0.18 0.02 250);
  
  /* shadcn/ui Mapping */
  --background: var(--gray-90);
  --foreground: oklch(0.95 0 0);
  --card: var(--gray-100);
  --popover: var(--gray-100);
  --muted: oklch(0.30 0.02 250);
  --border: oklch(1 0 0 / 10%);
}
```

## 2. Typography Standard

Kita tetap menggunakan **Geist** sebagai font utama UI dan **Geist Mono** untuk elemen teknis, menjaga konsistensi dengan sistem yang sudah berjalan.

```css
@theme inline {
  --font-family-sans: var(--font-sans);
  --font-family-mono: var(--font-mono);
}
```

## 3. The "No Custom CSS" Strategy

Kita meminimalisir penggunaan `@layer components` untuk custom CSS. Sebaliknya, kita memperluas `@theme` agar semua nilai Makalah-Carbon tersedia sebagai utility Tailwind murni.

```css
@theme inline {
  /* Contoh: Gunakan bg-gray-10 daripada membuat class .bg-carbon-main */
  --color-gray-10: oklch(0.96 0.01 250);
  --color-blue-60: oklch(0.60 0.18 250);
  
  /* Layout tokens */
  --spacing-shell-header: 54px;
}
```

> [!WARNING]
> Jangan menulis CSS manual di dalam file `.tsx`. Gunakan class Tailwind (misal: `bg-background text-foreground`). Jika value belum ada, tambahkan ke standar `@theme` di sini dulu.
