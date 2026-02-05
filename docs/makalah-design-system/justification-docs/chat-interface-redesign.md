# Guideline & Kontrol Teknis: Migrasi Chat Interface & Messages Redesign (Fase 2)

Dokumen ini adalah panduan teknis untuk memigrasikan **Chat Interface & Messages** (Area Percakapan) ke standar **Makalah-Carbon**. Ini adalah Fase 2 dari 3 fase redesain fitur Chat, fokus pada pengalaman dialog, pemrosesan input, dan presentasi pesan Markdown.

## 0. Target Migrasi
*   **Chat Core**: `src/app/chat/page.tsx`, `src/app/chat/[conversationId]/page.tsx`, `src/components/chat/ChatContainer.tsx`.
*   **Interaction Windows**: `src/components/chat/ChatWindow.tsx`, `src/components/chat/ChatInput.tsx`.
*   **Messaging Components**: `src/components/chat/MessageBubble.tsx`, `MarkdownRenderer.tsx`, `InlineCitationChip.tsx`.
*   **Tools & Actions**: `FileUploadButton.tsx`, `QuickActions.tsx`, `ChatMiniFooter.tsx`.

---

## 1. Spesifikasi Visual Utama (Core Specs)

> [!IMPORTANT]
> **Vibrant Silence**: Area percakapan harus bebas dari noise visual. Fokus utama adalah teks akademik. Penggunaan hybrid radius (16px/8px) dan pembersihan warna legacy akan menciptakan ruang diskusi yang jernih.

### 1.1 Messaging Aesthetics (The Bubble)
*Referensi: [shape-layout.md](../docs/shape-layout.md)*
*   **User Message**: 
    *   Radius: `.rounded-shell` (16px).
    *   Background: `bg-card` dengan border subtle (bukan `bg-user-message-bg` legacy).
    *   Alignment: Right (End) dengan padding Airy (16px).
*   **Assistant Message**: 
    *   Radius: None (Full width narrative flow).
    *   Background: Transparent.
    *   Spacing: Gap `32px` antar blok pesan.

### 1.2 Input Area (Technical Tooling)
*Referensi: [typografi.md](../docs/typografi.md)*
*   **Textarea Placeholder**: 
    *   Font: **Geist Mono**.
    *   Size: `xs/sm`.
*   **Send Button**: `.rounded-action` (8px) dengan `.hover-slash`.
*   **Attachment List**: Hairline borders antar file preview.

### 1.3 Tipografi & Sitasi
*   **Narrative Text**: 
    *   Font: **Geist Sans** (`text-narrative`).
    *   Line-height: `relaxed`.
*   **Citations (Sidenotes)**:
    *   Font: **Geist Mono** (Tabular).
    *   Style: `.text-brand` level tinggi (Amber).

---

## 2. Tabel Pemetaan Teknis (Audit Mapping)

| Elemen UI | Class Legacy (Audit) | Target Class (Carbon) | Aspek yang Dimigrasi | Justifikasi Teknis |
| :--- | :--- | :--- | :--- | :--- |
| **User Bubble BG** | `bg-user-message-bg` | `.bg-card .border-main` | Color & Border | Migrasi ke Carbon Surface level. |
| **Bubble Radius** | `rounded-lg` | `.rounded-shell` | Shape | Shell Radius (16px) untuk User. |
| **Chat Input BG** | `bg-chat-input` | `.bg-background` | Color | Minimalist entry point. |
| **Input Focus** | `ring-amber-500` | `.ring-2 .ring-brand` | State | Penyelarasan brand ring. |
| **Citation Chip** | Ad-hoc styles | `.rounded-badge .text-signal` | Component | Presisi sitasi data. |
| **Quick Actions** | `hover:bg-accent` | `.rounded-action .hover-slash-subtle`| Interaction | Consistency of action pattern. |

---

## 3. Protokol Migrasi Detail (Step-by-Step)

### Step 1: Bubble & Gravity Polish
*   **Aksi**: 
    1. Ganti `bg-user-message-bg` di `MessageBubble.tsx` dengan `bg-card`.
    2. Terapkan `.border-hairline` atau border 1px neutral.
    3. Pastikan radius User Message adalah 16px (Shell) untuk memberikan kesan "kontainer instruksi".

### Step 2: Markdown & Citation Precision
*   **Aksi**:
    1. Update `MarkdownRenderer.tsx` agar headings (`h1-h4`) dan list items memiliki vertical rhythm yang presisi (skala 4px).
    2. Pastikan `InlineCitationChip.tsx` menggunakan **Geist Mono** untuk nomor sumber.

### Step 3: Chat Input Re-tooling
*   **Aksi**:
    1. Bersihin `ChatInput.tsx` dari border tebal.
    2. Placeholder teks input wajib pake **Geist Mono** biar kerasa teknis.
    3. Tambah efek `.hover-slash` pada tombol Kirim.

### Step 4: Quick Actions & Navigation
*   **Aksi**:
    1. Tombol copy/edit/retry di bawah pesan asisten harus menggunakan `.rounded-action` (8px).
    2. Pakai **Iconoir** 1.5px untuk semua action icons.

---

## 4. Checklist Verifikasi (Review & Audit)

- [ ] **Bubble Audit**: User message menggunakan 16px radius, Assistant message tanpa border (narrative style).
- [ ] **Typo Audit**: Isi paper/chat menggunakan Geist Sans, elemen kontrol/sitasi menggunakan Geist Mono.
- [ ] **Color Audit**: Warna legacy `bg-user-message-bg` sudah dihapus total.
- [ ] **Interaction Audit**: Tombol kirim dan quick actions memiliki interaksi Carbon (Slash/Subtle).
- [ ] **Spacing Audit**: Padding antar gelembung pesan menjaga sirkulasi "Mechanical Breath".

---
> [!IMPORTANT]
> **Mechanical Grace Logic**: Interface chat adalah inti dari kolaborasi manusia-AI. Dengan meminimalkan dekorasi berlebih dan menguatkan tipografi naratif vs teknis, kita membantu user tetap fokus pada substansi pemikiran paper mereka.
