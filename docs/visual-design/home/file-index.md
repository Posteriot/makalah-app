Mapping file yang terender di "home" lewat page.tsx dan layout terkait (termasuk dependensi transitive + elemen login kondisional + asset public).

Entry + layout
- src/app/(marketing)/page.tsx — dipanggil di Next.js App Router sebagai entry route `/`
- src/app/(marketing)/layout.tsx — dipanggil di Next.js App Router sebagai layout untuk route group `(marketing)`
- src/app/layout.tsx — dipanggil di Next.js App Router sebagai root layout
- src/app/providers.tsx — dipanggil di `src/app/layout.tsx`
- src/app/globals.css — dipanggil di `src/app/layout.tsx`

Komponen marketing
- src/components/marketing/PawangBadge.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/HeroHeadingSvg.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/ChatInputHeroMock.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/HeroResearchMock.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/BenefitsSection.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/PricingSection.tsx — dipanggil di `src/app/(marketing)/page.tsx`
- src/components/marketing/WaitlistToast.tsx — dipanggil di `src/app/(marketing)/page.tsx`

Layout + login kondisional
- src/components/layout/GlobalHeader.tsx — dipanggil di `src/app/(marketing)/layout.tsx`
- src/components/layout/Footer.tsx — dipanggil di `src/app/(marketing)/layout.tsx`
- src/components/layout/UserDropdown.tsx — dipanggil di `src/components/layout/GlobalHeader.tsx`
- src/components/settings/UserSettingsModal.tsx — dipanggil di `src/components/layout/UserDropdown.tsx`
- src/components/admin/RoleBadge.tsx — dipanggil di `src/components/settings/UserSettingsModal.tsx`

Hook + util
- src/lib/hooks/useCurrentUser.ts — dipanggil di `src/components/layout/UserDropdown.tsx` dan `src/components/settings/UserSettingsModal.tsx`
- src/lib/utils.ts — dipanggil di `src/components/layout/GlobalHeader.tsx`, `src/components/layout/UserDropdown.tsx`, `src/components/settings/UserSettingsModal.tsx`, `src/components/marketing/PricingSection.tsx`, `src/components/marketing/HeroHeadingSvg.tsx`, `src/components/marketing/ChatInputHeroMock.tsx`

UI infra
- src/components/ui/sonner.tsx — dipanggil di `src/app/layout.tsx`

Dependensi data (Convex)
- convex/pricingPlans.ts — definisi query `getActivePlans`; dipanggil via `api.pricingPlans.getActivePlans` di `src/components/marketing/PricingSection.tsx`
- convex/users.ts — definisi query `getUserByClerkId`; dipanggil via `api.users.getUserByClerkId` di `src/lib/hooks/useCurrentUser.ts` (dipakai di header/user menu)
- convex/_generated/api.d.ts — deklarasi tipe `api.pricingPlans` + `api.users`; dipakai oleh `useQuery` untuk typing di `src/components/marketing/PricingSection.tsx` dan `src/lib/hooks/useCurrentUser.ts`
- convex/_generated/api.js — runtime export `api`; dipakai oleh `useQuery` di `src/components/marketing/PricingSection.tsx` dan `src/lib/hooks/useCurrentUser.ts`

Aset public yang dipakai di home
- public/logo/makalah_logo_500x500.png — dipanggil di `src/components/layout/GlobalHeader.tsx`
- public/logo/makalah_logo_white_500x500.png — dipanggil di `src/components/layout/Footer.tsx`
- public/makalah_brand_text.svg — dipanggil di `src/components/layout/GlobalHeader.tsx`
- public/makalah_brand_text_dark.svg — dipanggil di `src/components/layout/GlobalHeader.tsx`
- public/hero-heading-light.svg — dipanggil di `src/components/marketing/HeroHeadingSvg.tsx`
- public/hero-heading-dark.svg — dipanggil di `src/components/marketing/HeroHeadingSvg.tsx`
