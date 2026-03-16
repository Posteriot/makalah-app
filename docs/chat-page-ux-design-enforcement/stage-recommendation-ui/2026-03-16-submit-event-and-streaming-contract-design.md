# Submit Event And Streaming Contract Design

Dokumen ini menurunkan konteks stage recommendation UI di chat page menjadi desain kontrak runtime yang konkret untuk dua area:

1. kontrak `message part streaming` dari assistant ke frontend
2. kontrak `submit event` dari interaction block user ke aplikasi

Dokumen ini belum menulis detail implementasi file per file. Fokusnya adalah kontrak data dan lifecycle agar custom renderer fase awal tetap selaras dengan arsitektur chat Makalah App yang sudah ada.

Dokumen konteks sebelumnya:

- `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/README.md`

## Ringkasan

Makalah App sudah memakai `UIMessage.parts` dan `createUIMessageStream` untuk mengirim part kustom seperti `data-search`, `data-cited-text`, dan reasoning trace. Karena itu, recommendation UI untuk paper workflow paling tepat dikirim sebagai `data-* part` baru di dalam stream assistant, bukan sebagai response channel terpisah.

Saat user berinteraksi dengan recommendation block, frontend tidak boleh langsung mengubah `paperSessions`. Frontend harus mengirim `submit event` terstruktur ke aplikasi, lalu aplikasi yang memutuskan bagaimana event itu diterjemahkan menjadi message user sintetis, tool call, atau mutation backend berikutnya.

Pendekatan ini menjaga 4 hal:

- shell chat tetap deterministik
- interactive recommendation block hidup sebagai extension dari lifecycle message yang sudah ada
- user selection tetap eksplisit dan bisa diaudit
- backend tetap memegang otoritas final untuk persistence

## Tujuan Desain

### Tujuan utama

- menambahkan recommendation block per stage paper tanpa memecah kontrak stream chat yang sudah berjalan
- membuat submit user dari UI block menjadi input terstruktur yang aman
- menjaga kompatibilitas dengan `useChat`, `UIMessage.parts`, dan `MessageBubble`

### Tujuan kompatibilitas

- tidak mengganti kontrak dasar `POST /api/chat`
- tidak mengganggu `tool-*` part, `data-search`, `data-cited-text`, dan `data-cited-sources`
- tidak mengubah approval final existing secara destruktif

## Observasi Runtime Yang Sudah Ada

Chat page saat ini sudah punya fondasi yang cocok:

- backend memakai `createUIMessageStream` untuk menulis part kustom ke stream
- assistant stream sudah menulis `data-search` di response helper khusus
- stream utama meneruskan part AI SDK dan part reasoning tambahan
- frontend `MessageBubble` sudah mengekstrak `data-*` part dari `message.parts`

Implikasinya:

- recommendation block sebaiknya mengikuti pola `data-*`
- renderer frontend sebaiknya membaca part dari `message.parts`, bukan dari text parsing
- event user sebaiknya diperlakukan sebagai request UI chat biasa, bukan jalur RPC baru yang terpisah

## Keputusan Desain

### 1. Recommendation block dikirim sebagai `data-stage-recommendation`

Assistant akan mengirim recommendation block sebagai part kustom baru:

```ts
type StageRecommendationDataPart = {
  type: "data-stage-recommendation"
  id: string
  data: StageRecommendationPayload
}
```

Alasan:

- konsisten dengan pola `data-search` dan `data-cited-text`
- mudah dirender di `MessageBubble`
- tidak mengganggu tool state yang sudah ada

### 2. Submit user dikirim sebagai event terstruktur lewat request chat

Frontend tidak langsung memutasi backend. Frontend mengirim event submit sebagai payload tambahan ke endpoint chat, lalu backend menerjemahkannya menjadi konteks untuk model dan persistence yang sesuai.

Alasan:

- tetap satu jalur masuk utama: `POST /api/chat`
- event interaksi menjadi bagian dari lifecycle percakapan
- audit trail user tetap berada di conversation

### 3. Recommendation block tidak sama dengan approval final

Recommendation block dipakai untuk memilih arah, opsi, atau preferensi pada stage aktif. Approval final stage tetap domain alur validasi existing.

Alasan:

- approval final sudah punya lifecycle dan UI sendiri
- memilih opsi rekomendasi tidak selalu berarti stage siap di-approve

## Kontrak Payload Recommendation Block

Payload yang dikirim di `data-stage-recommendation`:

```ts
type StageRecommendationPayload = {
  version: 1
  stage:
    | "gagasan"
    | "topik"
    | "outline"
    | "abstrak"
    | "pendahuluan"
    | "tinjauan_literatur"
    | "metodologi"
    | "hasil"
    | "diskusi"
    | "kesimpulan"
    | "pembaruan_abstrak"
    | "daftar_pustaka"
    | "lampiran"
    | "judul"
  kind:
    | "single-select"
    | "multi-select"
    | "ranked-select"
    | "action-list"
  title: string
  prompt: string
  helperText?: string
  required: boolean
  selection: {
    min: number
    max: number
  }
  options: Array<{
    id: string
    label: string
    summary?: string
    rationale?: string
    recommended?: boolean
    metadata?: Record<string, string | number | boolean | string[]>
    followupInput?: {
      type: "text"
      label: string
      placeholder?: string
      required?: boolean
    }
  }>
  recommendedOptionIds: string[]
  recommendedReason: string
  allowCustomInput: boolean
  customInput?: {
    label: string
    placeholder?: string
  }
  primaryAction: {
    id: "submit_recommendation"
    label: string
  }
  secondaryAction?: {
    id: "continue_typing" | "ask_regenerate" | "skip_for_now"
    label: string
  }
}
```

## Aturan Validasi Payload Recommendation

- `version` wajib `1`
- `stage` wajib sama dengan stage paper aktif
- `recommendedOptionIds` tidak boleh kosong
- semua `recommendedOptionIds` harus ada di `options`
- `recommendedReason` wajib bila ada recommendation block
- `selection.max` tidak boleh melebihi jumlah opsi
- `selection.min` tidak boleh negatif
- `options` tidak boleh kosong
- `judul` wajib punya tepat 5 opsi
- `hasil` wajib memuat format yang dikenali aplikasi

## Kontrak Submit Event Dari Frontend

Frontend mengirim event pilihan user dalam request chat berikutnya sebagai payload tambahan.

```ts
type StageRecommendationSubmitEvent = {
  type: "paper.stage_recommendation.submit"
  version: 1
  conversationId: string
  stage: StageRecommendationPayload["stage"]
  sourceMessageId: string
  recommendationPartId: string
  kind: StageRecommendationPayload["kind"]
  selectedOptionIds: string[]
  rankedOptionIds?: string[]
  customText?: string
  optionFollowupInputs?: Record<string, string>
  submittedAt: number
}
```

## Aturan Validasi Submit Event

- `conversationId` wajib cocok dengan conversation aktif
- `stage` wajib cocok dengan stage paper aktif saat submit
- `sourceMessageId` wajib menunjuk assistant message yang mengandung block
- `recommendationPartId` wajib cocok dengan part yang dirender
- `selectedOptionIds` wajib memenuhi batas `selection.min/max`
- `rankedOptionIds` hanya valid untuk `ranked-select`
- `customText` opsional, tapi harus dihormati jika user isi

## Perubahan Kontrak Request `POST /api/chat`

Request body chat diperluas secara additive:

```ts
type ChatRequestBodyExtension = {
  interactionEvent?: StageRecommendationSubmitEvent
}
```

Aturan:

- field ini opsional
- request chat biasa tetap valid tanpa field ini
- kalau `interactionEvent` ada, backend harus memprioritaskan pembacaan event ini sebagai konteks user terbaru

## Bentuk Message User Sintetis

Supaya audit trail percakapan tetap mudah dibaca, aplikasi perlu membentuk representasi teks user sintetis saat submit terjadi.

Contoh:

```txt
[Stage Recommendation: outline]
Pilihan: Outline #2
Catatan user: Bab metodologi tolong dipadatkan.
```

Prinsip:

- teks sintetis untuk audit trail, bukan sumber kebenaran utama
- sumber kebenaran tetap `interactionEvent`
- format teks tidak dipakai untuk parsing keputusan

## Lifecycle Streaming Assistant

### Pola minimum

Assistant bisa mengirim:

1. `text-*` part biasa
2. `data-stage-recommendation`
3. `finish`

Atau kombinasi:

1. intro text singkat
2. `data-stage-recommendation`
3. penjelasan tambahan text
4. `finish`

### Contoh urutan stream

```ts
writer.write({ type: "start", messageId })
writer.write({ type: "text-start", id: textId })
writer.write({ type: "text-delta", id: textId, delta: "Saya menyiapkan 3 opsi outline." })
writer.write({ type: "text-end", id: textId })
writer.write({
  type: "data-stage-recommendation",
  id: recommendationId,
  data: payload,
})
writer.write({ type: "finish" })
```

### Keputusan penting

- `data-stage-recommendation` cukup dikirim sebagai snapshot final per block
- belum perlu patch/partial delta untuk rekomendasi tahap awal
- satu assistant message idealnya hanya punya satu recommendation block aktif

Alasan:

- lebih mudah dirender
- lebih mudah diuji
- cukup untuk kebutuhan workflow saat ini

## Lifecycle Submit User

### 1. Frontend render block

`MessageBubble` membaca `data-stage-recommendation` dari `message.parts` dan me-render recommendation UI.

### 2. User memilih opsi

Frontend menyimpan state lokal:

- opsi terpilih
- urutan ranking jika ada
- custom text jika ada

### 3. User tekan submit

Frontend mengirim request chat baru dengan:

- `interactionEvent`
- optional teks sintetis atau teks kosong

### 4. Backend validasi event

Backend memeriksa:

- ownership conversation
- kecocokan stage aktif
- kecocokan source message dan part ID
- jumlah pilihan valid

### 5. Backend persist user message

Backend menyimpan representasi user action ke tabel `messages`, supaya percakapan tetap lengkap.

### 6. Backend lanjutkan turn AI

Model menerima konteks bahwa user telah memilih opsi tertentu. Dari sini model bisa:

- menindaklanjuti pilihan
- memperbaiki draft
- menyiapkan block rekomendasi berikutnya
- atau menyimpan progres via tool yang sesuai

## Perilaku Frontend Yang Direkomendasikan

### Di `MessageBubble`

Tambahkan extractor baru:

```ts
extractStageRecommendation(message): StageRecommendationPayload | null
```

Lalu render komponen khusus, misalnya:

- `StageRecommendationCard`
- `StageRecommendationOptionList`
- `StageRecommendationSubmitBar`

### Disable state

Setelah event submit sukses:

- block yang sama harus menjadi read-only
- pilihan user tetap terlihat
- jangan izinkan submit ganda dari block yang sama

### Fallback

Kalau block invalid:

- jangan render interaktif
- tampilkan text fallback dari assistant
- log ke telemetry frontend bila perlu

## Perilaku Backend Yang Direkomendasikan

### 1. Event translation layer

Backend butuh lapisan translasi event:

- dari `interactionEvent`
- ke `normalized interaction context`
- lalu ke `system/user message context` untuk model

### 2. Jangan langsung mutasi stage data

Submit recommendation tidak otomatis berarti `updateStageData`.

Alasan:

- beberapa pilihan masih butuh elaborasi lanjutan
- beberapa stage butuh diskusi tambahan sebelum save
- approval final tetap langkah terpisah

### 3. Simpan event sebagai konteks eksplisit

Backend sebaiknya menyimpan event yang sudah tervalidasi ke dalam message metadata atau annotation supaya:

- bisa diaudit
- tidak perlu parsing teks sintetis
- bisa dipakai ulang jika conversation dimuat ulang

## Kontrak Metadata Persist Yang Direkomendasikan

User message hasil submit event dapat dipersist dengan metadata seperti:

```ts
type PersistedInteractionMetadata = {
  type: "paper_stage_recommendation"
  stage: string
  sourceMessageId: string
  recommendationPartId: string
  selectedOptionIds: string[]
  rankedOptionIds?: string[]
  customText?: string
}
```

Ini additive terhadap message model yang ada.

## Batasan Desain Tahap Ini

### Belum mendesain patch streaming recommendation

Tahap awal tidak perlu recommendation block incremental. Snapshot final per turn sudah cukup.

### Belum mendesain persistence block assistant di Convex

Dokumen ini hanya menetapkan part stream dan event submit. Persist full recommendation payload ke database bisa dipertimbangkan nanti jika dibutuhkan untuk reload fidelity yang lebih tinggi.

### Belum mengganti approval panel existing

Approval final stage tetap pakai alur existing sampai ada desain lanjutan yang menyatukan keduanya secara aman.

## Rekomendasi Implementasi Bertahap

### Fase 1

- tambahkan `data-stage-recommendation` ke stream assistant
- render block read-only dulu di frontend

### Fase 2

- tambahkan submit interaktif dari frontend
- backend menerima `interactionEvent`
- simpan event ke message metadata

### Fase 3

- hubungkan event dengan logic paper workflow per stage
- tambahkan disable/read-only state untuk block yang sudah dipakai

### Fase 4

- evaluasi apakah renderer internal perlu diperluas atau sudah cukup

## File Terkait

- `src/app/api/chat/route.ts`
- `src/components/chat/MessageBubble.tsx`
- `src/components/chat/ChatWindow.tsx`
- `src/lib/ai/paper-tools.ts`
- `src/components/paper/PaperValidationPanel.tsx`
- `docs/chat-page/chat-contracts-and-data-model.md`
- `docs/chat-page-ux-design-enforcement/stage-recommendation-ui/README.md`

## Status Dokumen

- Status: design baseline
- Fungsi: kontrak runtime untuk fase implementasi berikutnya
- Belum mencakup: mapping field recommendation per stage ke persistence backend, detail komponen renderer, dan rollout task list implementasi
