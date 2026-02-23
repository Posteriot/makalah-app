# System Prompt Documentation

Dokumen ini menjelaskan arsitektur, runtime flow, governance, dan operasional **system prompt** di Makalah App.  
Ruang lingkup dokumen ini sengaja berfokus pada **current implementation** (clean slate), tanpa membahas histori perubahan.

## 1. Tujuan dan Scope

System prompt di Makalah App berfungsi sebagai lapisan instruksi global untuk model pada Chat API.  
Di runtime, system prompt tidak berdiri sendiri, melainkan dikombinasikan dengan beberapa dynamic context agar respons model tetap konsisten terhadap mode kerja, state paper workflow, file context, dan web sources context.

Scope dokumen:

1. Source of truth system prompt.
2. Komposisi prompt di runtime.
3. Fallback dan monitoring.
4. Admin management flow.
5. Operational checklist.
6. Daftar file yang relevan.

## 2. Source of Truth

Source of truth untuk prompt utama adalah table **`systemPrompts`** di Convex.

- Table definition: `convex/schema.ts:172`
- Active prompt query: `convex/systemPrompts.ts:14`
- Runtime fetch helper: `src/lib/ai/chat-config.ts:85`

Field utama pada `systemPrompts`:

1. `name`
2. `content`
3. `description`
4. `version`
5. `isActive`
6. `parentId`
7. `rootId`
8. `createdBy`
9. `createdAt`
10. `updatedAt`

## 3. Runtime Prompt Composition

Chat API menyusun prompt sebagai gabungan beberapa system-level messages sebelum `streamText`.

Base assembly flow:

1. Ambil base system prompt via `getSystemPrompt()`.
2. Ambil paper mode prompt via `getPaperModeSystemPrompt()` (jika ada session paper).
3. Tambahkan paper workflow reminder (jika intent paper terdeteksi tapi session belum ada).
4. Tambahkan file context (jika ada file upload).
5. Tambahkan `AVAILABLE_WEB_SOURCES` context (jika ada sources terbaru di conversation).
6. Tambahkan message history yang sudah disanitasi/trim.

Referensi implementasi:

- `src/app/api/chat/route.ts:228`
- `src/app/api/chat/route.ts:231`
- `src/app/api/chat/route.ts:452`
- `src/app/api/chat/route.ts:454`
- `src/app/api/chat/route.ts:457`
- `src/app/api/chat/route.ts:460`
- `src/app/api/chat/route.ts:463`

## 4. Jenis Prompt dalam Sistem

### 4.1 Base System Prompt (Database-backed)

Prompt utama yang berlaku global untuk chat request.

- Fetch: `src/lib/ai/chat-config.ts:85`
- Query: `api.systemPrompts.getActiveSystemPrompt`

### 4.2 Minimal Fallback Prompt

Jika active prompt tidak tersedia atau database fetch gagal, sistem menggunakan fallback prompt minimal.

- Definition: `src/lib/ai/chat-config.ts:13`
- Fallback triggers:
1. No active prompt.
2. Database error saat fetch.

### 4.3 Paper Mode System Prompt

Prompt dinamis berbasis state paper session:

1. Current stage + stage status.
2. Stage-specific instructions.
3. Formatted stage data.
4. Artifact summaries.
5. Invalidation context (rewind scenario).

Referensi:

- `src/lib/ai/paper-mode-prompt.ts:46`
- `src/lib/ai/paper-stages/index.ts:33`
- `src/lib/ai/paper-stages/foundation.ts`
- `src/lib/ai/paper-stages/core.ts`
- `src/lib/ai/paper-stages/results.ts`
- `src/lib/ai/paper-stages/finalization.ts`
- `src/lib/ai/paper-stages/formatStageData.ts:98`

### 4.4 Router Prompt (Web Search Decision)

Prompt khusus untuk routing decision: apakah turn harus mengaktifkan web search mode.

- `src/app/api/chat/route.ts:710`
- `src/app/api/chat/route.ts:744`
- `src/app/api/chat/route.ts:768`

### 4.5 Web Search Behavior Note

System note yang di-inject saat web search mode aktif agar model mematuhi tool constraints.

- `src/app/api/chat/route.ts:1236`
- `src/app/api/chat/route.ts:1260`

### 4.6 Paper Workflow Reminder

System prompt reminder untuk memaksa `startPaperSession` saat paper intent terdeteksi.

- `src/lib/ai/paper-workflow-reminder.ts:15`
- `src/app/api/chat/route.ts:256`

### 4.7 Paper Tools Only / Search Notes

System notes untuk mode decision di paper workflow:

1. `PAPER_TOOLS_ONLY_NOTE`
2. `getResearchIncompleteNote()`
3. `getFunctionToolsModeNote()`

Referensi:

- `src/lib/ai/paper-search-helpers.ts:231`
- `src/app/api/chat/route.ts:1180`
- `src/app/api/chat/route.ts:1263`
- `src/app/api/chat/route.ts:1271`

## 5. Fallback Monitoring dan Alerting

Saat fallback aktif, sistem membuat alert ke table `systemAlerts` agar visible di Admin Panel.

Referensi:

- Fallback logging: `src/lib/ai/chat-config.ts:52`
- Alert mutation: `convex/systemAlerts.ts:128`
- Alert table schema: `convex/schema.ts:259`
- Fallback status query: `convex/systemAlerts.ts:97`

Jenis alert yang digunakan untuk fallback:

1. `alertType: "fallback_activated"`
2. `severity: "critical"`
3. `source: "chat-api"`

## 6. Admin Management Flow

Management prompt dilakukan di tab **System Prompts** pada Admin Panel.

UI components:

1. `src/components/admin/AdminContentSection.tsx:52`
2. `src/components/admin/SystemPromptsManager.tsx:66`
3. `src/components/admin/SystemPromptFormDialog.tsx:37`
4. `src/components/admin/VersionHistoryDialog.tsx:30`
5. `src/components/admin/SystemHealthPanel.tsx:22`
6. `src/components/admin/adminPanelConfig.ts:60`

Convex operations yang dipakai:

1. `getActiveSystemPrompt`
2. `listSystemPrompts`
3. `getPromptVersionHistory`
4. `createSystemPrompt`
5. `updateSystemPrompt`
6. `activateSystemPrompt`
7. `deactivateSystemPrompt`
8. `deleteSystemPrompt`
9. `deletePromptChain`

Referensi implementasi: `convex/systemPrompts.ts`

## 7. Security dan Access Control

1. Read active prompt untuk runtime chat tidak memerlukan admin guard, agar Chat API dapat selalu membaca prompt aktif.
2. CRUD prompt management dibatasi untuk role admin/superadmin melalui `requireRole`.
3. System health alert queries/mutations juga dibatasi role admin/superadmin.

Referensi:

- `convex/systemPrompts.ts:14`
- `convex/systemPrompts.ts:30`
- `convex/systemAlerts.ts:13`
- `convex/permissions.ts`

## 8. Operasional: Verifikasi Cepat

### 8.1 Cek prompt aktif runtime

```bash
npm run convex -- run systemPrompts:getActiveSystemPrompt
```

Output minimum yang perlu diverifikasi:

1. `isActive: true`
2. `content` terisi
3. `version` sesuai target release

### 8.2 Cek jalur fallback

Indikator fallback mode:

1. `getSystemPrompt()` return dari `getMinimalFallbackPrompt()`.
2. Muncul alert `fallback_activated` di `systemAlerts`.
3. `SystemHealthPanel` menampilkan status fallback aktif.

Referensi:

- `src/lib/ai/chat-config.ts:94`
- `src/lib/ai/chat-config.ts:99`
- `src/components/admin/SystemHealthPanel.tsx:132`

## 9. Constraints dan Design Decisions

1. Prompt utama bersifat **database-driven**, bukan hardcoded pada route.
2. Runtime context memakai **multi-system-message composition** agar prompt modular.
3. Fallback prompt sengaja minimal agar:
   1. sistem tetap berfungsi,
   2. degradasi mudah terdeteksi,
   3. admin terdorong melakukan recovery cepat.
4. Paper mode menggunakan dynamic injection supaya behavior per stage tetap deterministic terhadap workflow state.

## 10. Daftar File Terkait

Core runtime:

1. `src/app/api/chat/route.ts`
2. `src/lib/ai/chat-config.ts`
3. `src/lib/ai/paper-mode-prompt.ts`
4. `src/lib/ai/paper-workflow-reminder.ts`
5. `src/lib/ai/paper-search-helpers.ts`
6. `src/lib/ai/paper-stages/index.ts`
7. `src/lib/ai/paper-stages/foundation.ts`
8. `src/lib/ai/paper-stages/core.ts`
9. `src/lib/ai/paper-stages/results.ts`
10. `src/lib/ai/paper-stages/finalization.ts`
11. `src/lib/ai/paper-stages/formatStageData.ts`

Data layer:

1. `convex/schema.ts`
2. `convex/systemPrompts.ts`
3. `convex/systemAlerts.ts`

Admin UI:

1. `src/components/admin/AdminContentSection.tsx`
2. `src/components/admin/SystemPromptsManager.tsx`
3. `src/components/admin/SystemPromptFormDialog.tsx`
4. `src/components/admin/VersionHistoryDialog.tsx`
5. `src/components/admin/SystemHealthPanel.tsx`
6. `src/components/admin/adminPanelConfig.ts`

