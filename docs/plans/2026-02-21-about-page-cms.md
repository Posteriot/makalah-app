# About Page CMS Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace single TipTap rich text editor for About page with structured section editors matching the page's 4-section architecture (Manifesto, Problems, Agents, Career/Contact).

**Architecture:** About page has 4 distinct sections with complex layouts (terminal panel, card grids, status badges). Each section gets its own editor in ContentManager, data stored in `pageContent` table. Frontend uses Wrapper Pattern (Static + CMS + Wrapper) same as Home page sections. The existing `CmsPageWrapper` + `richTextPages` approach is removed for About since it doesn't fit structured content.

**Tech Stack:** Convex (schema + mutations), React, TypeScript, Tailwind CSS, Iconoir icons

---

## Phase 1: Schema & Backend

### Task 1: Extend pageContent schema for About sections

**Files:**
- Modify: `convex/schema.ts:931-959` (pageContent table)

**Step 1: Add new sectionType literals**

In `convex/schema.ts`, find the `pageContent` table definition. Add 4 new literals to `sectionType` union:

```typescript
sectionType: v.union(
  v.literal("hero"),
  v.literal("benefits"),
  v.literal("feature-showcase"),
  // About page sections
  v.literal("manifesto"),
  v.literal("problems"),
  v.literal("agents"),
  v.literal("career-contact"),
),
```

**Step 2: Add new optional fields for About-specific data**

Add these fields after `primaryImageAlt` in the pageContent table:

```typescript
// Manifesto-specific
headingLines: v.optional(v.array(v.string())),      // ["Kolaborasi", "Penumbuh", "Pikiran"]
subheading: v.optional(v.string()),                   // "Teknologi tidak menggantikan..."
paragraphs: v.optional(v.array(v.string())),          // Terminal panel paragraphs

// Agents-specific: items[].status field
// Reuse existing `items` array but add status via `icon` field
// icon field stores "available" | "in-progress" for agents

// Career/Contact-specific
contactInfo: v.optional(v.object({
  company: v.string(),
  address: v.array(v.string()),
  email: v.string(),
})),
```

**Step 3: Commit**

```bash
git add convex/schema.ts
git commit -m "feat(schema): extend pageContent for About page sections"
```

### Task 2: Extend upsertSection mutation validators

**Files:**
- Modify: `convex/pageContent.ts:66-121` (upsertSection mutation)

**Step 1: Add new sectionType literals to mutation args**

In the `upsertSection` mutation args, update `sectionType` union:

```typescript
sectionType: v.union(
  v.literal("hero"),
  v.literal("benefits"),
  v.literal("feature-showcase"),
  v.literal("manifesto"),
  v.literal("problems"),
  v.literal("agents"),
  v.literal("career-contact"),
),
```

**Step 2: Add new field validators to mutation args**

Add after `primaryImageAlt`:

```typescript
headingLines: v.optional(v.array(v.string())),
subheading: v.optional(v.string()),
paragraphs: v.optional(v.array(v.string())),
contactInfo: v.optional(v.object({
  company: v.string(),
  address: v.array(v.string()),
  email: v.string(),
})),
```

**Step 3: Commit**

```bash
git add convex/pageContent.ts
git commit -m "feat(convex): extend upsertSection for About page fields"
```

### Task 3: Seed About page content

**Files:**
- Create: `convex/migrations/seedAboutContent.ts`

**Step 1: Create seed migration**

Create `convex/migrations/seedAboutContent.ts` with 4 records. Extract ALL text from `src/components/about/data.ts` and `ManifestoSection.tsx`:

```typescript
import { internalMutation } from "../_generated/server"

export const seedAboutContent = internalMutation({
  handler: async ({ db }) => {
    console.log("[Migration] Starting seedAboutContent...")

    const existing = await db
      .query("pageContent")
      .withIndex("by_page", (q) => q.eq("pageSlug", "about"))
      .first()

    if (existing) {
      console.log("[Migration] About page content already exists, skipping")
      return { success: false, message: "About content sudah ada." }
    }

    const now = Date.now()
    const insertedIds: string[] = []

    // 1. Manifesto
    const manifestoId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "manifesto",
      sectionType: "manifesto",
      badgeText: "Tentang Kami",
      headingLines: ["Kolaborasi", "Penumbuh", "Pikiran"],
      subheading: "Teknologi tidak menggantikan manusia, melainkan melengkapi agar kian berdaya",
      paragraphs: [
        "Platform ini disiapkan untuk merespons disrupsi teknologi dalam aktivitas akademik dan riset. Laju pemakaian AI/Large Language Model nggak bisa dihindari. Pelarangan penggunaannya di lingkungan akademik hanya memicu ketidakjujuran: ngomongnya nggak pakai, padahal diam-diam menggunakan.",
        "Bagaimana dengan detektor AI\u2014apakah absah? Problematik. Detektor AI rawan false positive dan hanya mengeluarkan persentase probabilitas tanpa argumen jelas. Selama tulisan mengikuti struktur subjek\u2013predikat\u2013objek\u2013keterangan, kalimat apa pun bisa terdeteksi \"buatan AI\".",
        "Yang diperlukan sekarang: mengatur penggunaan AI agar transparan, bisa dipertanggungjawabkan, dan punya riwayat pemakaian yang akuntabel. Siapa pun bisa dilacak: apakah paper dibuatkan AI, atau dibuat bersama AI? Bukankah itu dua hal yang berbeda?",
        "Makalah berdiri di posisi: Penggunaan AI harus transparan, terjejak, dan terdidik.",
      ],
      isPublished: false,
      sortOrder: 1,
      updatedAt: now,
    })
    insertedIds.push(String(manifestoId))

    // 2. Problems
    const problemsId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "problems",
      sectionType: "problems",
      badgeText: "Persoalan",
      title: "Apa saja persoalan yang dijawab?",
      items: [
        { title: "Ai Mematikan Rasa Ingin Tahu?", description: "Konon AI kerap bikin malas berpikir. Baiklah, Makalah sebaliknya, justru memantik diskusi dan menyangga teknis penulisan, supaya pengguna fokus menajamkan dan elaborasi gagasan." },
        { title: "Prompting Yang Ribet", description: "Makalah hadir untuk membantah asumsi: berinteraksi dengan Ai memerlukan prompting yang sakti mandraguna. Tidak! Yang diperlukan Makalah adalah percakapan iteratif, informatif, dalam bahasa sehari-hari. Singkatnya: ngobrol!" },
        { title: "Sitasi & Provenance", description: "Makalah memastikan setiap sumber tersitasi dengan format standar dan menyimpan asal-usul ide (provenance) agar kutipan mudah dilacak dan diaudit." },
        { title: "Plagiarisme? Dipagari Etis", description: "LLM dipagari etis untuk tidak menulis persis teks berhak cipta lebih dari 10 kata. Batasan ini sekaligus menutup celah plagiarisme dan menjaga orisinalitas gagasan pengguna." },
        { title: "Transparansi proses penyusunan", description: "Riwayat interaksi terekam rapi\u2014menjamin akuntabilitas dan membedakan kolaborasi dengan generasi otomatis." },
        { title: "Deteksi AI Problematik", description: "\"AI atau bukan\" tidak dapat dipertanggungjawabkan. Makalah mendorong transparansi penggunaan, bukan sekadar deteksi." },
      ],
      isPublished: false,
      sortOrder: 2,
      updatedAt: now,
    })
    insertedIds.push(String(problemsId))

    // 3. Agents
    const agentsId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "agents",
      sectionType: "agents",
      badgeText: "AI Agents",
      title: "Fitur & Pengembangan",
      items: [
        { title: "Sparring Partner", description: "Pendamping riset. Berperan sebagai juru tulis pengguna, sekaligus mitra diskusi.", icon: "available" },
        { title: "Dosen Pembimbing", description: "Layaknya Dosen Pembimbing, yang memberikan arahan struktur, kritik metodologi, dan petunjuk milestone.", icon: "in-progress" },
        { title: "Peer Reviewer", description: "Agen Ai berperan layaknya kawan debat, yang memberikan review kritis pada paper pengguna, lengkap dengan catatan argumen & referensi.", icon: "in-progress" },
        { title: "Gap Thinker", description: "Agen Ai menyorot celah riset dari berbagai paper referensi awal, menemukan potensi topik baru yang lebih segar.", icon: "in-progress" },
        { title: "Novelty Finder", description: "Agen Ai yang mampu memetakan kebaruan dan posisi kontribusi penyusun paper, dalam topik yang telah banyak diulas.", icon: "in-progress" },
        { title: "Graph Elaborator", description: "Pengguna mengirimkan konsep tertentu, kemudian agen Ai memetakan konsep itu dalam grafik, mengaitkannya dengan referensi, serta konsep-konsep sejenis yang pernah ada sebelumnya.", icon: "in-progress" },
      ],
      isPublished: false,
      sortOrder: 3,
      updatedAt: now,
    })
    insertedIds.push(String(agentsId))

    // 4. Career & Contact
    const careerContactId = await db.insert("pageContent", {
      pageSlug: "about",
      sectionSlug: "career-contact",
      sectionType: "career-contact",
      badgeText: "Karier & Kontak",
      title: "Bergabung atau Hubungi Kami",
      items: [
        { title: "Karier", description: "Update posisi akan kami tampilkan di halaman ini." },
      ],
      contactInfo: {
        company: "PT The Management Asia",
        address: ["Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"],
        email: "dukungan@makalah.ai",
      },
      isPublished: false,
      sortOrder: 4,
      updatedAt: now,
    })
    insertedIds.push(String(careerContactId))

    console.log(`[Migration] Success! Inserted ${insertedIds.length} about page sections`)
    return { success: true, insertedCount: insertedIds.length }
  },
})
```

**Step 2: Run seed**

```bash
npx convex run migrations/seedAboutContent:seedAboutContent
```

**Step 3: Commit**

```bash
git add convex/migrations/seedAboutContent.ts
git commit -m "feat(cms): seed About page content into pageContent table"
```

---

## Phase 2: CMS Editors

### Task 4: ManifestoSectionEditor

**Files:**
- Create: `src/components/admin/cms/ManifestoSectionEditor.tsx`

**Step 1: Create editor component**

Pattern: same as `HeroSectionEditor.tsx`. Query `api.pageContent.getSection` with `{ pageSlug: "about", sectionSlug: "manifesto" }`.

Fields:
- `badgeText` (Input) — "Tentang Kami"
- `headingLines` (3 Input fields, indexed) — each line of the heading
- `subheading` (Textarea) — subtitle text
- `paragraphs` (dynamic list of Textarea, add/remove) — terminal panel paragraphs
- `isPublished` (Switch)
- Save button

Use `useEffect` to sync from query result, same pattern as HeroSectionEditor.

upsertSection call: `sectionType: "manifesto"`, `sortOrder: 1`, include `headingLines`, `subheading`, `paragraphs`.

**Step 2: Commit**

```bash
git add src/components/admin/cms/ManifestoSectionEditor.tsx
git commit -m "feat(admin): manifesto section editor for About page CMS"
```

### Task 5: ProblemsSectionEditor

**Files:**
- Create: `src/components/admin/cms/ProblemsSectionEditor.tsx`

**Step 1: Create editor component**

Pattern: same as `BenefitsSectionEditor.tsx` (dynamic items list).

Fields:
- `badgeText` (Input) — "Persoalan"
- `title` (Input) — "Apa saja persoalan yang dijawab?"
- `items[]` — dynamic list, each with:
  - `title` (Input) — card title
  - `description` (Textarea) — card description
  - Remove button per item
- Add Item button
- `isPublished` (Switch)
- Save button

upsertSection call: `sectionType: "problems"`, `sortOrder: 2`.

**Step 2: Commit**

```bash
git add src/components/admin/cms/ProblemsSectionEditor.tsx
git commit -m "feat(admin): problems section editor for About page CMS"
```

### Task 6: AgentsSectionEditor

**Files:**
- Create: `src/components/admin/cms/AgentsSectionEditor.tsx`

**Step 1: Create editor component**

Similar to ProblemsSectionEditor but items have a status field.

Fields:
- `badgeText` (Input) — "AI Agents"
- `title` (Input) — "Fitur & Pengembangan"
- `items[]` — dynamic list, each with:
  - `title` (Input) — agent name
  - `description` (Textarea) — agent description
  - `icon` (Select dropdown: "available" | "in-progress") — stores status in `icon` field
  - Remove button per item
- Add Item button
- `isPublished` (Switch)
- Save button

Status uses the existing `icon` field in items array (string). Values: `"available"` or `"in-progress"`. Display labels: "Tersedia" / "Proses".

upsertSection call: `sectionType: "agents"`, `sortOrder: 3`.

**Step 2: Commit**

```bash
git add src/components/admin/cms/AgentsSectionEditor.tsx
git commit -m "feat(admin): agents section editor for About page CMS"
```

### Task 7: CareerContactEditor

**Files:**
- Create: `src/components/admin/cms/CareerContactEditor.tsx`

**Step 1: Create editor component**

Fields:
- `badgeText` (Input) — "Karier & Kontak"
- `title` (Input) — "Bergabung atau Hubungi Kami"
- **Karier section:**
  - `careerText` (Textarea) — stored as `items[0].description`
- **Kontak section:**
  - `company` (Input) — "PT The Management Asia"
  - `address` (Input) — "Jl. H. Jian, Kebayoran Baru, Jakarta Selatan"
  - `email` (Input) — "dukungan@makalah.ai"
  - All stored in `contactInfo` object
- `isPublished` (Switch)
- Save button

upsertSection call: `sectionType: "career-contact"`, `sortOrder: 4`. Include `items: [{ title: "Karier", description: careerText }]` and `contactInfo: { company, address: [address], email }`.

**Step 2: Commit**

```bash
git add src/components/admin/cms/CareerContactEditor.tsx
git commit -m "feat(admin): career & contact editor for About page CMS"
```

### Task 8: Wire editors into ContentManager

**Files:**
- Modify: `src/components/admin/ContentManager.tsx`

**Step 1: Update sidebar navigation**

Change About from flat page to expandable (like Home):

```typescript
type SectionId = "hero" | "benefits" | "features-workflow" | "features-refrasa"
  | "manifesto" | "problems" | "agents" | "career-contact"
```

Update `PAGES_NAV.pages` — change About entry to:

```typescript
{
  id: "about",
  label: "About",
  sections: [
    { id: "manifesto", label: "Manifesto" },
    { id: "problems", label: "Problems" },
    { id: "agents", label: "Agents" },
    { id: "career-contact", label: "Karier & Kontak" },
  ],
},
```

**Step 2: Update expand/collapse logic**

Currently only Home can expand (`homeExpanded` state). Generalize to support multiple expandable pages. Replace `homeExpanded` with `expandedPages` set:

```typescript
const [expandedPages, setExpandedPages] = useState<Set<PageId>>(new Set())

function handlePageClick(page: NavPage) {
  if (page.sections) {
    setExpandedPages((prev) => {
      const next = new Set(prev)
      if (next.has(page.id)) {
        next.delete(page.id)
      } else {
        next.add(page.id)
      }
      return next
    })
  } else {
    setSelectedPage(page.id)
    setSelectedSection(null)
  }
}
```

Update sidebar rendering: replace `page.sections && homeExpanded` with `page.sections && expandedPages.has(page.id)`.

**Step 3: Wire editor components in right panel**

Add imports and conditional rendering:

```typescript
import { ManifestoSectionEditor } from "./cms/ManifestoSectionEditor"
import { ProblemsSectionEditor } from "./cms/ProblemsSectionEditor"
import { AgentsSectionEditor } from "./cms/AgentsSectionEditor"
import { CareerContactEditor } from "./cms/CareerContactEditor"
```

Add to the conditional chain (replace the old `selectedPage === "about" && selectedSection === null` block):

```typescript
) : selectedPage === "about" && selectedSection === "manifesto" ? (
  <ManifestoSectionEditor userId={userId} />
) : selectedPage === "about" && selectedSection === "problems" ? (
  <ProblemsSectionEditor userId={userId} />
) : selectedPage === "about" && selectedSection === "agents" ? (
  <AgentsSectionEditor userId={userId} />
) : selectedPage === "about" && selectedSection === "career-contact" ? (
  <CareerContactEditor userId={userId} />
) : selectedPage === "privacy" ...
```

**Step 4: Commit**

```bash
git add src/components/admin/ContentManager.tsx
git commit -m "feat(admin): wire About section editors + generalize expandable sidebar"
```

---

## Phase 3: Frontend CMS Rendering

### Task 9: ManifestoSection CMS wrapper

**Files:**
- Create: `src/components/about/ManifestoSectionStatic.tsx`
- Create: `src/components/about/ManifestoSectionCMS.tsx`
- Modify: `src/components/about/ManifestoSection.tsx` (convert to wrapper)
- Modify: `src/components/about/index.ts` (add exports)

**Step 1: Create ManifestoSectionStatic**

Copy entire current `ManifestoSection.tsx` content to `ManifestoSectionStatic.tsx`. Rename export to `ManifestoSectionStatic`.

**Step 2: Create ManifestoSectionCMS**

Same layout as static but reads from `content: Doc<"pageContent">` prop:
- `content.headingLines` → heading lines (fallback to static if missing)
- `content.subheading` → subheading text
- `content.paragraphs` → terminal panel paragraphs

```typescript
import type { Doc } from "@convex/_generated/dataModel"
// ... same imports as static

type ManifestoSectionCMSProps = {
  content: Doc<"pageContent">
}

export function ManifestoSectionCMS({ content }: ManifestoSectionCMSProps) {
  const headingLines = content.headingLines ?? ["Kolaborasi", "Penumbuh", "Pikiran"]
  const subheading = content.subheading ?? ""
  const paragraphs = content.paragraphs ?? []
  // ... same JSX, replace constants with CMS data
}
```

**Step 3: Convert ManifestoSection to wrapper**

```typescript
"use client"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { ManifestoSectionStatic } from "./ManifestoSectionStatic"
import { ManifestoSectionCMS } from "./ManifestoSectionCMS"

export function ManifestoSection() {
  const section = useQuery(api.pageContent.getSection, {
    pageSlug: "about",
    sectionSlug: "manifesto",
  })
  if (section === undefined) return null
  if (section === null || !section.isPublished) return <ManifestoSectionStatic />
  return <ManifestoSectionCMS content={section} />
}
```

**Step 4: Update index.ts exports**

Add `ManifestoSectionStatic` and `ManifestoSectionCMS` exports.

**Step 5: Commit**

```bash
git add src/components/about/ManifestoSectionStatic.tsx src/components/about/ManifestoSectionCMS.tsx src/components/about/ManifestoSection.tsx src/components/about/index.ts
git commit -m "feat(about): manifesto section CMS-driven with static fallback"
```

### Task 10: ProblemsSection CMS wrapper

**Files:**
- Create: `src/components/about/ProblemsSectionStatic.tsx`
- Create: `src/components/about/ProblemsSectionCMS.tsx`
- Modify: `src/components/about/ProblemsSection.tsx` (convert to wrapper)
- Modify: `src/components/about/index.ts`

**Step 1: Create ProblemsSectionStatic**

Copy current `ProblemsSection.tsx` → rename export `ProblemsSectionStatic`.

**Step 2: Create ProblemsSectionCMS**

Reads from `content: Doc<"pageContent">`:
- `content.badgeText` → badge
- `content.title` → section heading
- `content.items` → cards (title + description)

The `DESKTOP_TITLE_LINES` mapping stays hardcoded in CMS version since it's a visual-only line break hint. CMS items use `item.title` directly for desktop (no line split).

**Step 3: Convert ProblemsSection to wrapper**

Same pattern: query → loading null → unpublished static → published CMS.

**Step 4: Commit**

```bash
git add src/components/about/ProblemsSectionStatic.tsx src/components/about/ProblemsSectionCMS.tsx src/components/about/ProblemsSection.tsx src/components/about/index.ts
git commit -m "feat(about): problems section CMS-driven with static fallback"
```

### Task 11: AgentsSection CMS wrapper

**Files:**
- Create: `src/components/about/AgentsSectionStatic.tsx`
- Create: `src/components/about/AgentsSectionCMS.tsx`
- Modify: `src/components/about/AgentsSection.tsx` (convert to wrapper)
- Modify: `src/components/about/index.ts`

**Step 1: Create AgentsSectionStatic**

Copy current `AgentsSection.tsx` → rename export.

**Step 2: Create AgentsSectionCMS**

Reads from `content: Doc<"pageContent">`:
- `content.badgeText` → badge
- `content.title` → section heading
- `content.items` → agent cards. Status from `item.icon` field ("available" | "in-progress")

Map items to `AgentTeaserItem[]`:
```typescript
const teaserItems = (content.items ?? []).map((item) => ({
  id: item.title.toLowerCase().replace(/\s+/g, "-"),
  name: item.title,
  statusKey: (item.icon ?? "in-progress") as "available" | "in-progress",
  status: item.icon === "available" ? "Tersedia" : "Proses",
  isHighlighted: item.icon === "available",
  description: item.description,
}))
```

Reuse `AgentTeaserCard` and `AgentsTeaserCarousel` — extract them from static into shared file or inline in CMS.

**Step 3: Convert AgentsSection to wrapper**

Same pattern.

**Step 4: Commit**

```bash
git add src/components/about/AgentsSectionStatic.tsx src/components/about/AgentsSectionCMS.tsx src/components/about/AgentsSection.tsx src/components/about/index.ts
git commit -m "feat(about): agents section CMS-driven with static fallback"
```

### Task 12: CareerContactSection CMS wrapper

**Files:**
- Create: `src/components/about/CareerContactSectionStatic.tsx`
- Create: `src/components/about/CareerContactSectionCMS.tsx`
- Modify: `src/components/about/CareerContactSection.tsx` (convert to wrapper)
- Modify: `src/components/about/index.ts`

**Step 1: Create CareerContactSectionStatic**

Copy current `CareerContactSection.tsx` → rename export.

**Step 2: Create CareerContactSectionCMS**

Reads from `content: Doc<"pageContent">`:
- `content.badgeText` → badge
- `content.title` → section heading
- `content.items[0]` → Karier card (title + description)
- `content.contactInfo` → Kontak card (company, address, email)

**Step 3: Convert CareerContactSection to wrapper**

Same pattern.

**Step 4: Commit**

```bash
git add src/components/about/CareerContactSectionStatic.tsx src/components/about/CareerContactSectionCMS.tsx src/components/about/CareerContactSection.tsx src/components/about/index.ts
git commit -m "feat(about): career & contact section CMS-driven with static fallback"
```

### Task 13: Remove CmsPageWrapper from About page

**Files:**
- Modify: `src/app/(marketing)/about/page.tsx`

**Step 1: Remove CmsPageWrapper**

About page currently wraps everything in `<CmsPageWrapper slug="about">`. Remove it since About now uses structured section editors, not rich text.

Before:
```tsx
<CmsPageWrapper slug="about" badge="Tentang">
  <main className="bg-background">
    <ManifestoSection />
    ...
  </main>
</CmsPageWrapper>
```

After:
```tsx
<main className="bg-background">
  <ManifestoSection />
  <ProblemsSection />
  <AgentsSection />
  <CareerContactSection />
</main>
```

**Step 2: Commit**

```bash
git add src/app/(marketing)/about/page.tsx
git commit -m "refactor(about): remove CmsPageWrapper, sections now individually CMS-driven"
```

---

## Phase 4: Cleanup & Verification

### Task 14: Remove About from richTextPages seed and cleanup

**Files:**
- Modify: `convex/migrations/seedRichTextPages.ts` — Remove "about" from pages array (optional, seed is idempotent)

This is optional since seeds are idempotent and the about record in richTextPages won't be queried anymore (CmsPageWrapper removed). Skip if not worth the diff.

**Step 1: Commit (if changed)**

```bash
git add convex/migrations/seedRichTextPages.ts
git commit -m "chore: remove about from richTextPages seed"
```

### Task 15: Run lint and test verification

**Step 1: Run lint**

```bash
npm run lint
```

Fix any CMS-related warnings (unused imports, etc).

**Step 2: Run tests**

```bash
npm run test
```

Verify no regressions. Expected: same 7/8 pass (1 pre-existing billing test failure).

**Step 3: Commit fixes if needed**

```bash
git commit -m "fix: address lint warnings from About CMS implementation"
```
