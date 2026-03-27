# Makalah Trace v1 - Source of Truth for Implementation Readiness

Status: Proposed source of truth for implementation planning  
Last Updated: 2026-03-27  
Owner: Product and Engineering  
Scope: Makalah Trace v1 on current Makalah App codebase

## 1. Purpose

Dokumen ini mendefinisikan keputusan arsitektur, batas scope, kesiapan codebase, gap implementasi, dan urutan implementasi Makalah Trace v1 pada codebase Makalah App yang aktif.

Dokumen ini bersifat normatif untuk keputusan implementasi tingkat tinggi. Jika ada catatan discovery atau narasi konsep yang bertentangan, keputusan di dokumen ini yang harus diikuti untuk perencanaan implementasi.

## 2. Source Hierarchy

Urutan acuan yang harus dipakai:

1. [editor-organization-management.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/editor-organization-management.md)  
   Dokumen aturan produk v1 untuk role, akses, audit flow, privasi, dan state machine.
2. Dokumen ini  
   Menetapkan keputusan implementasi terhadap codebase aktif.
3. [makalah-trace-concept.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/makalah-trace-concept.md)  
   Narasi konsep dan positioning produk.
4. [brainstorming-notes.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/brainstorming-notes.md)  
   Discovery notes non-normatif.

## 3. Executive Decision Summary

Keputusan implementasi yang dikunci untuk Makalah Trace v1 adalah:

1. Makalah Trace v1 hanya berlaku untuk conversation yang memiliki `paperSession`.
2. Makalah Trace v1 harus dibangun sebagai subsystem audit terpisah yang menempel ke `conversationId`.
3. Makalah Trace v1 tidak boleh dimasukkan ke domain `paperSessions`.
4. PDF final Makalah Trace tidak boleh mengikuti validator export paper biasa.
5. Implementasi v1 harus diawali dari domain access control dan audit state machine, bukan dari UI atau prompt evaluator.

## 4. Product Scope for v1

### 4.1 In Scope

Makalah Trace v1 mencakup:

- audit conversation paper-mode
- role operasional audit
- organization-bound access
- assignment `Editor -> User`
- share conversation untuk audit
- audit run per stage
- append-only stage attempt
- review editor berbasis evidence snippet
- PDF final audit jika seluruh syarat audit terpenuhi

### 4.2 Out of Scope

Makalah Trace v1 tidak mencakup:

- audit untuk semua conversation AI di aplikasi
- auto-penalti nilai
- akses editor ke full raw transcript
- akses publik tanpa login
- fitur organisasi lanjutan di luar kebutuhan audit inti

## 5. Architectural Decision

### 5.1 Scope Decision

Makalah Trace v1 wajib dibatasi pada conversation yang memiliki `paperSession`.

Justifikasi:

- Dokumen v1 mewajibkan audit per stage.
- Definisi stage yang stabil saat ini hanya tersedia di paper workflow.
- Jalur export paper saat ini juga sudah terikat ke `paperSession`.
- Membuka ke semua conversation AI akan memperluas problem menjadi redesign domain, bukan implementasi v1 yang fokus.

### 5.2 Boundary Decision

Makalah Trace v1 wajib dibangun sebagai bounded context audit baru yang menempel ke `conversationId`.

Justifikasi:

- Objek yang diaudit adalah proses kolaborasi pada conversation.
- `paperSessions` saat ini adalah domain penulisan paper milik owner user.
- Makalah Trace membutuhkan role lintas user, access policy baru, state machine baru, dan export rule baru.
- Mencampur state audit ke `paperSessions` akan merusak pemisahan domain dan memperbesar risiko regresi.

### 5.3 Export Decision

PDF final Makalah Trace wajib menggunakan validator export terpisah dari export paper biasa.

Justifikasi:

- export paper biasa saat ini hanya memeriksa owner dan `paperSession.currentStage === "completed"`
- Makalah Trace mensyaratkan audit run `completed`
- Makalah Trace mensyaratkan setiap stage memiliki `latest approved attempt`
- Makalah Trace mensyaratkan blokir export baru saat share dicabut atau akses dicabut

## 6. Current Codebase Readiness

### 6.1 Readiness Verdict

Codebase saat ini **belum siap penuh** untuk Makalah Trace v1, tetapi **sudah punya fondasi yang cukup** untuk membangun v1 tanpa perlu mengganti arsitektur inti aplikasi.

Kesimpulan readiness:

- **Feasible:** ya
- **Production-ready without new domain work:** tidak
- **Needs new bounded context:** ya

### 6.2 Readiness Matrix

| Capability | Status | Notes |
|---|---|---|
| Conversation anchor | Available | `conversations` sudah stabil |
| Paper stage model | Available | `paperSessions` sudah punya stage flow |
| Message-level process signals | Available | `messages` punya timestamp, interaction, reasoning trace |
| Append-only audit attempt model | Not available | belum ada domain `auditStageAttempts` |
| Organization model | Not available | belum ada organisasi dan membership |
| Editor assignment model | Not available | belum ada assignment `Editor -> User` |
| Share for audit | Not available | belum ada `conversationShares` |
| Editor authz on user conversation | Not available | auth helper masih owner-only |
| Audit run state machine | Not available | belum ada `auditRuns` |
| Audit PDF gate | Not available | export masih pakai validator paper |

## 7. Existing Building Blocks That Can Be Reused

### 7.1 Data and Anchor Layer

Fondasi data yang bisa dipakai ulang:

- `conversations`
- `messages`
- `paperSessions`
- `artifacts`
- `files`

Referensi:
- [schema.ts](/Users/eriksupit/Desktop/makalahapp/convex/schema.ts)

### 7.2 Evidence Layer

Sinyal conversation yang bisa dipakai untuk membentuk `evidence_bundle`:

- message content
- `createdAt`
- `messages.metadata.interaction`
- `messages.reasoningTrace`
- file attachment context
- source metadata

Referensi:
- [messages.ts](/Users/eriksupit/Desktop/makalahapp/convex/messages.ts)
- [schema.ts](/Users/eriksupit/Desktop/makalahapp/convex/schema.ts)

### 7.3 Stage and Progress Patterns

Pattern yang bisa dijadikan referensi implementasi:

- stage progression
- stage approval
- rewind
- invalidation trail
- stage boundary tracking

Referensi:
- [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts)
- [paperPermissions.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/utils/paperPermissions.ts)

Catatan:
Pattern ini boleh ditiru, tetapi domain Makalah Trace tidak boleh ditanam langsung ke `paperSessions`.

### 7.4 Status and Event Trail Patterns

Pattern status dan event trail yang bisa dipakai sebagai referensi:

- status progression
- event logging
- operator/admin flow

Referensi:
- [technicalReports.ts](/Users/eriksupit/Desktop/makalahapp/convex/technicalReports.ts)

### 7.5 Delivery Layer

Infrastruktur delivery yang bisa dipakai ulang:

- route export PDF
- route export Word
- builder PDF
- validator export sebagai pattern

Referensi:
- [pdf route](/Users/eriksupit/Desktop/makalahapp/src/app/api/export/pdf/route.ts)
- [word route](/Users/eriksupit/Desktop/makalahapp/src/app/api/export/word/route.ts)
- [validation.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/export/validation.ts)

## 8. Required New Capabilities

Makalah Trace v1 membutuhkan capability baru berikut. Seluruh item di bawah ini dianggap **wajib** untuk implementasi v1 yang patuh pada dokumen produk.

### 8.1 Organization and Membership

Harus ditambah:

- `organizations`
- `organizationMembers`

Fungsi utama:

- mengikat user ke organisasi
- membatasi editor dan user dalam boundary institusi

### 8.2 Operational Roles for Audit

Harus ditambah model peran operasional Makalah Trace:

- `Admin Organisasi`
- `Editor`

Catatan:
Role global yang ada saat ini tidak cukup. Saat ini role sistem hanya:

- `superadmin`
- `admin`
- `user`

Referensi:
- [users.ts](/Users/eriksupit/Desktop/makalahapp/convex/users.ts)
- [permissions.ts](/Users/eriksupit/Desktop/makalahapp/convex/permissions.ts)

### 8.3 Editor Assignment

Harus ditambah:

- `editorAssignments`

Fungsi utama:

- memastikan editor hanya mengaudit user yang memang diassign
- menjadi bagian dari AND access policy

### 8.4 Share for Audit

Harus ditambah:

- `conversationShares`

Fungsi utama:

- menandai conversation paper-mode yang dibuka untuk audit
- menyimpan status share aktif/nonaktif
- menjadi syarat legal access untuk editor

### 8.5 Editor Authorization Layer

Harus ditambah helper authz khusus audit editor.

Kondisi minimum yang wajib diperiksa:

1. akun login valid
2. role audit valid
3. editor satu organisasi dengan user
4. user diassign ke editor
5. share conversation masih aktif

Catatan:
Helper auth saat ini belum mendukung itu karena masih owner-only.

Referensi:
- [authHelpers.ts](/Users/eriksupit/Desktop/makalahapp/convex/authHelpers.ts)

### 8.6 Audit Run Domain

Harus ditambah:

- `auditRuns`
- `auditRunEvents`
- `auditStageAttempts`

Fungsi utama:

- menyimpan lifecycle audit run
- menyimpan histori perubahan status
- menyimpan stage attempts secara append-only

### 8.7 Evidence Bundle Builder

Harus ditambah service yang menyusun `evidence_bundle` per stage dari data conversation yang tersedia.

Fungsi utama:

- memilih snippet yang relevan
- mengemas signals per stage
- menjaga agar editor tidak menerima raw transcript penuh

### 8.8 Audit Evaluator Pipeline

Harus ditambah jalur evaluator khusus audit dengan constraint:

- system prompt `audit-evaluator`
- tidak ada free tool-calling
- output JSON terstruktur per stage

### 8.9 Makalah Trace Export Gate

Harus ditambah validator export khusus Makalah Trace dengan rule:

- audit run harus `completed`
- semua stage harus punya `latest approved attempt`
- export baru ditolak saat `share_revoked`
- export baru ditolak saat `revoked_access`
- PDF harus memuat watermark waktu generate dan status akses saat generate

## 9. Capabilities That Are Explicitly Missing Today

Bagian ini dikunci untuk menghindari asumsi palsu saat implementasi.

Saat dokumen ini ditulis, codebase **belum** memiliki:

- model organisasi
- membership organisasi
- role `Editor`
- role `Admin Organisasi`
- assignment `Editor -> User`
- conversation share untuk audit
- authz editor lintas user
- audit run state machine Makalah Trace
- append-only stage attempt Makalah Trace
- export gate Makalah Trace

## 10. Implementation Constraints

Constraint implementasi yang wajib dipatuhi:

1. Jangan gabungkan state audit ke `paperSessions`.
2. Jangan izinkan editor melihat full raw transcript pada v1.
3. Jangan gunakan validator export paper biasa untuk PDF final Makalah Trace.
4. Jangan memulai dari UI lebih dulu sebelum domain access control dan audit run selesai.
5. Jangan membuka scope v1 ke semua conversation AI.

## 11. Recommended Implementation Order

### Phase 1 - Domain and Authorization

Wajib dikerjakan paling awal.

Isi phase:

- `organizations`
- `organizationMembers`
- `editorAssignments`
- `conversationShares`
- helper authz audit editor

Exit criteria:

- sistem bisa menjawab secara deterministik apakah editor boleh mengaudit satu conversation tertentu

### Phase 2 - Audit Lifecycle Core

Isi phase:

- `auditRuns`
- `auditRunEvents`
- `auditStageAttempts`
- state machine audit run
- append-only re-run stage

Exit criteria:

- audit bisa dibuat, berjalan, diulang per stage, dihentikan, dan berakhir dengan status yang sah

### Phase 3 - Evidence and Evaluator

Isi phase:

- `evidence_bundle` builder
- mapping evidence per stage
- evaluator `audit-evaluator`
- output JSON terstruktur

Exit criteria:

- setiap stage menghasilkan audit output yang konsisten dan bisa direview editor

### Phase 4 - Editor Interface

Isi phase:

- dashboard editor
- daftar conversation yang shared
- tampilan hasil per stage
- aksi `lanjut`, `ulang stage`, `hentikan`

Exit criteria:

- editor dapat menjalankan audit end-to-end tanpa akses ke raw transcript penuh

### Phase 5 - Final Export

Isi phase:

- export validator Makalah Trace
- builder PDF audit
- watermark timestamp dan access state

Exit criteria:

- PDF final hanya tersedia ketika semua syarat audit v1 benar-benar terpenuhi

## 12. Risks If This Decision Is Violated

### Jika Makalah Trace dimasukkan ke `paperSessions`

Risiko:

- state audit bercampur dengan state penulisan paper
- akses editor bentrok dengan owner-only flow
- perubahan kecil pada audit berpotensi merusak paper workflow
- maintenance jangka panjang menjadi jauh lebih mahal

### Jika scope dibuka ke semua conversation di v1

Risiko:

- definisi stage audit menjadi tidak stabil
- evidence bundling menjadi inkonsisten
- scope authz dan UI melebar terlalu cepat
- implementasi v1 tertunda tanpa manfaat produk yang sepadan

## 13. Final Conclusion

Makalah Trace v1 dapat dibangun di atas codebase Makalah App saat ini, tetapi arsitektur lengkapnya belum tersedia. Fondasi conversation, paper stage flow, process signal, event trail, dan export infrastructure sudah ada. Yang belum tersedia adalah domain inti yang memungkinkan audit dosen/guru berjalan secara benar dan aman: organization model, assignment, share, editor authorization, audit run per stage, dan export gating berbasis audit.

Keputusan final yang harus dipakai untuk implementasi:

- Makalah Trace v1 hanya untuk conversation yang punya `paperSession`
- Makalah Trace v1 dibangun sebagai subsystem audit terpisah
- anchor utama tetap `conversationId`
- export final Makalah Trace wajib memakai gate tersendiri

## 14. Related Files

- [editor-organization-management.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/editor-organization-management.md)
- [makalah-trace-concept.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/makalah-trace-concept.md)
- [brainstorming-notes.md](/Users/eriksupit/Desktop/makalahapp/docs/makalah-trace/brainstorming-notes.md)
- [schema.ts](/Users/eriksupit/Desktop/makalahapp/convex/schema.ts)
- [messages.ts](/Users/eriksupit/Desktop/makalahapp/convex/messages.ts)
- [paperSessions.ts](/Users/eriksupit/Desktop/makalahapp/convex/paperSessions.ts)
- [technicalReports.ts](/Users/eriksupit/Desktop/makalahapp/convex/technicalReports.ts)
- [users.ts](/Users/eriksupit/Desktop/makalahapp/convex/users.ts)
- [permissions.ts](/Users/eriksupit/Desktop/makalahapp/convex/permissions.ts)
- [authHelpers.ts](/Users/eriksupit/Desktop/makalahapp/convex/authHelpers.ts)
- [paperPermissions.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/utils/paperPermissions.ts)
- [validation.ts](/Users/eriksupit/Desktop/makalahapp/src/lib/export/validation.ts)
- [pdf route](/Users/eriksupit/Desktop/makalahapp/src/app/api/export/pdf/route.ts)
- [word route](/Users/eriksupit/Desktop/makalahapp/src/app/api/export/word/route.ts)
