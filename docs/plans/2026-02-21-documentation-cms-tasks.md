# Tasks: Documentation CMS Implementation

**Plan reference:** `docs/plans/2026-02-21-documentation-cms.md`

**Branch:** `feature/frontend-cms`

---

## Phase 1: Backend — Mutations + Schema Enhancement

### Task 1: Add admin CRUD mutations to documentationSections.ts

**Status:** TODO

**Files:**
- `convex/documentationSections.ts`

---

### Task 2: Add `richContent` field to section block schema

**Status:** TODO

**Files:**
- `convex/schema.ts`
- `src/components/marketing/documentation/types.ts`

---

## Phase 2: Admin Editor Components

### Task 3: Create DocSectionListEditor — section list view

**Status:** IN PROGRESS

**Files:**
- `src/components/admin/cms/DocSectionListEditor.tsx` (new)

---

### Task 4: Create DocSectionEditor — metadata + blocks editor

**Status:** TODO

**Files:**
- `src/components/admin/cms/DocSectionEditor.tsx` (new)

---

### Task 5: Create block sub-editor — InfoCardBlockEditor

**Status:** TODO

**Files:**
- `src/components/admin/cms/blocks/InfoCardBlockEditor.tsx` (new)

---

### Task 6: Create block sub-editor — CtaCardsBlockEditor

**Status:** TODO

**Files:**
- `src/components/admin/cms/blocks/CtaCardsBlockEditor.tsx` (new)

---

### Task 7: Create block sub-editor — SectionBlockEditor (TipTap with images)

**Status:** TODO

**Files:**
- `src/components/admin/cms/blocks/SectionBlockEditor.tsx` (new)

---

### Task 8: Wire documentation into ContentManager

**Status:** TODO

**Files:**
- `src/components/admin/ContentManager.tsx`

---

## Phase 3: Frontend Rendering Update

### Task 9: Update DocArticle to render richContent

**Status:** DONE

**Files:**
- [x] `src/components/marketing/documentation/DocArticle.tsx`

**What changed:**
- Added import for `RichTextRenderer` component
- Wrapped section block rendering with conditional check for `richContent` field
- If `richContent` exists, render via `RichTextRenderer` (TipTap JSON content)
- Otherwise, fall back to existing `paragraphs` and `list` rendering (backward compatible)
- All existing content without `richContent` continues rendering exactly as before

**Commit:** `1a7a839` feat(docs): support richContent rendering in DocArticle with fallback

---

## Phase 4: Verification

### Task 10: Lint, test, and manual verification

**Status:** TODO

**Files:**
- N/A (verification task)

---

## Summary Table

| Task | Phase | Status | What |
|------|-------|--------|------|
| 1 | Backend | TODO | Admin CRUD mutations + searchText generator |
| 2 | Backend | TODO | Add `richContent` field to section block |
| 3 | Editor | IN PROGRESS | DocSectionListEditor (section list view) |
| 4 | Editor | TODO | DocSectionEditor (metadata + blocks) |
| 5 | Editor | TODO | InfoCardBlockEditor |
| 6 | Editor | TODO | CtaCardsBlockEditor |
| 7 | Editor | TODO | SectionBlockEditor (TipTap + images) |
| 8 | Editor | TODO | Wire into ContentManager |
| 9 | Frontend | DONE | DocArticle richContent rendering |
| 10 | Verify | TODO | Lint, test, manual check |

---

## Dependencies

- Task 2 depends on Task 1 (schema export)
- Tasks 3-7 depend on Task 1 (mutations)
- Task 8 depends on Tasks 3-7 (editor components)
- Task 9 depends on Task 2 (richContent field)
- Task 10 depends on all
