# Convex Migrations

## ⚠️ PENTING: Historical Records Only

**File-file di direktori ini adalah ONE-TIME MIGRATION SCRIPTS.**

Setelah dijalankan, data yang ada di database **menjadi source of truth**, bukan file-file ini.

### Kenapa Ini Penting?

1. **Migration scripts = historical snapshots**
   - Menunjukkan nilai saat script dibuat
   - TIDAK diupdate setelah dijalankan
   - TIDAK mencerminkan state database saat ini

2. **Database = source of truth**
   - Config yang aktif tersimpan di Convex database
   - Bisa diubah via Admin Panel tanpa modifikasi code
   - Selalu cek database untuk nilai aktual

### Contoh Masalah

```
# Di seedDefaultAIConfig.ts:
primaryModel: "gemini-2.5-flash", fallbackModel: "openai/gpt-5.1"

# Di database (actual) — bisa berbeda jika admin sudah update via Admin Panel
```

File migration menunjukkan nilai **saat seed pertama kali**, bukan nilai saat ini.

### Cara Cek Nilai Aktual

| Data | Cara Cek |
|------|----------|
| AI Config | Admin Panel → AI Providers |
| System Prompts | Admin Panel → System Prompts |
| Pricing Plans | Admin Panel → Pricing |
| Style Constitution | Admin Panel → Style Constitution |

Atau via Convex Dashboard:
```bash
npm run convex:dashboard
```

### Daftar Migration Scripts

| File | Tujuan | Tabel Terkait |
|------|--------|---------------|
| `seedDefaultAIConfig.ts` | Initial AI config | `aiProviderConfigs` |
| `seedDefaultSystemPrompt.ts` | Initial system prompt | `systemPrompts` |
| `seedPricingPlans.ts` | Pricing tiers | `pricingPlans` |
| `seedDefaultStyleConstitution.ts` | Refrasa style rules | `styleConstitutions` |
| `seedDocumentationSections.ts` | Docs page content | `documentationSections` |
| `updateAIConfigForToolCalling.ts` | AI config update | `aiProviderConfigs` |
| `updateToGPT4oForToolCalling.ts` | Fallback model change | `aiProviderConfigs` |
| `addRoleToExistingUsers.ts` | User role migration | `users` |
| `backfillProviderKeys.ts` | API key migration | `aiProviderConfigs` |
| `updatePrompt*.ts` | System prompt updates | `systemPrompts` |
| `fix*.ts` | Various fixes | Various |

### Untuk AI Agents

Jika kamu adalah AI agent yang membaca direktori ini:

1. **JANGAN** menganggap nilai di file migration sebagai current state
2. **SELALU** cek database atau Admin Panel untuk nilai aktual
3. **PAHAMI** bahwa migration = history, database = reality
4. Jika user tanya tentang config aktif, arahkan ke Admin Panel atau query database

---

*Last updated: 2025-01-30*
