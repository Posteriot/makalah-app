---
name: design-system
description: Membuat dan mengelola design system (tokens, variables, typography, spacing) berdasarkan standar industri (Figma-to-Code). Gunakan saat diminta menentukan token warna, skala tipografi, atau konfigurasi styling (Tailwind/CSS) yang terstruktur dan scalable.
---

# Design System Skill

## Overview

Lo bertugas buat ngerubah spesifikasi desain (dari Figma atau dokumen) jadi **Design Tokens** yang terstruktur. Fokus utamanya adalah pemisahan antara **Primitives** (nilai mentah) dan **Semantic Tokens** (peran/role). Ini kunci supaya aplikasi gampang di-theme (misal: Light/Dark mode).

## Workflow

### 1. Audit & Extraction (Figma-to-Tokens)
- **Identify Primitives**: List semua nilai mentah (hex colors, pixel spacing).
- **Define Semantic Tokens**: Petakan primitif ke dalam role-based tokens (misal: `bg-primary`, `text-success`).
- **Typography Scale**: Tentukan font-family (standar: Inter), font-weight, font-size, dan line-height yang konsisten.

### 2. Implementation (Tokens to Code)
- **Global CSS Variables**: Deklarasikan tokens di `:root` pake CSS variables.
- **Tailwind Config**: Extend `tailwind.config.js` pake tokens yang udah didefinisikan biar bisa dipake lewat utility classes (misal: `text-token-primary`).
- **Spacing Scale**: Gunakan basis matematis (misal: 4px/8px grid) untuk padding, margin, dan gap.

### 3. Verification
- **Visual Accuracy**: Pastiin nilai di kode sama persis sama spek Figma.
- **Scalability Test**: Cek apakah ganti satu nilai primitif (misal warna primer) otomatis ngerubah semua token yang pake alias tersebut.

## Area Fokus

- **Naming Convention**: Gunakan penamaan yang intuitif (e.g., `brand-500`, `action-primary`).
- **Accessibility**: Pastiin kontras warna token memenuhi standar WCAG (pake browser tool buat cek).
- **Inter-font**: Gunakan Inter sebagai font utama karena legibilitas tinggi.

## Resources

Gunakan referensi berikut:
- `references/tailwind-config-template.js`
- `references/css-variables-template.css`
- `references/typography-scale-sheet.md`
---
Berdasarkan riset: [Figma Design System Community](https://www.figma.com/design/3nqmE0yWOo59JkMBbGztaY/Design-System--Community-?node-id=0-1&p=f&t=MI0Gl3uM7UDFHFui-0)
