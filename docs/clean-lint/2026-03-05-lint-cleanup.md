# Lint Cleanup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menghilangkan semua 64 lint error/warning yang tersisa di codebase — 0 errors, 0 warnings.

**Architecture:** Tiga jenis masalah ditangani dengan tiga pendekatan berbeda:
1. `no-explicit-any` (43) — ganti `any` ke tipe yang benar berdasarkan Convex schema dan return types
2. `set-state-in-effect` (17) — refactor CMS editors dari pattern `useEffect+setState` ke `useMemo` derived state
3. `no-img-element` (4) — ganti `<img>` ke Next.js `<Image>` atau suppress di test mock

**Tech Stack:** TypeScript, Convex (generated types), React 19, Next.js 16

**Baseline:** 64 masalah (60 errors, 4 warnings) — diukur via `npm run lint`

**Verification command:** `npm run lint 2>&1 | tail -3` — harus menunjukkan `0 problems`

---

## Task 1: Fix `<img>` → `<Image>` (4 warnings, 3 file)

Paling cepat dan independen. Kerjakan duluan.

**Files:**
- Modify: `src/components/about/ManifestoSectionCMS.tsx:108,115`
- Modify: `src/components/chat/MessageBubble.tsx:689`
- Modify: `__tests__/billing-pro-card-ui.test.tsx:44`

### Step 1: Fix ManifestoSectionCMS.tsx

Dua `<img>` tag menampilkan gambar CMS (dark/light). Ganti ke `<Image>` dari `next/image`.

```tsx
// SEBELUM (line ~108):
<img src={terminalDarkUrl} alt="Manifesto terminal panel" className="w-full max-w-[720px] rounded-md hidden dark:block" />
<img src={terminalLightUrl} alt="Manifesto terminal panel" className="w-full max-w-[720px] rounded-md block dark:hidden" />

// SESUDAH:
import Image from "next/image"
// ...
<Image src={terminalDarkUrl} alt="Manifesto terminal panel" width={720} height={405} className="w-full max-w-[720px] rounded-md hidden dark:block" unoptimized />
<Image src={terminalLightUrl} alt="Manifesto terminal panel" width={720} height={405} className="w-full max-w-[720px] rounded-md block dark:hidden" unoptimized />
```

Note: `unoptimized` karena src dari Convex storage URL (external/dynamic). Aspect ratio 16:9 → 720×405.

### Step 2: Fix MessageBubble.tsx

Satu `<img>` tag menampilkan user-uploaded image di chat. Ganti ke `<Image>`.

```tsx
// SEBELUM (line ~689):
<img src={filePart.url} alt={filePart.filename ?? "attachment"} className="max-w-xs max-h-64 rounded-action border ..." loading="lazy" />

// SESUDAH:
import Image from "next/image"
// ...
<Image src={filePart.url} alt={filePart.filename ?? "attachment"} width={320} height={256} className="max-w-xs max-h-64 rounded-action border ... object-contain" unoptimized />
```

Note: `unoptimized` karena user-uploaded content. `object-contain` untuk maintain aspect ratio.

### Step 3: Fix test mock

`__tests__/billing-pro-card-ui.test.tsx` — ini test mock yang sengaja render `<img>`. Suppress dengan eslint-disable-next-line karena ini memang mock yang menggantikan `next/image`.

```tsx
// SEBELUM:
vi.mock("next/image", () => ({
  default: (props: Record<string, unknown>) => <img {...props} alt="" />,
}))

// SESUDAH:
vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} alt="" />,
}))
```

### Step 4: Verify

Run: `npm run lint 2>&1 | grep "no-img-element"`
Expected: Tidak ada output (0 matches)

### Step 5: Commit

```bash
git add src/components/about/ManifestoSectionCMS.tsx src/components/chat/MessageBubble.tsx __tests__/billing-pro-card-ui.test.tsx
git commit -m "fix(lint): replace <img> with Next.js Image and suppress test mock"
```

---

## Task 2: Fix `no-explicit-any` — Convex index builder callbacks (22 titik, 5 file)

Pattern paling banyak: `(q: any) => q.eq(...)` di `withIndex()`. Fix dengan inline structural type.

**Files:**
- Modify: `convex/stageSkills.ts` — 12 titik (line 64, 74, 84, 98, 114, 158, 196, 487, 562, 739, 757, 830)
- Modify: `convex/migrations/seedRichTextPages.ts` — 1 titik (line 42)
- Modify: `convex/migrations/seedSiteConfig.ts` — 2 titik (line 26, 53)
- Modify: `convex/migrations/seedWaitlistConfig.ts` — 1 titik (line 15)

### Step 1: Definisikan shared type

Tambahkan type alias di `convex/stageSkills.ts` (karena paling banyak dipakai di situ):

```ts
// Di bagian atas file, setelah imports:
/** Structural type for Convex index range builder callback parameter. */
type IndexRangeBuilder = {
  eq(field: string, value: unknown): IndexRangeBuilder
}
```

### Step 2: Replace semua `(q: any)` di stageSkills.ts

Ganti semua 12 kemunculan `(q: any)` → `(q: IndexRangeBuilder)` di `convex/stageSkills.ts`.

### Step 3: Replace di migration files

Untuk migration files, karena hanya 1-2 titik per file, definisikan type inline atau import. Pilih inline karena migration files seharusnya self-contained:

```ts
// Di setiap migration file, ganti:
.withIndex("by_slug", (q: any) => q.eq("slug", page.slug))
// Menjadi:
.withIndex("by_slug", (q: { eq(field: string, value: unknown): unknown }) => q.eq("slug", page.slug))
```

### Step 4: Verify

Run: `npm run lint 2>&1 | grep "no-explicit-any" | wc -l`
Expected: 21 (turun dari 43, sisa dari file lain)

### Step 5: Commit

```bash
git add convex/stageSkills.ts convex/migrations/seedRichTextPages.ts convex/migrations/seedSiteConfig.ts convex/migrations/seedWaitlistConfig.ts
git commit -m "fix(lint): type Convex index builder callbacks, remove 22 explicit-any"
```

---

## Task 3: Fix `no-explicit-any` — Convex db helper params (5 titik, 1 file)

**Files:**
- Modify: `convex/stageSkills.ts` — 5 titik (line 37, 59, 69, 79, 92)

### Step 1: Import Convex database types

```ts
// Di bagian atas convex/stageSkills.ts, tambahkan:
import type { GenericDatabaseReader, GenericDatabaseWriter } from "convex/server"
import type { DataModel } from "./_generated/dataModel"
```

### Step 2: Replace `db: any`

```ts
// Line 37: appendAuditLog — perlu write access
async function appendAuditLog(db: GenericDatabaseWriter<DataModel>, ...) { ... }

// Lines 59, 69, 79, 92: read-only helpers
async function getSkillBySkillId(db: GenericDatabaseReader<DataModel>, ...) { ... }
async function getSkillByStageScope(db: GenericDatabaseReader<DataModel>, ...) { ... }
async function getLatestVersionNumber(db: GenericDatabaseReader<DataModel>, ...) { ... }
async function getVersionByNumber(db: GenericDatabaseReader<DataModel>, ...) { ... }
```

### Step 3: Verify

Run: `npm run lint 2>&1 | grep "stageSkills.ts" | grep "no-explicit-any" | wc -l`
Expected: 0 (semua 17 any di stageSkills.ts solved)

### Step 4: Run typecheck

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: Tidak ada error baru

### Step 5: Commit

```bash
git add convex/stageSkills.ts
git commit -m "fix(lint): type Convex db helper params in stageSkills"
```

---

## Task 4: Fix `no-explicit-any` — stageSkills.test.ts (8 titik)

**Files:**
- Modify: `convex/stageSkills.test.ts` — 8 titik (line 177, 188, 193, 209, 219, 224, 238, 272)

### Step 1: Definisikan mock mutation type

Semua 8 `any` di test ini adalah cast untuk akses `_handler` dari Convex mutation. Definisikan structural type:

```ts
// Di bagian atas test file:
type MockMutationHandler<TArgs, TResult> = {
  _handler: (ctx: { db: MockDB }, args: TArgs) => Promise<TResult>
}
```

### Step 2: Replace `as any` → `as unknown as MockMutationHandler<...>`

Untuk setiap mutation call di test:

```ts
// SEBELUM:
await (createOrUpdateDraft as any)._handler(mockCtx, args)

// SESUDAH:
await (createOrUpdateDraft as unknown as MockMutationHandler<typeof args, unknown>)._handler(mockCtx, args)
```

Note: Karena tipe args berbeda per mutation, bisa juga pakai generic `MockMutationHandler<Record<string, unknown>, unknown>` untuk semua.

### Step 3: Verify

Run: `npm run lint 2>&1 | grep "stageSkills.test" | wc -l`
Expected: 0

### Step 4: Commit

```bash
git add convex/stageSkills.test.ts
git commit -m "fix(lint): replace any casts with structural mock types in stageSkills test"
```

---

## Task 5: Fix `no-explicit-any` — sisa file (8 titik, 6 file)

**Files:**
- Modify: `convex/aiOps.ts:169`
- Modify: `convex/migrations/enableTwoFactorAllUsers.ts:31`
- Modify: `src/app/api/webhooks/payment/route.ts:156`
- Modify: `src/app/(dashboard)/subscription/overview/page.tsx:321-322,609`
- Modify: `src/lib/ai/paper-stages/formatStageData.ts:162,182-183`
- Modify: `__tests__/format-stage-data-superseded.test.ts:18,36,56,80,119`

### Step 1: aiOps.ts (1 titik)

```ts
// Line 169 — Object.entries dari stageData
// SEBELUM:
([stageId, data]: [string, any])
// SESUDAH:
([stageId, data]: [string, Record<string, unknown>])
```

### Step 2: enableTwoFactorAllUsers.ts (1 titik)

```ts
// Line 31 — BetterAuth internal context access
// SEBELUM:
const authCtx = await (auth as any).$context
// SESUDAH:
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- BetterAuth internal API, no public type
const authCtx = await (auth as any).$context
```

Note: Ini satu-satunya `any` yang di-suppress karena BetterAuth tidak expose tipe untuk `$context`. Suppress justified.

### Step 3: payment webhook route.ts (1 titik)

```ts
// Line 156 — planType access
// SEBELUM:
const planType = (payment as any).planType ?? "pro_monthly"
// SESUDAH:
const planType = (payment as { planType?: string }).planType ?? "pro_monthly"
```

### Step 4: subscription overview page.tsx (3 titik)

```ts
// Lines 321-322 — AdminOverviewView props
// SEBELUM:
usageBreakdown: any
creditBalance: any
// SESUDAH:
usageBreakdown: { periodStart: number; periodEnd: number; totalTokens: number; breakdown: { type: string; tokens: number; cost: number; count: number; icon: string }[] } | null
creditBalance: { totalCredits: number; usedCredits: number; remainingCredits: number } | null
```

Line 609 otomatis terinfer setelah `usageBreakdown` di-type dengan benar — tidak perlu fix terpisah.

### Step 5: formatStageData.ts (3 titik)

```ts
// Line 162 — check superseded field
// SEBELUM:
if (data?.validatedAt && !(data as any).superseded) {
// SESUDAH:
if (data?.validatedAt && !(data as Record<string, unknown>).superseded) {

// Lines 182-183 — ringkasanDetail field
// SEBELUM:
typeof (data as any).ringkasanDetail === "string"
((data as any).ringkasanDetail as string).trim()
// SESUDAH:
typeof (data as Record<string, unknown>).ringkasanDetail === "string"
((data as Record<string, unknown>).ringkasanDetail as string).trim()
```

### Step 6: format-stage-data-superseded.test.ts (5 titik)

```ts
// Lines 18, 36, 56, 80, 119 — partial mock stage data
// SEBELUM:
formatStageData(stageData as any, "outline")
// SESUDAH:
formatStageData(stageData as Record<string, Record<string, unknown>>, "outline")
```

### Step 7: Verify

Run: `npm run lint 2>&1 | grep "no-explicit-any" | wc -l`
Expected: 1 (hanya enableTwoFactorAllUsers yang di-suppress)

Wait — suppress tidak dihitung. Expected: 0

### Step 8: Typecheck

Run: `npx tsc --noEmit 2>&1 | tail -5`
Expected: Tidak ada error baru

### Step 9: Commit

```bash
git add convex/aiOps.ts convex/migrations/enableTwoFactorAllUsers.ts src/app/api/webhooks/payment/route.ts "src/app/(dashboard)/subscription/overview/page.tsx" src/lib/ai/paper-stages/formatStageData.ts __tests__/format-stage-data-superseded.test.ts
git commit -m "fix(lint): resolve remaining no-explicit-any across 6 files"
```

---

## Task 6: Refactor CMS editors — `set-state-in-effect` (17 errors, 17 file)

Ini task terbesar. Semua 17 CMS editors pakai pattern yang sama:

```tsx
// PATTERN LAMA (bermasalah):
const [title, setTitle] = useState("")
useEffect(() => {
  if (section) {
    setTitle(section.title ?? "")
    // ... set semua state
  }
}, [section])
```

Masalah: `setState` di dalam `useEffect` bikin cascading renders. React Compiler menandai ini sebagai error.

### Pendekatan refactor: `key` prop + initial state dari data

**PATTERN BARU:**

```tsx
// Parent atau wrapper memberikan key berdasarkan data version:
<HeroSectionEditor key={section?._id} userId={userId} initialData={section} />

// Di dalam editor:
function HeroSectionEditor({ userId, initialData }: Props) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  // ... semua state diinisialisasi dari initialData
  // TIDAK ADA useEffect untuk sync
}
```

Tapi... ini butuh perubahan di parent components juga. Pendekatan yang lebih **minimal** dan **tidak butuh ubah parent**:

**PATTERN BARU (minimal, tanpa ubah parent):**

```tsx
function HeroSectionEditor({ userId }: Props) {
  const section = useQuery(api.pageContent.getSection, { ... })

  // Derive initial values with useMemo — hanya recompute saat section._id berubah
  const initialValues = useMemo(() => ({
    title: section?.title ?? "",
    subtitle: section?.subtitle ?? "",
    // ...
  }), [section?._id])  // key by _id, bukan seluruh object

  const [title, setTitle] = useState("")
  const [subtitle, setSubtitle] = useState("")

  // Reset state saat data ID berubah (initial load atau record baru)
  const [syncedId, setSyncedId] = useState<string | undefined>()
  if (section?._id !== syncedId) {
    setSyncedId(section?._id)
    setTitle(initialValues.title)
    setSubtitle(initialValues.subtitle)
    // ... semua state
  }
}
```

Wait — ini juga setState saat render. Pendekatan yang paling bersih dan React-compliant:

**PATTERN BARU (paling bersih):**

Gunakan `key` pada komponen itu sendiri dari dalam. Bungkus editor content dengan key:

Sebenarnya, pendekatan **paling sederhana dan React Compiler-friendly**:

```tsx
function HeroSectionEditor({ userId }: Props) {
  const section = useQuery(api.pageContent.getSection, { pageSlug: "home", sectionSlug: "hero" })

  if (section === undefined) return <Skeleton />

  // section sudah loaded — render form dengan initial values
  return <HeroSectionForm key={section?._id ?? "new"} section={section} userId={userId} />
}

// Form component terpisah — state diinisialisasi sekali dari props
function HeroSectionForm({ section, userId }: { section: SectionData | null; userId: Id<"users"> }) {
  const [title, setTitle] = useState(section?.title ?? "")
  const [subtitle, setSubtitle] = useState(section?.subtitle ?? "")
  // ... semua state langsung dari section, TANPA useEffect
  // key={section?._id} di parent memastikan form di-remount saat data berubah
}
```

Ini pattern yang React rekomendasikan: https://react.dev/learn/you-might-not-need-an-effect#resetting-all-state-when-a-prop-changes

### Daftar 17 file yang perlu direfactor

Setiap file direfactor dengan pattern yang sama: split menjadi Wrapper (query + loading) → Form (state dari props).

**CMS Section Editors (13 file):**

| # | File | Data source |
|---|------|-------------|
| 1 | `src/components/admin/cms/HeroSectionEditor.tsx` | `useQuery(api.pageContent.getSection, { home, hero })` |
| 2 | `src/components/admin/cms/BenefitsSectionEditor.tsx` | `useQuery(api.pageContent.getSection, { home, benefits })` |
| 3 | `src/components/admin/cms/FeatureShowcaseEditor.tsx` | `useQuery(api.pageContent.getSection, { pageSlug, sectionSlug })` — props |
| 4 | `src/components/admin/cms/ManifestoSectionEditor.tsx` | `useQuery(api.pageContent.getSection, { about, manifesto })` |
| 5 | `src/components/admin/cms/ProblemsSectionEditor.tsx` | `useQuery(api.pageContent.getSection, { about, problems })` |
| 6 | `src/components/admin/cms/AgentsSectionEditor.tsx` | `useQuery(api.pageContent.getSection, { about, agents })` |
| 7 | `src/components/admin/cms/CareerContactEditor.tsx` | `useQuery(api.pageContent.getSection, { about, career-contact })` |
| 8 | `src/components/admin/cms/PricingHeaderEditor.tsx` | `useQuery(api.pageContent.getSection, { pageSlug, sectionSlug })` — props |
| 9 | `src/components/admin/cms/PricingPlanEditor.tsx` | `useQuery(api.pricingPlans.getPlanBySlug, { slug })` |
| 10 | `src/components/admin/cms/HeaderConfigEditor.tsx` | `useQuery(api.siteConfig.getConfig, { key: "header" })` |
| 11 | `src/components/admin/cms/FooterConfigEditor.tsx` | `useQuery(api.siteConfig.getConfig, { key: "footer" })` |
| 12 | `src/components/admin/cms/DocSectionEditor.tsx` | `useQuery(api.documentationSections.getById, { id })` |
| 13 | `src/components/admin/cms/RichTextPageEditor.tsx` | `useQuery(api.richTextPages.getPageBySlug, { slug })` |

**CMS Overview Pages (4 file):**

| # | File | Data source |
|---|------|-------------|
| 14 | `src/components/cms/CmsBlogOverview.tsx` | `useQuery(api.pageContent.getSection, { blog, page-settings })` |
| 15 | `src/components/cms/CmsDocOverview.tsx` | `useQuery(api.pageContent.getSection, { docs, page-settings })` |
| 16 | `src/components/cms/CmsLegalOverview.tsx` | `useQuery(api.pageContent.getSection, { legal, page-settings })` |
| 17 | `src/components/cms/CmsPricingOverview.tsx` | `useQuery(api.pageContent.getSection, { pricing, pricing-header })` |

### Execution strategy

Karena semua file pakai pattern yang sama, kerjakan secara batch:

**Step 1:** Refactor HeroSectionEditor sebagai template — ini yang paling representative.
**Step 2:** Verify HeroSectionEditor pass lint + typecheck + tests.
**Step 3:** Apply pattern yang sama ke 12 CMS section editors lainnya.
**Step 4:** Apply pattern ke 4 CMS overview pages (lebih sederhana, hanya 3 state boolean).
**Step 5:** Verify seluruhnya: `npm run lint`, `npx tsc --noEmit`, `npx vitest run`.
**Step 6:** Commit.

```bash
git add src/components/admin/cms/*.tsx src/components/cms/Cms*Overview.tsx
git commit -m "fix(lint): refactor CMS editors to key-based remount, eliminate set-state-in-effect"
```

---

## Task 7: Final verification

### Step 1: Run full lint

```bash
npm run lint 2>&1 | tail -5
```

Expected: `✖ 0 problems` atau hanya the suppress di enableTwoFactorAllUsers

### Step 2: Run typecheck

```bash
npx tsc --noEmit
```

Expected: Zero errors

### Step 3: Run all tests

```bash
npx vitest run
```

Expected: 56 files, 265 tests pass (atau lebih jika tests ditambah)

### Step 4: Final commit jika ada adjustment

```bash
git commit -m "fix(lint): final cleanup — zero lint errors"
```

---

## Ringkasan Eksekusi

| Task | Masalah | Effort | Risiko |
|------|---------|--------|--------|
| 1. `<img>` → `<Image>` | 4 warnings | ~5 menit | Rendah — perubahan markup |
| 2. Index builder `any` | 22 errors | ~10 menit | Rendah — tambah type annotation |
| 3. `db: any` helpers | 5 errors | ~5 menit | Rendah — import Convex types |
| 4. Test mutation casts | 8 errors | ~10 menit | Rendah — structural type |
| 5. Sisa `any` | 8 errors | ~15 menit | Sedang — beberapa perlu type inference |
| 6. CMS `set-state-in-effect` | 17 errors | ~45-60 menit | Sedang — refactor pattern, 17 file |
| 7. Final verification | — | ~5 menit | — |

**Total estimasi: ~1.5-2 jam**
**Target: 64 → 0 masalah**
