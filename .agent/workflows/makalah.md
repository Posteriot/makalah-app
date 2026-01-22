---
description: Workflow pengerjaan fitur makalah ai application di makalahapp
---

# Workflow Makalah AI Application

Ikuti langkah-langkah ini buat mastiin pengerjaan fitur makalahapp (AI, UI, Data) konsisten dan berkualitas tinggi:

## 1. Persiapan & Riset (Planning)
- **Gunakan Skill**: `product-analyst`, `data-architect`.
- Baca `.references/` dan audit schema Convex di `convex/schema.ts`.
- Buat `implementation_plan.md` yang detail, mencakup perubahan data model, API routes, dan UI.
- // turbo
- Jalankan `npx convex dev` (kalo perlu sync schema).

## 2. Inisiasi UI & Komponen (Frontend)
- **Gunakan Skill**: `frontend-designer`, `ux-expert`.
- Ambil referensi dari `.development/ui-mockup/html-css/`.
- Implementasi komponen di `src/components/` dengan Tailwind CSS.
- Pastikan responsifitas dan aksesibilitas (cek `accessibility-checklist.md`).

## 3. Pipeline AI & Logic (Execution)
- **Gunakan Skill**: `ai-engineer`.
- Implementasi routing AI di `src/app/api/chat/route.ts` atau `src/lib/ai/`.
- Gunakan Vercel AI SDK v5 (mesti paham `streamText`, `tools`, dll).
- Pastikan fallback provider (OpenRouter/Gateway) terkonfigurasi bener.

## 4. Review & Hardening (Verification)
- **Gunakan Skill**: `code-reviewer`, `security-auditor`.
- Lakukan audit security pada API routes dan Convex functions.
- Jalankan linting dan typecheck:
- // turbo
- `npm run lint && npm run type-check`

## 5. Optimasi & Finalisasi
- **Gunakan Skill**: `performance-optimizer`.
- Cek rerender yang gak perlu di React.
- Pastikan query Convex pake indeks yang bener.
- Buat `walkthrough.md` dengan bukti (screenshot/recording) dan hasil testing.

---
> [!IMPORTANT]
> Jangan pernah bypass tahap review di langkah ke-4. Kualitas dan keamanan adalah harga mati.
