# Konvensi Penamaan Class - Makalah-Carbon

Dokumen ini mendefinisikan standar penamaan class (Utility-First) untuk menjaga integritas visual **Mechanical Grace**. Developer wajib menggunakan abstraksi ini daripada nilai hardcoded.

## 1. Typography Hierarchy (Semantic First)
Jangan gunakan `font-sans` atau `font-mono` secara sembarangan. Gunakan berdasarkan konteks fungsional:

| Konteks | Class Tailwind | Peruntukan |
| :--- | :--- | :--- |
| **The Voice** | `.text-narrative` | Heading utama, Hero titles, Page Headlines (Geist Sans). |
| **The Interface** | `.text-interface` | Body, Deskripsi, Navigasi, Label, Data (Geist Mono). |
| **The Signal** | `.text-signal` | Tags, Badges, Status (Geist Mono + Uppercase + Wide Tracking). |

## 2. Hybrid Radius Scale
Gunakan standar radius ini untuk membedakan "Shell" (Wadah) dan "Core" (Data).

| Level | Class / Variable | Value | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Shell** | `.rounded-shell` | `16px (xl)` | Outer cards, main containers. |
| **Action** | `.rounded-action` | `8px (md)` | Buttons, Standard Inputs. |
| **Badge** | `.rounded-badge` | `6px (s-md)` | Status tags, category badges. |
| **Core** | `.rounded-none` | `0px` | Data grids, terminal lines, separation bars. |

## 3. Lines & Borders (Precision Utilities)
Standar ketebalan garis untuk menjaga kebersihan informasi.

| Jenis | Class Class | Value | Penggunaan |
| :--- | :--- | :--- | :--- |
| **Hairline** | `.border-hairline` | `0.5px` | Internal dividers, list separators. |
| **Standard** | `.border-main` | `1px` | Component borders (Card, Input). |
| **AI System** | `.border-ai` | `1px dashed` | AI bubbles, Machine-generated content. |

## 4. Interaction States (The Signature)
Standar perilaku elemen saat berinteraksi.

*   **`.hover-slash`**: Mengaktifkan pola garis diagonal (`/ / / /`) khas terminal saat di-hover. **Wajib untuk Command Palette**, **opsional** untuk CTA utama. CTA standar boleh memakai hover solid tanpa slash.
*   **`.active-nav`**: Memberikan aksen garis oranye di sisi kiri (`border-l-2 border-amber-500`) untuk item sidebar yang aktif.
*   **`.focus-ring`**: Menggunakan warna Sky/Info (`ring-info/50`) untuk menjaga kesan teknis, bukan biru standar browser.

## 5. Spacing & Gaps (Mechanical Breath)

*   **`.p-comfort` / `.gap-comfort`**: `16px` (Standard inner padding & gaps).
*   **`.p-dense` / `.gap-dense`**: `8px` (Tight lists & form groups).
*   **`.p-airy`**: `24px+` (Landing page sections).

## 6. Iconography Scale

*   **`.icon-micro`**: `12px` (Status indicators, badges).
*   **`.icon-interface`**: `16px` (Standard UI icons).
*   **`.icon-display`**: `24px` (Hero features, bento headers).

## 7. Bento Grid Specifics

*   **`.bento-container`**: Wrapper utama dengan `grid grid-cols-16 gap-comfort`.
*   **`.bento-item-sm`**: `col-span-4` (Modular block).
*   **`.bento-item-md`**: `col-span-8` (Double block).
*   **`.bento-item-lg`**: `col-span-12` (Triple block).
*   **`.bento-item-full`**: `col-span-16` (Full width).

## 8. Z-Index Layering

*   **`.z-base`**: Default content.
*   **`.z-overlay`**: `10` (Hover cards, active modules).
*   **`.z-popover`**: `20` (Tooltips, citations).
*   **`.z-drawer`**: `50` (Sidebars, diagnostics).
*   **`.z-command`**: `100` (Search/Command Palette).

---
> [!IMPORTANT]
> **Rule of Thumb**: Jika sebuah teks bersifat "instruksi sistem" atau "data", dia **HARUS** menggunakan font Mono (`.text-interface`). Jika teks bersifat "marketing/narasi", baru gunakan Sans (`.text-narrative`).

> [!NOTE]
> **Header Surface**: Hindari `bg-background` untuk header global. Header wajib memakai token `--header-background` lewat class komponen `global-header`.
