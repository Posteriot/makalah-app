# Token Mapping V1 (Chat Page)

Dokumen ini menetapkan mapping token v1 untuk standarisasi styling halaman chat, dengan baseline visual 100% mengikuti kondisi frontend saat ini.

## 1. Scope

- Hanya untuk UI yang dipakai route chat:
- `src/app/chat/*`
- `src/components/chat/*`
- `src/components/paper/*` yang dirender di chat flow
- `src/components/refrasa/*` yang dipakai artifact workspace chat

Dokumen ini tidak mengubah kode langsung. Tujuannya sebagai kontrak implementasi sebelum migrasi file per file.

## 2. Baseline Faktual (Hasil Inventaris)

Ringkasan hasil scan hardcoded style pada scope chat:

- Total kemunculan `dark:`: `218`
- Total kemunculan hardcoded color class (slate/amber/emerald/rose/sky/green/red): `242`
- Total file UI ber-styling pada scope chat: `44`
- File yang sudah tercantum eksplisit di mapping v1 awal: `25`
- Gap awal (belum tercantum eksplisit): `19`
- Warna dominan saat ini:
- `text-slate-100` (54)
- `border-slate-700/70` (36)
- `text-slate-600` (35)
- `text-slate-400` (31)
- `border-slate-300/80` (28)
- `text-slate-900` (24)
- `bg-slate-200/80` (22)
- `bg-slate-900/70` (20)

File dengan densitas hardcoded tertinggi:

| File | Indikasi Kepadatan |
|---|---|
| `src/components/chat/FullsizeArtifactModal.tsx` | 39 |
| `src/components/chat/ArtifactToolbar.tsx` | 20 |
| `src/components/chat/ArtifactTabs.tsx` | 17 |
| `src/components/refrasa/RefrasaToolbar.tsx` | 14 |
| `src/components/refrasa/RefrasaTabContent.tsx` | 13 |
| `src/components/chat/ArtifactViewer.tsx` | 13 |
| `src/components/chat/sidebar/SidebarProgress.tsx` | 11 |

### 2.1 Gap Coverage (Sudah Ditutup di Dokumen Ini)

Berikut file yang semula belum tercantum eksplisit, lalu diklasifikasikan:

| File | Status | Keputusan |
|---|---|---|
| `src/components/chat/ArtifactEditor.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/ArtifactIndicator.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/ArtifactList.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/ChatProcessStatusBar.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/MarkdownRenderer.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/layout/PanelResizer.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/paper/PaperSessionBadge.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/paper/PaperStageProgress.tsx` | Hardcoded | Masuk migrasi v1 |
| `src/components/chat/QuickActions.tsx` | Hardcoded | Masuk migrasi v1 |
| `src/components/chat/sidebar/SidebarChatHistory.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/messages/TemplateGrid.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/ThinkingIndicator.tsx` | Hardcoded + `dark:` | Masuk migrasi v1 |
| `src/components/chat/VersionHistoryDialog.tsx` | `dark:` | Masuk migrasi v1 |
| `src/components/chat/ChartRenderer.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |
| `src/components/chat/ChatMiniFooter.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |
| `src/components/chat/FileUploadButton.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |
| `src/components/chat/MermaidRenderer.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |
| `src/components/refrasa/RefrasaButton.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |
| `src/app/chat/layout.tsx` | Tanpa hardcoded + tanpa `dark:` | Monitor-only (sudah token-friendly) |

## 3. Aturan Mapping V1

- Prefix token wajib: `--ds-*`
- Komponen hanya memakai semantic token (bukan `--ds-ref-*`)
- Semua value dark/light dikelola di token (`:root` dan `.dark`)
- Setelah file dimigrasi, file itu tidak boleh menyisakan hardcoded color dan `dark:` untuk warna/border/shadow
- DQ-01 (LOCKED): untuk intent core lintas halaman (`surface-*`, `text-*`, `border-*`), canonical neutral family adalah `slate` melalui semantic token core `--ds-*`
- `stone` tidak dipakai pada token core; jika dibutuhkan untuk visual showcase/ilustratif, wajib lewat semantic token showcase terpisah, bukan hardcoded class

## 4. Semantic Token Dictionary V1

Nilai berikut adalah nilai awal untuk menjaga baseline visual saat ini.

| Token | Light (baseline) | Dark (baseline) | Kegunaan |
|---|---|---|---|
| `--ds-surface-base` | `#ffffff` | `#0f172a` | Main content chat |
| `--ds-surface-subtle` | `#f8fafc` | `#0f172a` | Input/editor surface ringan |
| `--ds-surface-panel` | `#f1f5f9` | `#1e293b` | Sidebar/panel artifact |
| `--ds-surface-panel-alt` | `#e2e8f0` | `#1e293b` | Activity bar / sidebar alt |
| `--ds-surface-elevated` | `rgba(226,232,240,0.8)` | `rgba(15,23,42,0.7)` | Badge/chip surface |
| `--ds-overlay-backdrop` | `rgba(15,23,42,0.55)` | `rgba(2,6,23,0.7)` | Modal backdrop |
| `--ds-text-primary` | `#0f172a` | `#f1f5f9` | Judul dan konten utama |
| `--ds-text-secondary` | `#334155` | `#cbd5e1` | Metadata/secondary text |
| `--ds-text-muted` | `#475569` | `#94a3b8` | Label kecil/muted |
| `--ds-text-disabled` | `#94a3b8` | `#64748b` | Disabled state |
| `--ds-border-subtle` | `rgba(148,163,184,0.35)` | `rgba(51,65,85,0.7)` | Border default |
| `--ds-border-strong` | `rgba(71,85,105,0.6)` | `rgba(51,65,85,0.9)` | Border aksi/kontras |
| `--ds-border-hairline` | `rgba(148,163,184,0.45)` | `rgba(51,65,85,0.8)` | Divider tipis |
| `--ds-focus-ring` | `rgba(148,163,184,0.5)` | `rgba(148,163,184,0.5)` | Focus visible |
| `--ds-state-warning-bg` | `rgba(245,158,11,0.10)` | `rgba(245,158,11,0.20)` | Warning surface |
| `--ds-state-warning-fg` | `#b45309` | `#fcd34d` | Warning text |
| `--ds-state-warning-border` | `rgba(245,158,11,0.35)` | `rgba(245,158,11,0.50)` | Warning border |
| `--ds-state-success-bg` | `rgba(16,185,129,0.15)` | `rgba(16,185,129,0.20)` | Success surface |
| `--ds-state-success-fg` | `#047857` | `#6ee7b7` | Success text |
| `--ds-state-success-border` | `rgba(16,185,129,0.35)` | `rgba(16,185,129,0.50)` | Success border |
| `--ds-state-danger-bg` | `rgba(244,63,94,0.10)` | `rgba(244,63,94,0.15)` | Error surface |
| `--ds-state-danger-fg` | `#e11d48` | `#fb7185` | Error text |
| `--ds-state-danger-border` | `rgba(244,63,94,0.30)` | `rgba(244,63,94,0.40)` | Error border |
| `--ds-state-info-bg` | `rgba(14,165,233,0.15)` | `rgba(14,165,233,0.20)` | Info surface |
| `--ds-state-info-fg` | `#0369a1` | `#7dd3fc` | Info text |
| `--ds-state-info-border` | `rgba(14,165,233,0.35)` | `rgba(14,165,233,0.45)` | Info border |

### 4.1 Token Showcase (Reserved, Opsional)

Token ini bukan bagian token core chat, tapi disiapkan untuk parity lintas halaman saat komponen showcase/ilustratif dimigrasi.

- `--ds-showcase-surface-*`
- `--ds-showcase-text-*`
- `--ds-showcase-border-*`

## 5. Mapping Class Hardcoded -> Semantic Token

Mapping berikut dipakai sebagai pola implementasi di komponen.

| Hardcoded Saat Ini | Target Token Class |
|---|---|
| `bg-white` + `dark:bg-slate-900` | `bg-[var(--ds-surface-base)]` |
| `bg-slate-50` + `dark:bg-slate-900` | `bg-[var(--ds-surface-subtle)]` |
| `bg-slate-100` + `dark:bg-slate-800` | `bg-[var(--ds-surface-panel)]` |
| `bg-slate-200` + `dark:bg-slate-800` | `bg-[var(--ds-surface-panel-alt)]` |
| `bg-slate-200/80` + `dark:bg-slate-900/70` | `bg-[var(--ds-surface-elevated)]` |
| `text-slate-900` + `dark:text-slate-100` | `text-[var(--ds-text-primary)]` |
| `text-slate-700` + `dark:text-slate-300` | `text-[var(--ds-text-secondary)]` |
| `text-slate-600` + `dark:text-slate-400` | `text-[var(--ds-text-muted)]` |
| `text-slate-400` + `dark:text-slate-600` | `text-[var(--ds-text-disabled)]` |
| `border-slate-300/80` + `dark:border-slate-700/70` | `border-[color:var(--ds-border-subtle)]` |
| `border-slate-500/60` + `dark:border-slate-700` | `border-[color:var(--ds-border-strong)]` |
| `bg-amber-500/10` + `text-amber-700` + `dark:text-amber-300` | `bg-[var(--ds-state-warning-bg)] text-[var(--ds-state-warning-fg)]` |
| `border-amber-500/35` + `dark:border-amber-500/50` | `border-[color:var(--ds-state-warning-border)]` |
| `bg-emerald-500/15` + `text-emerald-700` + `dark:text-emerald-300` | `bg-[var(--ds-state-success-bg)] text-[var(--ds-state-success-fg)]` |
| `border-emerald-500/35` | `border-[color:var(--ds-state-success-border)]` |
| `bg-rose-500/10` + `text-rose-600` + `dark:text-rose-400` | `bg-[var(--ds-state-danger-bg)] text-[var(--ds-state-danger-fg)]` |
| `border-rose-500/30` | `border-[color:var(--ds-state-danger-border)]` |
| `bg-sky-500/15` + `text-sky-600` + `dark:text-sky-400` | `bg-[var(--ds-state-info-bg)] text-[var(--ds-state-info-fg)]` |
| `border-sky-500/35` | `border-[color:var(--ds-state-info-border)]` |
| `bg-slate-900/55` + `dark:bg-slate-950/70` | `bg-[var(--ds-overlay-backdrop)]` |

## 6. Prioritas Migrasi V1 (Dokumen -> Implementasi)

Prioritas ini dipakai saat mulai eksekusi migrasi kode.

| Wave | Fokus | File Utama |
|---|---|---|
| W1 (P0) | Shell + entry interaction | `ChatLayout.tsx`, `TopBar.tsx`, `ActivityBar.tsx`, `ChatSidebar.tsx`, `ChatWindow.tsx`, `ChatInput.tsx`, `MessageBubble.tsx`, `PanelResizer.tsx`, `SidebarChatHistory.tsx`, `TemplateGrid.tsx`, `ChatProcessStatusBar.tsx`, `ThinkingIndicator.tsx`, `QuickActions.tsx` |
| W2 (P0) | Artifact workspace utama | `ArtifactPanel.tsx`, `ArtifactTabs.tsx`, `ArtifactToolbar.tsx`, `ArtifactViewer.tsx`, `FullsizeArtifactModal.tsx`, `ArtifactEditor.tsx`, `ArtifactIndicator.tsx`, `ArtifactList.tsx`, `MarkdownRenderer.tsx` |
| W3 (P1) | Paper/rewind UI pada chat | `SidebarProgress.tsx`, `SidebarPaperSessions.tsx`, `PaperValidationPanel.tsx`, `RewindConfirmationDialog.tsx`, `PaperSessionBadge.tsx`, `PaperStageProgress.tsx`, `VersionHistoryDialog.tsx` |
| W4 (P1) | Refrasa integration UI | `RefrasaToolbar.tsx`, `RefrasaTabContent.tsx`, `RefrasaIssueItem.tsx`, `RefrasaLoadingIndicator.tsx` |
| W5 (P2) | Indikator pendukung | `ToolStateIndicator.tsx`, `SearchStatusIndicator.tsx`, `SourcesIndicator.tsx`, `QuotaWarningBanner.tsx`, `InlineCitationChip.tsx` |
| W6 (Monitor-only) | Sudah token-friendly (tanpa hardcoded + tanpa `dark:`) | `ChartRenderer.tsx`, `MermaidRenderer.tsx`, `FileUploadButton.tsx`, `ChatMiniFooter.tsx`, `RefrasaButton.tsx`, `src/app/chat/layout.tsx` |

## 7. Kriteria Siap Lanjut ke V2

- Mapping v1 disetujui sebagai kontrak.
- Tidak ada perubahan visual mayor, kecuali perapihan yang wajib untuk konsistensi token.
- Seluruh file W1 dan W2 selesai dengan aturan:
- tidak ada hardcoded color
- tidak ada `dark:` untuk warna/border/shadow
- hanya semantic token untuk style color

## 8. Referensi

- `docs/system-design-standarization/chat-page-style/context-rules.md`
- `docs/chat-page/baseline-file-map.md`
- `docs/chat-page/chat-ui-shell-responsive-and-theme-spec.md`
- `docs/chat-page/chat-quality-gates-and-regression-checklist.md`
