# globals-new.css Blueprint (Draft)

Dokumen ini adalah blueprint struktur untuk `src/app/globals-new.css`.  
Ini **bukan implementasi**, hanya kontrak struktur token untuk migrasi chat style.

## 1. Tujuan

- Menjadi staging source of truth token untuk standarisasi style chat.
- Menjaga baseline visual chat tetap sama saat migrasi dari hardcoded class ke semantic token.
- Menjadi jembatan sebelum token dipromosikan ke `src/app/globals.css`.

## 2. Non-Goals

- Tidak mengubah file komponen.
- Tidak mengaktifkan global system-wide token replacement.
- Tidak memindahkan token lama dari `globals.css` saat fase ini.

## 3. Lokasi dan Scope

- File target blueprint: `src/app/globals-new.css` (akan dibuat nanti saat eksekusi).
- Scope aktif token: **chat root saja** (bukan seluruh app).
- Root scope token di tahap awal: hanya chat root (bukan global app penuh) sampai stabil.
- Selector scope resmi (fixed rule): `data-ds-scope="chat-v1"`.
- Seluruh semantic token chat v1 wajib di-scope ke `[data-ds-scope="chat-v1"]`.
- Dilarang menggunakan selector scope lain untuk fase standardisasi chat v1 tanpa update dokumen aturan.

## 4. Struktur File yang Direkomendasikan

```css
/* ==========================================================================
 * DS Chat V1 - globals-new.css (staging)
 * ========================================================================== */

@import "tailwindcss";
@import "tw-animate-css";
@custom-variant dark (&:is(.dark *));

/* ==========================================================================
 * SECTION A: REFERENCE TOKENS (raw values only, no component usage)
 * Prefix: --ds-ref-*
 * ========================================================================== */
:root {
  /* Color refs: neutral */
  /* --ds-ref-color-slate-50 ... --ds-ref-color-slate-950 */

  /* Color refs: status */
  /* --ds-ref-color-warning-*, --ds-ref-color-success-*, --ds-ref-color-danger-*, --ds-ref-color-info-* */

  /* Alpha refs */
  /* --ds-ref-alpha-* */

  /* Typography refs */
  /* --ds-ref-font-*, --ds-ref-font-size-* */

  /* Spacing/radius/border refs */
  /* --ds-ref-space-*, --ds-ref-radius-*, --ds-ref-border-* */
}

.dark {
  /* Optional override only if raw refs need dark-specific values */
}

/* ==========================================================================
 * SECTION B: SEMANTIC TOKENS (chat-scoped, used by components)
 * Prefix: --ds-*
 * NOTE: scoped to [data-ds-scope="chat-v1"]
 * ========================================================================== */
[data-ds-scope="chat-v1"] {
  /* Surface */
  /* --ds-surface-base, --ds-surface-subtle, --ds-surface-panel, ... */

  /* Text */
  /* --ds-text-primary, --ds-text-secondary, --ds-text-muted, --ds-text-disabled */

  /* Border/Focus */
  /* --ds-border-subtle, --ds-border-strong, --ds-border-hairline, --ds-focus-ring */

  /* State */
  /* --ds-state-warning-*, --ds-state-success-*, --ds-state-danger-*, --ds-state-info-* */

  /* Overlay */
  /* --ds-overlay-backdrop */
}

.dark [data-ds-scope="chat-v1"] {
  /* same semantic names, dark values */
}

/* ==========================================================================
 * SECTION C: (Optional) Tailwind v4 @theme inline bridge
 * Only if needed for utility aliasing.
 * ========================================================================== */
@theme inline {
  /* optional bridge variables */
}
```

## 5. Token Group Wajib V1

Token wajib ini mengikuti `token-mapping-v1.md`:

### 5.1 Surface

- `--ds-surface-base`
- `--ds-surface-subtle`
- `--ds-surface-panel`
- `--ds-surface-panel-alt`
- `--ds-surface-elevated`
- `--ds-overlay-backdrop`

### 5.2 Text

- `--ds-text-primary`
- `--ds-text-secondary`
- `--ds-text-muted`
- `--ds-text-disabled`

### 5.3 Border / Focus

- `--ds-border-subtle`
- `--ds-border-strong`
- `--ds-border-hairline`
- `--ds-focus-ring`

### 5.4 State

- Warning:
- `--ds-state-warning-bg`
- `--ds-state-warning-fg`
- `--ds-state-warning-border`

- Success:
- `--ds-state-success-bg`
- `--ds-state-success-fg`
- `--ds-state-success-border`

- Danger:
- `--ds-state-danger-bg`
- `--ds-state-danger-fg`
- `--ds-state-danger-border`

- Info:
- `--ds-state-info-bg`
- `--ds-state-info-fg`
- `--ds-state-info-border`

## 6. Naming Rules (Hard Rule)

- Wajib: `--ds-*` dan `--ds-ref-*`
- Dilarang: `--chat-*` atau prefix domain khusus lain
- Semantic token dipakai di komponen; ref token hanya internal di `globals-new.css`

## 7. Aturan Migrasi ke Komponen

- Sebelum file dimigrasi: `dark:` boleh sementara.
- Setelah file dimigrasi:
- tidak boleh hardcoded color
- tidak boleh `dark:` untuk warna/border/shadow
- wajib pakai semantic token dari scope chat root

## 8. Checklist Validasi Blueprint (Sebelum Implementasi)

- [ ] Struktur section A/B/C final disetujui
- [ ] Token group wajib v1 lengkap
- [ ] Selector scope resmi tetap `data-ds-scope="chat-v1"` (fixed rule)
- [ ] Nilai light/dark untuk token v1 disetujui
- [ ] Urutan wave migrasi mengikuti `token-mapping-v1.md`

## 9. Exit Strategy ke globals.css

`globals-new.css` boleh dipromosikan ke `globals.css` jika:

- seluruh komponen chat sudah lolos target `0 hardcoded color`
- seluruh komponen chat sudah `0 dark:` untuk warna/border/shadow
- regression gate chat lulus (`chat-quality-gates-and-regression-checklist.md`)

## 10. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`

## 11. Governance Konsistensi

- Keputusan selector `data-ds-scope="chat-v1"` bersifat final untuk fase chat v1 dan hanya boleh diubah lewat revisi eksplisit dokumen aturan.
- DQ-01 (LOCKED):
- Untuk intent core lintas halaman (`surface-*`, `text-*`, `border-*`), canonical neutral family adalah `slate` melalui semantic token core `--ds-*`.
- `stone` tidak dipakai pada token core. Jika dibutuhkan untuk visual showcase/ilustratif, wajib lewat semantic token showcase terpisah, bukan hardcoded class.
- Komponen shared shell dan shared interaction lintas chat-home wajib pakai token core yang sama untuk intent yang sama.
