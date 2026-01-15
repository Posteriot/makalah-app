# Refrasa Tool - Indeks File

Referensi cepat untuk semua file yang terhubung dengan Refrasa tool.

## Quick Jump

| Kategori | Jumlah | File Utama |
|---|---:|---|
| Core Refrasa (Library) | 5 | types, schemas, prompt-builder, loading-messages, index |
| API Route | 1 | /api/refrasa |
| Hook | 1 | useRefrasa |
| UI Components | 5 | RefrasaButton, IssueItem, ConfirmDialog, LoadingIndicator |
| Integrasi ArtifactViewer | 1 | ArtifactViewer |
| Style Constitution (Convex) | 3 | schema, queries/mutations, seed |
| Admin UI | 3 | AdminPanel, StyleConstitution UI |
| Integrasi Provider LLM | 1 | streaming helpers |
| Pengujian | 4 | UI tests + integration |
| Dokumen Refrasa | 3 | README, files-index, nlp-library |
| **Total** | **27** | |

---

## Core Refrasa (Library)

```
src/lib/refrasa/
├── index.ts                # Re-export Refrasa API (1-41)
├── types.ts                # Tipe Refrasa (1-84)
├── schemas.ts              # Zod schema (1-111)
├── prompt-builder.ts       # Prompt dua layer (1-232)
└── loading-messages.ts     # Pesan loading (1-43)
```

Ringkasan:
- `types.ts`: definisi tipe Refrasa.
- `schemas.ts`: Zod schema untuk request dan output.
- `prompt-builder.ts`: builder prompt dua layer.
- `loading-messages.ts`: pesan edukatif loading.

---

## API Route

```
src/app/api/refrasa/
└── route.ts                # Handler POST /api/refrasa (1-133)
```

Ringkasan:
- Endpoint POST /api/refrasa.
- Validasi input + generateObject output schema.
- Primary model dari `getGatewayModel()`, fallback dari `getOpenRouterModel()`.

---

## Hook

```
src/lib/hooks/
└── useRefrasa.ts           # Hook Refrasa (1-92)
```

Ringkasan:
- State management untuk request Refrasa.
- expose: analyzeAndRefrasa, reset, issueCount, issuesByCategory.

---

## UI Components

```
src/components/refrasa/
├── index.ts                         # Barrel export (1-10)
├── RefrasaButton.tsx                # Button trigger (1-117)
├── RefrasaIssueItem.tsx             # Item issue (1-104)
├── RefrasaConfirmDialog.tsx         # Dialog perbandingan (1-174)
└── RefrasaLoadingIndicator.tsx      # Loading indicator (1-44)
```

Ringkasan:
- Button trigger, dialog perbandingan, item issue, loading overlay.

---

## Integrasi ArtifactViewer

```
src/components/chat/
└── ArtifactViewer.tsx       # Integrasi Refrasa (1-550)
```

Ringkasan:
- Tombol Refrasa di toolbar.
- Context menu Refrasa di area konten.
- Apply Refrasa membuat versi baru artifact.

---

## Style Constitution (Convex)

```
convex/
├── schema.ts                                  # Tabel styleConstitutions (90-107)
├── styleConstitutions.ts                      # CRUD + versioning (1-406)
└── migrations/seedDefaultStyleConstitution.ts # Seed default constitution (1-158)
```

Ringkasan:
- Tabel `styleConstitutions` untuk Layer 2.
- Query/mutation untuk CRUD dan versioning.
- Seed default constitution (bootstrap).

---

## Admin UI

```
src/components/admin/
├── AdminPanelContainer.tsx                   # Tab Style Constitution (1-86)
├── StyleConstitutionManager.tsx              # Manager CRUD (1-557)
└── StyleConstitutionVersionHistoryDialog.tsx # Riwayat versi (1-192)
```

Ringkasan:
- Tab "Style Constitution" di Admin Panel.
- CRUD, aktivasi, deaktivasi, riwayat versi.

---

## Integrasi Provider LLM

```
src/lib/ai/
└── streaming.ts               # getGatewayModel/getOpenRouterModel (222-262)
```

Ringkasan:
- `getGatewayModel()` dan `getOpenRouterModel()` untuk Refrasa API.

---

## Pengujian

```
__tests__/
├── refrasa-button.test.tsx
├── refrasa-issue-item.test.tsx
├── refrasa-confirm-dialog.test.tsx
└── artifact-viewer-refrasa.test.tsx
```

Ringkasan:
- Unit test UI Refrasa dan integrasi ArtifactViewer.

---

## Dokumen Refrasa

```
.references/refrasa-tool/
├── README.md
├── files-index.md
└── nlp-library.md
```

Ringkasan:
- README: referensi teknis Refrasa.
- files-index: indeks file Refrasa.
- nlp-library: catatan riset NLP.

---

Last updated: 2026-01-15
