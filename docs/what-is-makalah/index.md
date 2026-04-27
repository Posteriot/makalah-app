# White Book Makalah AI

Selamat datang di dokumentasi resmi **"White Book"** Makalah AI. Dokumen ini adalah satu-satunya sumber kebenaran (*Single Source of Truth*) mengenai visi, arsitektur, dan mekanisme sistem Makalah AI. Seluruh konten telah melalui audit forensik terhadap codebase produksi.

## 📁 Struktur Dokumentasi (Directory Tree)

```text
docs/what-is-makalah/
├── 01-identitas-manifesto/
│   ├── 01-visi-misi-tujuan.md
│   ├── 02-manifesto-filosofi.md
│   └── index.md
├── 02-fitur-kapabilitas/
│   ├── 01-workflow-14-stage.md
│   ├── 02-search-orchestrator.md
│   ├── 03-naskah.md
│   ├── 04-progress-timeline.md
│   ├── 05-refrasa.md
│   ├── 06-artifact.md
│   ├── 07-choice-card.md
│   ├── 08-unified-process-card.md
│   ├── 09-validation-panel.md
│   └── index.md
├── 03-technology-stack/
│   ├── 01-nextjs.md
│   ├── 02-convex.md
│   ├── 03-better-auth.md
│   ├── 04-tailwindcss.md
│   ├── 05-ui-ecosystem.md
│   ├── 06-ai-sdk.md
│   ├── 07-ai-gateway.md
│   ├── 08-openrouter.md
│   ├── 09-tavily.md
│   ├── 10-search-orchestration.md
│   ├── 11-file-extraction.md
│   ├── 12-xendit.md
│   ├── 13-cloudflare-turnstile.md
│   ├── 14-resend.md
│   ├── 15-sentry.md
│   └── index.md
├── 04-prompt-skills/
│   ├── 01-orchestration.md
│   ├── 02-system-prompts.md
│   ├── 03-stage-skills.md
│   ├── 04-hardcoded-prompts.md
│   ├── 05-runtime-enforcers.md
│   └── index.md
├── 05-user-flow/
│   ├── 01-visual-flow.md
│   ├── 02-core-mechanisms.md
│   ├── 03-lifecycle-states.md
│   ├── 04-cross-stage-logic.md
│   ├── 05-preparatory-stages.md
│   ├── 06-writing-stages.md
│   ├── 07-finalization-stages.md
│   ├── 08-output-and-export.md
│   └── index.md
├── 06-agent-harness/
│   ├── 01-definisi-dan-konsep.md
│   ├── 02-orchestration-loop.md
│   ├── 03-tool-inventory-capabilities.md
│   ├── 04-context-management.md
│   ├── 05-tool-safety-enforcement.md
│   ├── 06-persistence-observability.md
│   └── index.md
├── 07-chat-ui/
│   ├── 01-shell-layout.md
│   ├── 02-message-components.md
│   ├── 03-interactive-elements.md
│   ├── 04-error-states.md
│   ├── 05-ui-inventory.md
│   └── index.md
├── 08-langganan-pembayaran/
│   ├── 01-payment-integration.md
│   ├── 02-subscription-plans.md
│   ├── 03-quota-logic.md
│   ├── 04-admin-controls.md
│   └── index.md
├── 09-keamanan-privasi/
│   ├── 01-route-protection.md
│   ├── 02-auth-architecture.md
│   ├── 03-two-factor-auth.md
│   ├── 04-rbac-authorization.md
│   ├── 05-webhook-security.md
│   ├── 06-rate-limiting.md
│   └── index.md
├── 10-perusahaan-kontak/
│   ├── 01-profil-perusahaan.md
│   ├── 02-kontak-dukungan.md
│   └── index.md
├── 11-compliance-ethics/
│   ├── 01-kebijakan-privasi.md
│   ├── 02-ketentuan-layanan.md
│   ├── 03-keamanan-data.md
│   ├── 04-etika-ai.md
│   └── index.md
├── references/                 # Referensi Teknis "Mentah"
├── index.md                    # Root Navigation (Peta Utama)
└── glossary.md                 # Glosarium Istilah
```

## 🧭 Peta Dokumentasi

Dokumentasi disusun secara hierarkis untuk memudahkan navigasi bagi pengembang dan model AI.

### 1. [Identitas & Manifesto](./01-identitas-manifesto/)
Filosofi dasar yang membentuk DNA produk:
- [Visi, Misi, & Tujuan](./01-identitas-manifesto/01-visi-misi-tujuan.md)
- [Manifesto Filosofi "Kamu Pawang, AI Tukang"](./01-identitas-manifesto/02-manifesto-filosofi.md)

### 2. [Fitur & Kapabilitas](./02-fitur-kapabilitas/)
Etalase fungsional dan kapabilitas sistem:
- **[Katalog Fitur Utama (Index)](./02-fitur-kapabilitas/index.md)**
- [Workflow 14 Stage](./02-fitur-kapabilitas/01-workflow-14-stage.md) | [Artifact System](./02-fitur-kapabilitas/06-artifact.md) | [Fitur Refrasa](./02-fitur-kapabilitas/05-refrasa.md)

### 3. [Technology Stack](./03-technology-stack/)
Infrastruktur dan ekosistem teknologi:
- **[Eksosistem Teknologi (Index)](./03-technology-stack/index.md)**
- [Convex](./03-technology-stack/02-convex.md) | [AI SDK](./03-technology-stack/06-ai-sdk.md) | [AI Gateway](./03-technology-stack/07-ai-gateway.md) | [Next.js](./03-technology-stack/01-nextjs.md)

### 4. [Prompt & Skills](./04-prompt-skills/)
Orkestrasi kecerdasan dan instruksi AI:
- [Orkestrasi Instruction Stack](./04-prompt-skills/01-orchestration.md)
- [System Prompts](./04-prompt-skills/02-system-prompts.md) | [Katalog Stage Skills](./04-prompt-skills/03-stage-skills.md) | [Runtime Enforcers](./04-prompt-skills/05-runtime-enforcers.md)

### 5. [User Flow & System Behavior](./05-user-flow/)
Logika transisi, lifecycle, dan penegakan alur kerja:
- **[Mekanisme User Flow (Index)](./05-user-flow/index.md)**
- [Mekanisme Inti](./05-user-flow/02-core-mechanisms.md) | [Status Sesi & Lifecycle](./05-user-flow/03-lifecycle-states.md) | [Logika Lintas Stage](./05-user-flow/04-cross-stage-logic.md)

### 6. [Agent Harness](./06-agent-harness/)
Infrastruktur runtime dan orkestrasi AI:
- **[Overview Agent Harness (Index)](./06-agent-harness/index.md)**
- [Orchestration Loop](./06-agent-harness/02-orchestration-loop.md) | [Context Management](./06-agent-harness/04-context-management.md) | [Safety Enforcement](./06-agent-harness/05-tool-safety-enforcement.md)

### 7. [Chat UI & Design System](./07-chat-ui/)
Antarmuka pengguna dan pengalaman interaksi:
- **[Overview Chat UI (Index)](./07-chat-ui/index.md)**
- [Shell Layout](./07-chat-ui/01-shell-layout.md) | [Message Components](./07-chat-ui/02-message-components.md) | [Interactive Elements](./07-chat-ui/03-interactive-elements.md)

### 8. [Langganan & Pembayaran](./08-langganan-pembayaran/)
Ekosistem monetisasi, integrasi gateway, dan kontrol kuota:
- **[Overview Langganan & Pembayaran (Index)](./08-langganan-pembayaran/index.md)**
- [Payment Integration](./08-langganan-pembayaran/01-payment-integration.md) | [Subscription Plans](./08-langganan-pembayaran/02-subscription-plans.md) | [Quota Logic](./08-langganan-pembayaran/03-quota-logic.md)

### 9. [Keamanan & Privasi](./09-keamanan-privasi/)
Arsitektur keamanan data dan proteksi sistem:
- **[Overview Keamanan (Index)](./09-keamanan-privasi/index.md)**
- [Route Protection](./09-keamanan-privasi/01-route-protection.md) | [Auth Architecture](./09-keamanan-privasi/02-auth-architecture.md) | [Two-Factor Auth](./09-keamanan-privasi/03-two-factor-auth.md) | [RBAC & Authorization](./09-keamanan-privasi/04-rbac-authorization.md) | [Webhook Security](./09-keamanan-privasi/05-webhook-security.md) | [Rate Limiting](./09-keamanan-privasi/06-rate-limiting.md)

### 10. [Perusahaan & Kontak](./10-perusahaan-kontak/)
Profil legal dan operasional:
- **[Overview Perusahaan (Index)](./10-perusahaan-kontak/index.md)**
- [Profil Perusahaan](./10-perusahaan-kontak/01-profil-perusahaan.md) | [Kontak & Dukungan](./10-perusahaan-kontak/02-kontak-dukungan.md)

### 11. [Compliance & Ethics](./11-compliance-ethics/)
Kebijakan layanan, integritas, dan etika AI:
- **[Overview Compliance (Index)](./11-compliance-ethics/index.md)**
- [Kebijakan Privasi](./11-compliance-ethics/01-kebijakan-privasi.md) | [Ketentuan Layanan](./11-compliance-ethics/02-ketentuan-layanan.md) | [Keamanan Data Pengguna](./11-compliance-ethics/03-keamanan-data.md) | [Etika AI](./11-compliance-ethics/04-etika-ai.md)

---

## 📚 Referensi Teknis & Glosarium

- **[Glosarium Istilah (Glossary)](./glossary.md)**: Definisi istilah teknis khusus Makalah AI.
- **[Technical References](./references/)**: Dokumentasi "mentah" per-stage dan spesifikasi API.

---
> [!IMPORTANT]
> Gunakan file **index.md** di setiap kategori sebagai gerbang utama navigasi. Index tersebut dirancang khusus untuk memberikan konteks cepat bagi sistem AI.
