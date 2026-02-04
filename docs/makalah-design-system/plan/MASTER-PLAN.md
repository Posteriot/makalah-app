# Master Plan: Mechanical Grace Migration

> **Status**: Draft v3
> **Scope**: Full App
> **Icon Strategy**: Per-Page Replacement
> **Created**: 2026-02-04

---

## 1. Tujuan

Migrasi visual Makalah App dari styling legacy ke standar **Mechanical Grace** — estetika industrial yang presisi, terinspirasi dari Factory.ai dan IBM Carbon Design System.

### Prinsip Utama
- **Trinity Approach**: Identity (Makalah-Carbon) + Structure (shadcn/ui) + Delivery (Tailwind v4)
- **Hybrid Radius**: Shell premium (16px) vs Core data tajam (0px)
- **Mono for Precision**: Geist Mono untuk semua data teknis, angka, metadata
- **Signal Theory**: Warna = Status (Amber=Action, Emerald=Trust, Sky=System)

---

## 2. Hirarki Dokumen

Dokumen ini adalah **konteks utama** yang akan diturunkan menjadi dokumen-dokumen yang lebih detail:

```
┌─────────────────────────────────────────────────────────────────────┐
│  LEVEL 1: MASTER PLAN (dokumen ini)                                 │
│  ├── Konteks besar & filosofi                                       │
│  ├── Struktur fase                                                  │
│  └── Overview task per fase                                         │
│                                                                     │
│         ▼                                                           │
│                                                                     │
│  LEVEL 2: PLAN KECIL PER FASE                                       │
│  ├── Lokasi: plan/fase-X-xxx.md                                     │
│  ├── Detail task dalam satu fase                                    │
│  ├── File yang akan dimodifikasi                                    │
│  ├── Acceptance criteria per task                                   │
│  └── Checklist verifikasi fase                                      │
│                                                                     │
│         ▼                                                           │
│                                                                     │
│  LEVEL 3: TEKNIS IMPLEMENTASI                                       │
│  ├── Code changes aktual                                            │
│  ├── Mengacu ke plan kecil sebagai guide                            │
│  ├── Commit atomic per task/komponen                                │
│  └── Review → Merge → Lanjut task berikutnya                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Aturan Penggunaan

1. **Sebelum mulai fase baru** → Buat plan kecil (`fase-X-xxx.md`) dari Master Plan ini
2. **Sebelum coding** → Baca plan kecil untuk konteks detail
3. **Selama coding** → Refer ke design system docs (`docs/makalah-design-system/docs/`)
4. **Setelah coding** → Update checklist di plan kecil, commit, lanjut task berikutnya
5. **Setelah fase selesai** → Update Progress Tracker di Master Plan ini

---

## 3. Dokumen Referensi (Design System Specs)

Semua dokumen spesifikasi berada di `docs/makalah-design-system/docs/`:

| # | Dokumen | Path | Fungsi |
|---|---------|------|--------|
| 1 | **MANIFESTO** | [MANIFESTO.md](../docs/MANIFESTO.md) | Filosofi "Mechanical Grace" & prinsip Trinity |
| 2 | **Global CSS** | [global-css.md](../docs/global-css.md) | Token CSS, variabel warna, mapping shadcn |
| 3 | **Typography** | [typografi.md](../docs/typografi.md) | Hirarki font Geist Sans & Mono |
| 4 | **Color** | [justifikasi-warna.md](../docs/justifikasi-warna.md) | Palet OKLCH: Slate, Amber, Emerald, Sky, Rose |
| 5 | **Shape & Layout** | [shape-layout.md](../docs/shape-layout.md) | Hybrid radius, border hairline, 16-col grid |
| 6 | **Visual Language** | [bahasa-visual.md](../docs/bahasa-visual.md) | Iconoir icons, tekstur industrial, motion |
| 7 | **Components** | [komponen-standar.md](../docs/komponen-standar.md) | Blueprint: Button, Card, Input, Table, dll |
| 8 | **AI Elements** | [ai-elements.md](../docs/ai-elements.md) | Chat UI: Shell, Bubbles, Artifacts, Paper |
| 9 | **Class Naming** | [class-naming-convention.md](../docs/class-naming-convention.md) | Utility: `.rounded-shell`, `.text-interface`, dll |

### Quick Reference: Kapan Pakai Dokumen Mana

| Situasi | Dokumen |
|---------|---------|
| Setup token/variabel CSS | `global-css.md`, `justifikasi-warna.md` |
| Pilih font/ukuran teks | `typografi.md` |
| Tentukan radius/border | `shape-layout.md` |
| Pilih ikon | `bahasa-visual.md` |
| Build komponen UI | `komponen-standar.md` |
| Build UI Chat/AI | `ai-elements.md` |
| Naming class Tailwind | `class-naming-convention.md` |
| Butuh konteks filosofi | `MANIFESTO.md` |

---

## 4. Struktur Fase

```
FASE 0   Foundation
FASE 1   Global Shell
FASE 2   Marketing Pages
FASE 3   Auth & Onboarding
FASE 4   Dashboard
FASE 5   Chat - Shell & Layout
FASE 6   Chat - Interaction
FASE 7   Chat - Artifacts & Paper
FASE 8   Chat - Tools
FASE 9   Admin Panel
FASE 10  Cleanup & Verification
```

---

## 5. Detail Per Fase

### FASE 0: FOUNDATION

**Tujuan**: Setup infrastruktur styling baru tanpa mengubah tampilan existing.

| Task | Output | Referensi |
|------|--------|-----------|
| Backup `globals.css` | `src/styles/legacy/globals.legacy.css` | - |
| Backup `tailwind.config.ts` | `src/styles/legacy/tailwind.config.legacy.ts` | - |
| Buat BARU `globals.css` | CSS tokens Makalah-Carbon | `global-css.md` |
| Buat BARU `tailwind.config.ts` | Theme extension & utilities | `global-css.md`, `class-naming-convention.md` |
| Setup utility classes | `.rounded-shell`, `.text-interface`, `.border-hairline`, etc | `class-naming-convention.md` |
| Install `iconoir-react` | Package dependency | `bahasa-visual.md` |

**Deliverable**: Plan kecil → `plan/fase-0-foundation.md`

---

### FASE 1: GLOBAL SHELL

**Tujuan**: Migrasi komponen yang muncul di hampir semua halaman.

| Task | Komponen | Lokasi File |
|------|----------|-------------|
| Header | Navigation Bar | `src/components/layout/Header.tsx` |
| Footer Standard | Marketing pages | `src/components/layout/footer/` |
| Footer Mini | Chat workspace | `src/components/chat/` |
| Sidebar | Dashboard & Admin | `src/components/layout/` |

**Deliverable**: Plan kecil → `plan/fase-1-global-shell.md`

---

### FASE 2: MARKETING PAGES

**Tujuan**: Migrasi halaman publik (user-facing, pre-login).

| Task | Halaman | Lokasi File |
|------|---------|-------------|
| Home | Hero + Sections | `src/app/(marketing)/page.tsx` |
| Pricing | Tier cards | `src/app/(marketing)/pricing/` |
| About | Story page | `src/app/(marketing)/about/` |
| Blog | Article list | `src/app/(marketing)/blog/` |
| Documentation | Docs hub | `src/app/(marketing)/docs/` |

**Deliverable**: Plan kecil → `plan/fase-2-marketing.md`

---

### FASE 3: AUTH & ONBOARDING

**Tujuan**: Migrasi flow autentikasi dan onboarding user baru.

| Task | Halaman | Catatan |
|------|---------|---------|
| Sign In / Sign Up | Clerk components | Override via `appearance` prop |
| Get Started | Onboarding steps | `src/app/get-started/` |
| Checkout | Payment selection | `src/app/checkout/` |

**Deliverable**: Plan kecil → `plan/fase-3-auth-onboarding.md`

---

### FASE 4: DASHBOARD

**Tujuan**: Migrasi area dashboard user (post-login, pre-chat).

| Task | Komponen | Lokasi File |
|------|----------|-------------|
| Papers Library | Grid view | `src/app/(dashboard)/dashboard/` |
| User Settings | Modal | `src/components/settings/` |
| Subscription | Management UI | `src/app/(dashboard)/subscription/` |

**Deliverable**: Plan kecil → `plan/fase-4-dashboard.md`

---

### FASE 5: CHAT WORKSPACE - SHELL & LAYOUT

**Tujuan**: Migrasi struktur layout Chat (16-column grid, Zero Chrome).

| Task | Komponen | Referensi |
|------|----------|-----------|
| Chat Layout | 16-col grid | `shape-layout.md` Section 6 |
| Activity Bar | Vertical nav 48px | `ai-elements.md` |
| Chat Sidebar | History, sessions | `ai-elements.md` |
| Tab Bar | Multi-tab ala VS Code | `ai-elements.md` |
| Panel Resizer | Drag divider | `ai-elements.md` |

**Constraint**: Global Header & Footer DILARANG muncul di area Chat.

**Deliverable**: Plan kecil → `plan/fase-5-chat-shell.md`

---

### FASE 6: CHAT WORKSPACE - INTERACTION

**Tujuan**: Migrasi komponen interaksi percakapan.

| Task | Komponen | Referensi |
|------|----------|-----------|
| Message Bubble (User) | `.rounded-action`, Sans font | `ai-elements.md` |
| Message Bubble (Assistant) | Mono metadata | `ai-elements.md` |
| Chat Input | Textarea + actions | `ai-elements.md` |
| Thinking Indicator | Terminal-style | `ai-elements.md` |
| Search Status | Progress literatur | `ai-elements.md` |
| Quick Actions | Copy, Edit | `ai-elements.md` |

**Deliverable**: Plan kecil → `plan/fase-6-chat-interaction.md`

---

### FASE 7: CHAT WORKSPACE - ARTIFACTS & PAPER

**Tujuan**: Migrasi panel output AI dan workflow paper.

| Task | Komponen | Referensi |
|------|----------|-----------|
| Artifact Panel | Side panel | `ai-elements.md` |
| Artifact Viewer | Content display | `ai-elements.md` |
| Paper Stage Progress | Timeline dots | `ai-elements.md` |
| Validation Panel | Approve/Revisi | `ai-elements.md` |
| Citation UI | Chip & sources | `ai-elements.md` |

**Deliverable**: Plan kecil → `plan/fase-7-chat-artifacts.md`

---

### FASE 8: CHAT WORKSPACE - TOOLS

**Tujuan**: Migrasi tool/dialog pendukung di Chat.

| Task | Komponen | Referensi |
|------|----------|-----------|
| Refrasa Dialog | Side-by-side comparison | `ai-elements.md` |
| File Upload UI | Attach button + preview | `ai-elements.md` |
| Export Menu | DOCX/PDF dropdown | `ai-elements.md` |

**Deliverable**: Plan kecil → `plan/fase-8-chat-tools.md`

---

### FASE 9: ADMIN PANEL

**Tujuan**: Migrasi area admin (internal only).

| Task | Komponen | Lokasi File |
|------|----------|-------------|
| Admin Layout | Sidebar + content | `src/app/(dashboard)/admin/` |
| Data Tables | Dense grid, Mono | `src/components/admin/` |
| Forms | Input styling | `src/components/admin/` |
| System Health | Monitoring UI | `src/components/admin/` |

**Deliverable**: Plan kecil → `plan/fase-9-admin.md`

---

### FASE 10: CLEANUP & VERIFICATION

**Tujuan**: Finalisasi dan pembersihan.

| Task | Action |
|------|--------|
| Remove `lucide-react` | Uninstall package, hapus semua import |
| Delete legacy backups | Remove `src/styles/legacy/` |
| Visual audit | Test semua halaman, semua breakpoints |
| Update docs | CLAUDE.md, README jika perlu |

**Checklist Lulus Audit**:
- [ ] Tidak ada `rounded` selain skala standar
- [ ] Semua ikon menggunakan Iconoir
- [ ] Angka & harga menggunakan Geist Mono
- [ ] Header/Footer tidak muncul di Chat
- [ ] Tidak ada hardcoded hex colors

**Deliverable**: Plan kecil → `plan/fase-10-cleanup.md`

---

## 6. Workflow Implementasi

```
┌─────────────────────────────────────────────────────────────┐
│  MASTER-PLAN.md (dokumen ini)                               │
│         │                                                   │
│         ▼                                                   │
│  fase-X-xxx.md (plan kecil per fase)                        │
│         │                                                   │
│         ▼                                                   │
│  Implementasi teknis (code changes)                         │
│         │                                                   │
│         ▼                                                   │
│  Review & Commit                                            │
│         │                                                   │
│         ▼                                                   │
│  Lanjut ke task berikutnya dalam fase                       │
│         │                                                   │
│         ▼                                                   │
│  Fase selesai → Lanjut fase berikutnya                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Konvensi Commit

Format: `refactor(<scope>): <description>`

Contoh:
```
refactor(foundation): create new globals.css with Makalah-Carbon tokens
refactor(header): migrate to Mechanical Grace + Iconoir icons
refactor(chat-shell): implement 16-column grid layout
```

---

## 8. Rollback Protocol

Jika terjadi visual breakage parah:
1. Revert commit yang bermasalah
2. Rujuk ke backup di `src/styles/legacy/`
3. Dokumentasikan issue di plan kecil terkait
4. Perbaiki sebelum lanjut

---

## 9. Progress Tracker

| Fase | Status | Tanggal Mulai | Tanggal Selesai |
|------|--------|---------------|-----------------|
| 0 - Foundation | ✅ Done | 2026-02-04 | 2026-02-04 |
| 1 - Global Shell | ✅ Done | 2026-02-04 | 2026-02-04 |
| 2 - Marketing | ✅ Done | 2026-02-04 | 2026-02-04 |
| 3 - Auth & Onboarding | ⏳ Pending | - | - |
| 4 - Dashboard | ⏳ Pending | - | - |
| 5 - Chat Shell | ⏳ Pending | - | - |
| 6 - Chat Interaction | ⏳ Pending | - | - |
| 7 - Chat Artifacts | ⏳ Pending | - | - |
| 8 - Chat Tools | ⏳ Pending | - | - |
| 9 - Admin | ⏳ Pending | - | - |
| 10 - Cleanup | ⏳ Pending | - | - |

---

> **Next Step**: Start FASE 3 → `plan/fase-3-auth-onboarding.md`
