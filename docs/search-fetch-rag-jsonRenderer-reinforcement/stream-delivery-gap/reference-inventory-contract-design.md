# Reference Inventory Response Contract Design

Tanggal: 2026-03-25

## Goal

Mendefinisikan kontrak data permanen untuk kasus user yang meminta:

- link
- tautan
- PDF
- paper
- referensi tambahan
- daftar sumber

Tujuannya:

- body response dan panel `Rujukan` selalu sinkron
- sistem bisa membedakan `reference pointer` vs `claimable evidence`
- tidak ada lagi output misleading seperti `Link:` kosong
- aturan anti-fabrication tetap kuat

## Problem Statement

Bug yang sekarang terlihat di UI:

- assistant mengklaim menemukan beberapa sumber/PDF
- body response membuat daftar item dengan `Link:`
- sebagian atau seluruh `Link:` kosong
- panel `Rujukan` tetap menampilkan daftar sumber yang valid

Ini merusak trust karena:

- user melihat seolah model punya link final
- tetapi body response tidak benar-benar menyajikannya
- panel dan body memberi sinyal yang berbeda

## Evidence

### 1. Body dan panel memakai payload berbeda

Di compose finish path:

- `data-cited-text` dikirim dari `userFacingPayload.citedText`
- `data-cited-sources` dikirim dari `persistedSources`

Bukti:

- [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts#L735)
- [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts#L751)

### 2. UI body percaya backend text apa adanya

`MessageBubble` membaca:

- `data-cited-text`
- `data-cited-sources`

Tetapi body tetap dirender dari text backend, bukan dibangun ulang dari sources.

Bukti:

- [MessageBubble.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/MessageBubble.tsx#L322)
- [MessageBubble.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/MessageBubble.tsx#L334)
- [MessageBubble.search-status.test.tsx](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/components/chat/MessageBubble.search-status.test.tsx#L77)

### 3. Compose contract saat ini fokus ke synthesis, bukan inventory

Prompt compose mewajibkan:

- hanya memakai fakta dari `Page content (verified)`
- source unverified tidak boleh dipakai untuk klaim spesifik
- URL/title bukan evidence

Bukti:

- [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts#L65)
- [search-results-context.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/search-results-context.ts#L28)
- [SKILL.md](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/skills/web-search-quality/SKILL.md#L140)

Kesimpulan:

- kontrak sekarang cocok untuk `search synthesis response`
- kontrak sekarang tidak cukup untuk `reference inventory response`

## Current Contract

### A. Source contract yang masuk ke orchestrator

Retriever menghasilkan:

```ts
type NormalizedCitation = {
  url: string
  title: string
  startIndex?: number
  endIndex?: number
  citedText?: string
  publishedAt?: number
}
```

Bukti:

- [types.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/citations/types.ts#L11)

### B. Fetch enrichment contract

Fetch layer sebenarnya sudah tahu informasi penting:

```ts
type FetchedContent = {
  url: string
  resolvedUrl: string
  routeKind?: "html_standard" | "pdf_or_download" | "academic_wall_risk" | "proxy_or_redirect_like"
  title: string | null
  publishedAt: string | null
  documentKind: "html" | "pdf" | "unknown"
  failureReason?: "timeout" | "fetch_error" | "http_non_ok" | "pdf_unsupported" | "readability_empty" | "content_too_short" | "proxy_unresolved"
  pageContent: string | null
  fullContent: string | null
  fetchMethod: "fetch" | "tavily" | null
}
```

Bukti:

- [content-fetcher.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/content-fetcher.ts#L27)

### C. Compose source context

Model menerima source context sebagai string bebas:

- `title — url`
- `Snippet`
- `Page content (verified)` atau `[no page content — unverified source]`

Bukti:

- [search-results-context.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/search-results-context.ts#L23)

### D. User-facing payload contract

Saat ini user-facing payload untuk body hanya:

```ts
type UserFacingSearchPayload = {
  citedText: string
  internalThoughtText: string
}
```

Bukti:

- [internal-thought-separator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/internal-thought-separator.ts#L6)

### E. Streamed source payload contract

Saat ini source payload yang dipakai UI hanya:

```ts
type StreamedSource = {
  url: string
  title: string
  publishedAt?: number
  citedText?: string
}
```

Bukti:

- [orchestrator.ts](/Users/eriksupit/Desktop/makalahapp/.worktrees/chat-page-ux-design-enforcement/src/lib/ai/web-search/orchestrator.ts#L812)

## Structural Gap

### Gap 1 — Body response tidak punya source presentation contract

`data-cited-text` adalah text bebas dari model.

Akibatnya:

- model bisa membuat format inventaris sendiri
- model bisa menulis `Link:`
- model bisa lupa mengisi URL
- server tidak punya struktur untuk memvalidasi hasil itu

### Gap 2 — Source payload terlalu tipis

UI hanya menerima:

- `url`
- `title`
- `publishedAt`

Padahal backend sudah tahu:

- `documentKind`
- `routeKind`
- `fetchMethod`
- `failureReason`
- `pageContent` ada atau tidak

Akibatnya:

- UI tidak tahu mana source verified
- UI tidak tahu mana source cuma link candidate
- body response tidak bisa diarahkan oleh source state yang jelas

### Gap 3 — Tidak ada pemisahan antara `reference availability` dan `claimable evidence`

Saat ini sistem terlalu biner:

- source verified => aman untuk klaim
- source unverified => cuma “boleh dicatat ada”

Yang belum ada:

- URL tetap boleh ditampilkan sebagai pointer/reference walau konten belum verified
- tetapi fakta dari source itu tetap tidak boleh diklaim

### Gap 4 — Tidak ada response mode khusus

Semua hasil compose diperlakukan seperti synthesis biasa.

Padahal kebutuhan user bisa beda:

- `synthesis`: analisis isi
- `reference inventory`: daftar sumber/link/PDF
- `mixed`: daftar sumber + ringkasan singkat

## Required Permanent Contract

### 1. Source presentation contract tunggal

Tambahkan contract yang dipakai bersama oleh:

- compose layer
- body response
- panel `Rujukan`

Minimal:

```ts
type ReferencePresentationSource = {
  id: string
  url: string | null
  title: string
  publishedAt?: number | null
  documentKind: "html" | "pdf" | "unknown"
  routeKind?: "html_standard" | "pdf_or_download" | "academic_wall_risk" | "proxy_or_redirect_like"
  verificationStatus: "verified_content" | "unverified_link" | "unavailable"
  referenceAvailable: boolean
  claimable: boolean
  fetchMethod?: "fetch" | "tavily" | null
  failureReason?: string
}
```

### 2. Response mode contract

Compose layer harus menerima mode eksplisit:

```ts
type SearchResponseMode =
  | "synthesis"
  | "reference_inventory"
  | "mixed"
```

Rule:

- user minta `PDF/link/tautan/daftar sumber` => `reference_inventory`
- user minta analisis topik => `synthesis`
- user minta dua-duanya => `mixed`

### 3. Body contract untuk reference inventory

Body response tidak boleh lagi bergantung penuh pada freeform markdown.

Minimal contract:

```ts
type ReferenceInventoryItem = {
  sourceId: string
  title: string
  url: string | null
  verificationStatus: "verified_content" | "unverified_link"
  note?: string
}

type ReferenceInventoryPayload = {
  responseMode: "reference_inventory"
  introText: string
  items: ReferenceInventoryItem[]
}
```

### 4. Display rule

Aturan permanen yang wajib:

- `url` boleh ditampilkan kalau `referenceAvailable = true`
- factual claim hanya boleh jika `claimable = true`
- `Link:` atau `URL:` tidak boleh muncul jika `url === null`
- source `unverified_link` harus diberi label jujur
- source `unavailable` tidak boleh ditulis seolah berhasil ditemukan

## Invariants

Ini invariant yang harus dipenuhi sebelum branch semacam ini bisa ditutup.

1. Body dan panel membaca daftar source dari payload presentasi yang sama.
2. Tidak ada placeholder kosong seperti `Link:` tanpa URL.
3. Source bisa tampil sebagai reference pointer tanpa otomatis menjadi evidence.
4. Source unverified tidak boleh dipakai untuk klaim isi.
5. User yang meminta PDF/link harus menerima jawaban berbentuk inventaris, bukan synthesis biasa yang dipaksa.

## What Must Change

### A. Orchestrator

Harus berubah paling besar.

Tugas baru:

- build `ReferencePresentationSource[]`
- tentukan `responseMode`
- kirim contract yang sama ke body dan panel
- enforce invariant sebelum stream selesai

### B. Search results context / compose instructions

Harus dibedakan:

- aturan untuk factual synthesis
- aturan untuk reference inventory

Prompt harus eksplisit mengatakan:

- URL boleh ditampilkan sebagai pointer
- URL tidak sama dengan verified evidence
- ketika mode inventory, tugas model adalah menyusun daftar sumber dari payload yang ada

### C. UI

UI cukup mengikuti contract baru.

UI bukan akar masalah, tetapi tetap harus:

- render inventory dari payload terstruktur
- render panel dari source payload yang sama
- berhenti bergantung pada text bebas untuk daftar link

### D. Server-side guard

Tambahkan guard keras:

- reject atau rewrite payload kalau ada item inventory dengan `url = null` tetapi field link tetap muncul
- jangan biarkan `Link:` kosong lolos ke user

## Out of Scope

Dokumen ini tidak mendesain:

- ranking kualitas sumber
- scoring atau filtering pintar
- perubahan fetcher lebih lanjut
- UI visual redesign

Dokumen ini hanya mendesain kontrak data dan presentasi.

## Acceptance Criteria

Perubahan nanti dianggap benar kalau:

1. Untuk request `carikan PDF/link/referensi`, body response menampilkan URL nyata atau secara jujur menandai bahwa URL tidak tersedia.
2. Panel `Rujukan` dan body menunjukkan daftar source yang konsisten.
3. Tidak ada lagi `Link:` kosong di body.
4. Sistem tetap tidak membuat klaim isi dari source yang belum verified.
5. Runtime log dan UI menunjukkan bahwa source verified vs unverified bisa dibedakan jelas.

## Recommended Next Step

Langkah terbaik berikutnya:

1. desain detail payload baru di orchestrator
2. tentukan `responseMode` trigger dan contract compose
3. baru setelah itu implement perubahan code

Jangan mulai dari formatter. Formatter hanya safety net, bukan solusi inti.
