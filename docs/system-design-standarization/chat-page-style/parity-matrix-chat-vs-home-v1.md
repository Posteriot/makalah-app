# Parity Matrix Chat vs Home V1

Dokumen ini memetakan parity styling antara halaman chat (pilot) dan home (`/(marketing)`) untuk memastikan standarisasi token lintas halaman tetap konsisten.

## 1. Scope dan Metode

- Scope Chat:
- Referensi kontrak: `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- Scope Home:
- Route: `src/app/(marketing)/page.tsx`
- Layout: `src/app/(marketing)/layout.tsx`
- Komponen yang dipakai halaman home + shell marketing (header/footer) sebanyak `28` file.

Metode:

- Inventaris class styling home pada komponen yang dipakai route home.
- Bandingkan intent style home terhadap semantic token chat v1 (`--ds-*`).
- Tandai status parity: `Aligned`, `Partial`, atau `Decision Needed`.

## 2. Baseline Faktual (Ringkas)

Ringkasan inventaris home pada scope di atas:

- Total kemunculan `dark:`: `76`
- Total kemunculan hardcoded color (slate/stone/amber/emerald/rose/sky/white/black): `115`
- Komponen home paling padat hardcoded:
- `src/components/marketing/features/RefrasaFeatureMock.tsx` (`hardcoded:40`, `dark:13`)
- `src/components/layout/header/GlobalHeader.tsx` (`hardcoded:23`, `dark:21`)
- `src/components/marketing/features/WorkflowFeatureMock.tsx` (`hardcoded:22`, `dark:22`)
- `src/components/marketing/hero/ChatInputHeroMock.tsx` (`hardcoded:18`, `dark:1`)

## 3. Coverage Komponen Home yang Dicek

- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`
- `src/components/marketing/WaitlistToast.tsx`
- `src/components/marketing/SectionBackground/GridPattern.tsx`
- `src/components/marketing/SectionBackground/DiagonalStripes.tsx`
- `src/components/marketing/hero/PawangBadge.tsx`
- `src/components/marketing/hero/HeroHeading.tsx`
- `src/components/marketing/hero/HeroSubheading.tsx`
- `src/components/marketing/hero/HeroCTA.tsx`
- `src/components/marketing/hero/HeroResearchMock.tsx`
- `src/components/marketing/hero/ChatInputHeroMock.tsx`
- `src/components/marketing/benefits/BenefitsSection.tsx`
- `src/components/marketing/benefits/BenefitsBadge.tsx`
- `src/components/marketing/benefits/BenefitsTitle.tsx`
- `src/components/marketing/benefits/BentoBenefitsGrid.tsx`
- `src/components/marketing/benefits/BenefitsAccordion.tsx`
- `src/components/marketing/benefits/DocsCTA.tsx`
- `src/components/marketing/features/WorkflowFeatureSection.tsx`
- `src/components/marketing/features/WorkflowFeatureMock.tsx`
- `src/components/marketing/features/RefrasaFeatureSection.tsx`
- `src/components/marketing/features/RefrasaFeatureMock.tsx`
- `src/components/marketing/pricing-teaser/PricingTeaser.tsx`
- `src/components/marketing/pricing-teaser/PricingTeaserBadge.tsx`
- `src/components/marketing/pricing-teaser/PricingTeaserTitle.tsx`
- `src/components/marketing/pricing-teaser/TeaserCard.tsx`
- `src/components/marketing/pricing-teaser/TeaserCarousel.tsx`
- `src/components/marketing/pricing-teaser/TeaserSkeleton.tsx`
- `src/components/marketing/pricing-teaser/TeaserCTA.tsx`

## 4. Matrix Intent Parity

| Intent Styling | Chat V1 (Target Token) | Home Kondisi Saat Ini | Status |
|---|---|---|---|
| Page base surface | `--ds-surface-base` | Banyak area home sudah `bg-background` (`src/app/(marketing)/page.tsx`, `src/app/(marketing)/layout.tsx`) | Aligned |
| Panel / card surface | `--ds-surface-panel`, `--ds-surface-elevated` | Campuran token semantik + hardcoded (`bg-card/85`, `dark:bg-slate-900/85`, `bg-slate-200`) | Partial |
| Primary text | `--ds-text-primary` | Banyak area sudah `text-foreground`, tapi masih ada `text-slate-*` di hero/features/mocks | Partial |
| Secondary/muted text | `--ds-text-secondary`, `--ds-text-muted` | Campuran `text-muted-foreground` dan `text-slate-*`/`text-stone-*` | Partial |
| Border subtle/strong | `--ds-border-subtle`, `--ds-border-strong`, `--ds-border-hairline` | Campuran token border (`border-hairline`, `border-border`) dan hardcoded (`border-slate-*`, `border-stone-*`) | Partial |
| State warning | `--ds-state-warning-*` | Amber dipakai luas di chat dan home (`bg-amber-*`, `text-amber-*`) | Aligned (intent) |
| State success | `--ds-state-success-*` | Emerald dipakai luas di chat dan home (`bg-emerald-*`, `text-emerald-*`) | Aligned (intent) |
| State danger | `--ds-state-danger-*` | Rose dipakai untuk destructive/status di keduanya | Aligned (intent) |
| State info | `--ds-state-info-*` | Sky dipakai di keduanya, tapi home juga pakai slate/stone untuk info minor | Partial |
| Overlay / backdrop | `--ds-overlay-backdrop` | Home mock pakai overlay custom gradient + alpha literal (`RefrasaFeatureMock`) | Decision Needed |
| Theme switching | Token override `:root` vs `.dark` | Banyak komponen home masih `dark:` langsung (terutama header + feature mocks) | Decision Needed |
| Decorative pattern | Tokenized decorative intent (opsional) | `GridPattern` dan `DiagonalStripes` pakai `var(--slate-*)` + `dark:` class | Partial |
| Shadow language | Tokenized shadow intent (opsional) | Home feature mock banyak shadow literal RGBA stone; chat juga punya shadow literal di artifact tabs/modal | Decision Needed |

## 5. Anomali Utama yang Perlu Keputusan

| ID | Temuan Faktual | Dampak |
|---|---|---|
| DQ-01 | Neutral family beda: chat dominan `slate`, home mock dominan `stone` (`WorkflowFeatureMock`, `RefrasaFeatureMock`, `ChatInputHeroMock`) | Risiko mismatch lintas halaman untuk intent surface yang seharusnya sama |
| DQ-02 | Komponen home masih banyak `dark:` langsung (terutama `GlobalHeader`, `WorkflowFeatureMock`, `RefrasaFeatureMock`) | Bertabrakan dengan target akhir `0 dark:` untuk style warna/border/shadow |
| DQ-03 | Overlay dan glow di home mock pakai literal gradient/rgba (contoh `RefrasaFeatureMock`) | Sulit distandarkan jika belum diputuskan apakah ini bagian design-system atau “illustrative-only” |
| DQ-04 | Header home sudah campur semantic token + hardcoded slate | Potensi inkonsistensi dengan chat shell saat token v1 diadopsi lintas halaman |

## 6. Keputusan Parity (Status Saat Ini)

- DQ-01 (LOCKED):
- Untuk intent core lintas halaman (`surface-*`, `text-*`, `border-*`), canonical neutral family adalah `slate` melalui semantic token core `--ds-*`.
- `stone` tidak dipakai pada token core. Jika dibutuhkan untuk visual showcase/ilustratif, wajib lewat semantic token showcase terpisah, bukan hardcoded class.
- Komponen shared shell dan shared interaction lintas chat-home wajib pakai token core yang sama untuk intent yang sama.

- DQ-02 (OPEN):
- Komponen home yang masih `dark:` langsung akan diputuskan strategi migrasi bertahap setelah wave awal chat selesai.

- DQ-03 (OPEN):
- Overlay/glow literal pada komponen showcase home akan diputuskan apakah masuk token showcase atau direduksi.

- DQ-04 (OPEN):
- Header parity (token murni vs campuran hardcoded) akan diputuskan pada fase sinkronisasi shell lintas halaman.

## 7. Prioritas Sinkronisasi Chat vs Home

- Prioritas 1 (shared shell parity):
- `src/components/layout/header/GlobalHeader.tsx`
- `src/components/layout/footer/Footer.tsx`

- Prioritas 2 (shared interaction parity):
- `src/components/marketing/hero/ChatInputHeroMock.tsx`
- `src/components/marketing/benefits/BentoBenefitsGrid.tsx`
- `src/components/marketing/benefits/BenefitsAccordion.tsx`
- `src/components/marketing/pricing-teaser/TeaserCard.tsx`

- Prioritas 3 (showcase parity):
- `src/components/marketing/features/WorkflowFeatureMock.tsx`
- `src/components/marketing/features/RefrasaFeatureMock.tsx`

## 8. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/system-design-standarization/chat-page-style/token-mapping-v1.md`
- `docs/system-design-standarization/chat-page-style/globals-new-css-blueprint.md`
- `docs/chat-page/chat-ui-shell-responsive-and-theme-spec.md`
