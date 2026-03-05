# Artifact Context Injection

## Status: PLANNED (belum diimplementasi)

Dokumen ini adalah context awal untuk fitur "Artifact Context Injection" — kemampuan meng-inject artifact dari paper session manapun sebagai context ke chat input percakapan aktif.

## Prerequisite

Fitur ini **bergantung** pada branch `feat/artifact-reinforcement` yang mengimplementasi:
1. Sidebar all-sessions — semua paper session user ditampilkan di sidebar "Sesi Paper"
2. Read-only cross-conversation artifact preview — bisa preview artifact dari session lain tanpa pindah conversation

Pastikan kedua fitur di atas sudah merged sebelum memulai branch ini.

## Konsep

### Problem

Saat ini, artifact hanya bisa diakses dalam konteks conversation tempat ia dibuat. User tidak bisa memanfaatkan artifact dari paper session lain sebagai referensi/context di percakapan baru. Ini membatasi reusability hasil kerja sebelumnya.

### Solution

User bisa meng-inject artifact content dari paper session manapun ke chat input sebagai context. AI akan menerima artifact tersebut sebagai bagian dari prompt tanpa artifact itu menjadi bagian permanen dari conversation history.

### User Flow

1. User berada di percakapan aktif (bisa chat biasa atau paper session lain)
2. Di sidebar "Sesi Paper", user expand paper session folder manapun
3. User **klik kanan** pada artifact item di list
4. Muncul context menu dengan opsi:
   - **"Lihat Artifak"** — buka read-only preview (sudah diimplementasi di prerequisite)
   - **"Masukkan ke Konteks"** — inject artifact ke chat input
5. Artifact muncul sebagai chip/badge di area "+ Konteks" pada chat input
6. User mengetik pesan dan kirim
7. AI menerima artifact content sebagai tambahan context di prompt
8. Artifact context **tidak disimpan** ke conversation history — hanya berlaku untuk pesan itu saja (ephemeral)

## Prinsip Desain

### 1. Ephemeral Context, Bukan Persistent Attachment

Artifact yang di-inject adalah **one-shot context**. Setelah pesan terkirim, artifact context tidak lagi melekat di conversation. Ini berbeda dari file attachment yang tersimpan permanen.

Alasan: Mencegah context window bloat dan menjaga conversation history tetap bersih.

### 2. Read-Only Reference

Artifact yang di-inject adalah **snapshot read-only** dari versi terbaru saat di-inject. Jika artifact di-update setelah inject, context yang sudah terkirim tidak berubah.

### 3. Explicit User Action Only

AI **tidak boleh** otomatis menarik artifact dari session lain. Hanya user yang bisa memilih artifact mana yang masuk context. Ini mencegah unexpected token usage dan menjaga user control.

### 4. Visible Before Send

User harus bisa melihat artifact apa saja yang ter-attach sebelum mengirim pesan. Chip/badge di area chat input harus menunjukkan: nama artifact, versi, dan asal session. User bisa remove sebelum kirim.

### 5. Token Budget Awareness

Artifact content bisa besar. Sistem harus:
- Menunjukkan estimasi token cost dari artifact yang di-inject
- Warn jika total context mendekati limit
- Bisa truncate/summarize jika terlalu besar (optional, bisa di-scope out)

## Arsitektur Teknis (High-Level)

### Frontend Components yang Perlu Diubah/Dibuat

| Component | Perubahan |
|-----------|-----------|
| `SidebarPaperSessions.tsx` | Tambah context menu (right-click) pada `ArtifactTreeItem` |
| `ChatInput.tsx` (atau equivalent) | Area "+ Konteks" untuk display attached artifacts sebagai chips |
| `ArtifactContextChip.tsx` (baru) | Chip component: artifact name, version, session origin, remove button |
| `ChatContainer.tsx` | State management untuk injected artifacts |

### Data Flow

```
User right-click artifact → Context menu "Masukkan ke Konteks"
→ Fetch artifact content (api.artifacts.get)
→ Store di local state (tidak Convex, ephemeral)
→ Display sebagai chip di chat input area
→ User kirim pesan
→ Chat transport meng-include artifact content di request body
→ API route /api/chat meng-inject ke prompt sebagai system/user message tambahan
→ AI menerima sebagai context
→ Setelah response, artifact context di-clear dari local state
```

### API Route Changes (`src/app/api/chat/route.ts`)

Request body perlu field baru:
```typescript
interface ChatRequestBody {
  // ... existing fields
  artifactContext?: Array<{
    artifactId: string
    title: string
    content: string
    version: number
    sourceSessionTitle?: string
  }>
}
```

Artifact context di-inject ke prompt sebagai tambahan context message sebelum user message, misalnya:

```
[System/User context message]
--- ARTIFACT REFERENCE ---
Title: {title} (v{version})
From: {sourceSessionTitle}
---
{content}
--- END ARTIFACT REFERENCE ---
```

### Billing Consideration

Artifact content menambah input tokens. Perlu dipertimbangkan:
- Apakah token dari artifact context dihitung sebagai `chat_message` atau operasi terpisah?
- Rekomendasi: tetap `chat_message` karena artifact context hanya memperkaya pesan, bukan operasi baru

### Security & Permission

- User hanya bisa inject artifact miliknya sendiri (enforced by existing `userId` check di `api.artifacts.get`)
- Artifact content dikirim dari client ke server — sama seperti file content yang sudah ada
- Tidak ada cross-user artifact sharing dalam scope ini

## Key Files Reference

### Existing (baca untuk context)

- `src/components/chat/sidebar/SidebarPaperSessions.tsx` — sidebar paper session list + artifact tree
- `src/components/chat/ChatContainer.tsx` — orchestrator chat state
- `src/components/chat/ChatWindow.tsx` — chat messages + input
- `src/app/api/chat/route.ts` — chat streaming endpoint
- `src/lib/ai/chat-config.ts` — prompt construction
- `convex/artifacts.ts` — artifact queries/mutations
- `src/lib/hooks/useArtifactTabs.ts` — tab state management

### Chat Input Area

- Cari component yang render area "+ Konteks" dan "Kirim percakapan..." input
- Kemungkinan di `ChatWindow.tsx` atau sub-component dedicated
- Area "+ Konteks" sudah ada untuk file context — artifact injection bisa pakai pattern yang sama

## Scope Boundaries

### In Scope
- Context menu pada artifact items di sidebar
- Artifact content injection ke chat input
- Ephemeral context chips di input area
- API route support untuk artifact context di prompt
- Basic token estimation display

### Out of Scope (untuk iterasi berikutnya)
- Drag-and-drop artifact ke chat input
- Auto-summarization untuk artifact besar
- Multiple artifact injection sekaligus (bisa dibatasi 1 dulu)
- Artifact context history/log
- Cross-user artifact sharing

## Acceptance Criteria

1. User bisa klik kanan artifact di sidebar → muncul context menu
2. "Masukkan ke Konteks" menambahkan chip di area chat input
3. Chip menunjukkan nama artifact, versi, dan bisa di-remove
4. Pesan terkirim dengan artifact content sebagai tambahan context
5. AI merespons dengan awareness terhadap artifact content
6. Setelah pesan terkirim, chip ter-clear (ephemeral)
7. Tidak ada perubahan pada conversation history (artifact context tidak tersimpan sebagai message)
