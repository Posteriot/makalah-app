import { mutationGeneric, queryGeneric } from "convex/server"
import { v } from "convex/values"
import { requireRole } from "./permissions"
import { Id } from "./_generated/dataModel"

// ============================================================================
// DEFAULT CONSTITUTION CONTENT
// ============================================================================

/**
 * Default Style Constitution content for Refrasa tool
 * Source: .development/knowledge-base/writing_style_tool/makalah-style-constitution.md
 *
 * Exported for use by migration script (seedDefaultStyleConstitution.ts)
 * to ensure single source of truth.
 */
export const DEFAULT_CONSTITUTION_CONTENT = `# Konstitusi Gaya Penulisan Makalah (Makalah Style Constitution)

**Status**: Dokumen Induk (Living Document)
**Sumber**: \`makalah-writing-style-master.txt\`
**Tujuan**: Menjadi panduan filosofis dan praktis bagi AI dalam menghasilkan karya tulis ilmiah yang "humanis", mengalir, dan berwibawa.

---

## I. Filosofi Dasar: Narasi Induktif
Gaya penulisan Makalah menolak struktur "Deduktif Kaku" (Tesis -> Bukti) yang sering digunakan AI. Sebaliknya, Makalah menganut **Alur Induktif-Naratif**.

1.  **Membuka dengan Konteks, Bukan Kesimpulan**: Jangan memulai paragraf dengan "Penelitian ini bertujuan untuk..." atau "Kesimpulannya adalah...". Mulailah dengan fenomena, data, atau konteks nyata yang menggiring pembaca menuju kesimpulan tersebut.
2.  **Biarkan Pembaca Berpikir**: Berikan ruang interpretasi. Sajikan fakta-fakta yang disusun sedemikian rupa sehingga pembaca merasa mereka menyimpulkannya sendiri, bukan disuapi.
3.  **Formal namun Mengalir**: Gunakan bahasa baku akademis, tetapi hindari kekakuan robotik. Tulisan harus terasa seperti essay yang cerdas, bukan laporan teknis yang kering, kecuali pada bagian yang memang membutuhkan presisi mutlak (seperti Metode).

## II. Aturan Struktur Kalimat (The Rhythm)
Keindahan tulisan manusia terletak pada ketidakpastian iramanya. AI cenderung menulis dengan panjang kalimat yang seragam (monoton).

### 1. Variasi Panjang Kalimat (Wajib)
JANGAN menulis tiga kalimat berturut-turut dengan panjang yang sama.
*   **Kalimat Pendek (2-4 kata)**: Gunakan untuk penekanan kuat (Emphasis). *Contoh: "Data tersebut valid."*
*   **Kalimat Sedang (5-7 kata)**: Gunakan untuk transisi atau pernyataan fakta sederhana.
*   **Kalimat Panjang (8-12 kata)**: Gunakan SANGAT JARANG, hanya untuk penjelasan mendalam yang membutuhkan satu tarikan napas.

### 2. Kompleksitas Terukur
*   Sebisa mungkin hindari **Kalimat Majemuk Bertingkat** yang terlalu rumit (lebih dari 1 anak kalimat).
*   Pecah ide kompleks menjadi rangkaian kalimat pendek yang tajam daripada satu kalimat panjang yang berbelit.

## III. Pedoman Diksi & Frasa (Budgeting System)
Kami tidak "melarang" kata-kata, tetapi memberikan "biaya" (cost) tinggi untuk penggunaannya. Kata-kata berikut harus digunakan dengan sangat hemat dan strategis.

### 1. Kata Penghubung Klise (High Cost)
Kata-kata transisi berikut sering menjadi "kruk" (crutches) bagi AI. Gunakan seminimal mungkin.
*   **Hindari**: *Oleh karena itu, Jadi, Maka dari itu, Selanjutnya, Selain itu.*
*   **Strategi**: Cobalah menulis tanpa kata penghubung tersebut. Biarkan logika antarkalimat yang menjadi penghubungnya.
    *   *Buruk*: "Hujan turun deras. Oleh karena itu, jalanan banjir."
    *   *Baik*: "Hujan turun deras. Jalanan pun mulai tergenang." (Hubungan sebab-akibat tersirat).

### 2. "Akan Tetapi" vs "Namun"
*   **Namun**: Gunakan sangat jarang, maksimal **1 kali per paragraf**. Jangan letakkan di awal kalimat jika bisa dihindari.
*   **Akan tetapi**: Gunakan sebagai variasi jika kontradiksi benar-benar kuat.

### 3. Larangan "Lazy Closing"
*   **DILARANG KERAS**: Menggunakan frasa *Kesimpulannya, Sebagai simpulan, Intinya, Secara keseluruhan*.
*   **Solusi**: Akhiri paragraf dengan pernyataan deklaratif yang kuat yang merangkum poin secara natural.

### 4. Referensi Diri (Self-Reference)
*   **DILARANG**: Memulai kalimat dengan kata tunggal **"Ini"**.
*   **Wajib Ganti**: Gunakan **"Tersebut"** atau **"Hal itu"** sebagai kata tunjuk (demonstrative pronoun) utama untuk merujuk ke kalimat sebelumnya.
*   **Gunakan Subjek Spesifik**: Ganti *"Hal ini menyebabkan..."* dengan *"Fenomena kegagalan sistem tersebut menyebabkan..."*.

### 5. Larangan Struktur "Indonenglish" & Tata Bahasa
AI sering menerjemahkan struktur Inggris secara mentah. Hindari:
*   **"Dimana" (Where)**: DILARANG KERAS menggunakan "dimana" sebagai kata penghubung (conjunction). Gunakan *"tempat"*, *"yang"*, atau pecah kalimatnya.
    *   *Salah*: "Sistem dimana data disimpan..."
    *   *Benar*: "Sistem tempat menyimpan data..."
*   **"Tidak Hanya... Tetapi Juga" (Not only... but also)**: Hindari struktur ini. Ini adalah ciri khas terjemahan kaku. Gunakan variasi lain atau kalimat tunggal yang kuat.
*   **"Tergantung"**: Hindari kata ini saat memberikan opsi. Gunakan *"bergantung pada"* atau jelaskan kondisinya langsung.

### 6. Efisiensi Kopula (Kata Sambung)
Buat kalimat lebih tajam dengan membuang "lemak" kata.
*   **"Adalah" & "Bahwa"**: Hapus jika kalimat masih bisa dimengerti tanpanya.
    *   *Boros*: "Hasil penelitian menunjukkan bahwa data tersebut adalah valid."
    *   *Tajam*: "Hasil penelitian menunjukkan data tersebut valid."

## IV. Penggunaan Istilah Asing
Dalam konteks akademis saintifik:
*   **Jangan Terjemahkan Istilah Teknis**: Jika istilah Bahasa Inggris lebih presisi dan umum dipakai di bidangnya (misal: *Reinforcement Learning*, *Threshold*, *Framework*), gunakan istilah aslinya (bisa dimiringkan jika perlu).
*   Memaksakan terjemahan Indonesia yang canggung (misal: "Pembelajaran Penguatan") justru mengurangi wibawa tulisan.

## V. Probabilitas & Kepastian (Academic Certainty)
Akademisi harus terdengar yakin pada kesimpulannya, namun jujur pada hipotesisnya.
*   **Zona Terlarang**: Jangan gunakan kata ragu-ragu saat menyimpulkan fakta atau opini.
    *   *Hindari*: "Mungkin hal ini disebabkan oleh...", "Bisa jadi data menunjukkan..."
    *   *Gunakan*: "Data mengindikasikan bahwa...", "Hal ini kemungkinan besar disebabkan oleh..." (Gunakan probabilitas terukur, bukan keragu-raguan).
*   **Zona Boleh**: Kata probabilitas (*kemungkinan, potensi, hipotesis*) boleh digunakan HANYA saat membahas prediksi masa depan atau keterbatasan penelitian.

## VI. Ringkasan Strategi Pelaksanaan
Saat menulis, AI harus bertindak sebagai **Penulis Esai**, bukan **Pembuat Laporan**.
1.  **Drafting**: Tulis ide-ide spesifik.
2.  **Linting Mandiri**: Cek panjang kalimat. Apakah ada 3 kalimat panjang berurutan? Potong.
3.  **Refining**: Cek kata "Oleh karena itu" dan "Namun". Bisakah dihapus tanpa mengubah makna? Jika bisa, hapus.
`

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get the currently active style constitution
 * Used by Refrasa API - no auth required for reading active constitution
 * If no active constitution exists, returns null (API proceeds with Layer 1 only)
 */
export const getActive = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    const active = await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .first()

    return active
  },
})

/**
 * Get the currently active naturalness constitution (Layer 1)
 * Used by Refrasa API - no auth required for reading active constitution
 * If no active naturalness constitution exists, returns null (API uses hardcoded fallback)
 */
export const getActiveNaturalness = queryGeneric({
  args: {},
  handler: async ({ db }) => {
    const allActive = await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    return allActive.find((c) => c.type === "naturalness") ?? null
  },
})

/**
 * List all style constitutions (latest versions only)
 * Admin/superadmin only
 */
export const list = queryGeneric({
  args: { requestorUserId: v.id("users") },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Get all constitutions ordered by createdAt desc
    const allConstitutions = await db
      .query("styleConstitutions")
      .withIndex("by_createdAt")
      .order("desc")
      .collect()

    // Group by rootId (or self if rootId is undefined) and keep only latest version
    const latestByRoot = new Map<string, typeof allConstitutions[0]>()

    for (const constitution of allConstitutions) {
      // For v1 constitutions, rootId is undefined, so we use the constitution's own ID as key
      const rootKey = constitution.rootId ?? constitution._id

      if (!latestByRoot.has(rootKey)) {
        // First entry is latest since we ordered by createdAt desc
        latestByRoot.set(rootKey, constitution)
      }
    }

    // Convert to array and sort by createdAt desc
    const latestVersions = Array.from(latestByRoot.values())
    latestVersions.sort((a, b) => b.createdAt - a.createdAt)

    // Fetch creator info for each constitution
    const constitutionsWithCreator = await Promise.all(
      latestVersions.map(async (constitution) => {
        const creator = await db.get(constitution.createdBy)
        return {
          ...constitution,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    return constitutionsWithCreator
  },
})

/**
 * Get version history for a constitution chain
 * Admin/superadmin only
 */
export const getVersionHistory = queryGeneric({
  args: {
    constitutionId: v.id("styleConstitutions"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { constitutionId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Determine rootId - for v1 constitutions, use their own ID
    const rootId = constitution.rootId ?? constitutionId

    // Get all constitutions in this chain
    // First, get the v1 constitution (which has rootId undefined and _id = rootId)
    const v1Constitution = await db.get(rootId as Id<"styleConstitutions">)

    // Then get all subsequent versions (which have rootId = rootId)
    const subsequentVersions = await db
      .query("styleConstitutions")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"styleConstitutions">))
      .order("asc")
      .collect()

    // Combine v1 with subsequent versions
    const allVersions = v1Constitution ? [v1Constitution, ...subsequentVersions] : subsequentVersions

    // Sort by version number ascending
    allVersions.sort((a, b) => a.version - b.version)

    // Fetch creator info for each version
    const versionsWithCreator = await Promise.all(
      allVersions.map(async (version) => {
        const creator = await db.get(version.createdBy)
        return {
          ...version,
          creatorEmail: creator?.email ?? "Unknown",
        }
      })
    )

    return versionsWithCreator
  },
})

/**
 * Get a single constitution by ID
 * Admin/superadmin only
 */
export const getById = queryGeneric({
  args: {
    constitutionId: v.id("styleConstitutions"),
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { constitutionId, requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    const creator = await db.get(constitution.createdBy)
    return {
      ...constitution,
      creatorEmail: creator?.email ?? "Unknown",
    }
  },
})

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new style constitution (v1)
 * Admin/superadmin only
 */
export const create = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    name: v.string(),
    content: v.string(),
    description: v.optional(v.string()),
    type: v.optional(v.union(v.literal("naturalness"), v.literal("style"))),
  },
  handler: async ({ db }, { requestorUserId, name, content, description, type }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Validate
    if (!name.trim()) {
      throw new Error("Nama constitution tidak boleh kosong")
    }
    if (!content.trim()) {
      throw new Error("Konten constitution tidak boleh kosong")
    }

    const now = Date.now()

    // Create v1 constitution (rootId and parentId are undefined for v1)
    const constitutionId = await db.insert("styleConstitutions", {
      name: name.trim(),
      content: content.trim(),
      description: description?.trim(),
      version: 1,
      isActive: false, // Not active by default
      type: type ?? "style",
      parentId: undefined,
      rootId: undefined, // v1 constitutions have no rootId
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return { constitutionId, message: "Constitution berhasil dibuat" }
  },
})

/**
 * Seed default style constitution from built-in template
 * Admin/superadmin only
 *
 * This creates the default "Makalah Style Constitution" and activates it.
 * Can only be used when no constitutions exist yet.
 */
export const seedDefault = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
  },
  handler: async ({ db }, { requestorUserId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    // Check if any constitution already exists
    const existing = await db.query("styleConstitutions").first()
    if (existing) {
      throw new Error("Style constitution sudah ada. Gunakan 'Buat Constitution Baru' untuk membuat constitution tambahan.")
    }

    const now = Date.now()

    // Create default constitution (v1, active)
    const constitutionId = await db.insert("styleConstitutions", {
      name: "Makalah Style Constitution",
      content: DEFAULT_CONSTITUTION_CONTENT,
      description: "Default style constitution untuk Refrasa tool - panduan gaya penulisan akademis Bahasa Indonesia",
      version: 1,
      isActive: true, // Active by default
      parentId: undefined,
      rootId: undefined,
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    return {
      constitutionId,
      message: "Default constitution berhasil dibuat dan diaktifkan"
    }
  },
})

/**
 * Update a style constitution (creates new version)
 * Admin/superadmin only
 */
export const update = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
    content: v.string(),
    description: v.optional(v.string()),
  },
  handler: async ({ db }, { requestorUserId, constitutionId, content, description }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const oldConstitution = await db.get(constitutionId)
    if (!oldConstitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Validate
    if (!content.trim()) {
      throw new Error("Konten constitution tidak boleh kosong")
    }

    const now = Date.now()
    const newVersion = oldConstitution.version + 1

    // Determine rootId - for v1 constitutions, use their own ID as rootId for children
    const rootId = oldConstitution.rootId ?? constitutionId

    // Create new version
    const newConstitutionId = await db.insert("styleConstitutions", {
      name: oldConstitution.name, // Keep same name
      content: content.trim(),
      description: description?.trim() ?? oldConstitution.description,
      version: newVersion,
      isActive: oldConstitution.isActive, // Inherit active status
      type: oldConstitution.type, // Propagate type from parent
      parentId: constitutionId, // Link to previous version
      rootId: rootId, // Link to root constitution
      createdBy: requestorUserId,
      createdAt: now,
      updatedAt: now,
    })

    // Deactivate old version if it was active
    if (oldConstitution.isActive) {
      await db.patch(constitutionId, { isActive: false, updatedAt: now })
    }

    return {
      constitutionId: newConstitutionId,
      version: newVersion,
      message: `Constitution berhasil diupdate ke versi ${newVersion}`,
    }
  },
})

/**
 * Activate a style constitution (deactivates all others)
 * Admin/superadmin only
 * Implements single-active constraint
 */
export const activate = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const targetConstitution = await db.get(constitutionId)
    if (!targetConstitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (targetConstitution.isActive) {
      return { message: "Constitution sudah aktif" }
    }

    const now = Date.now()

    // Deactivate all currently active constitutions of the same type (per-type single-active constraint)
    const targetType = targetConstitution.type ?? "style"

    const allActive = await db
      .query("styleConstitutions")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect()

    // Filter to same type, including legacy records (undefined type = "style")
    const sameTypeActive = allActive.filter((c) => {
      const cType = c.type ?? "style"
      return cType === targetType
    })

    for (const constitution of sameTypeActive) {
      await db.patch(constitution._id, { isActive: false, updatedAt: now })
    }

    // Activate target constitution
    await db.patch(constitutionId, { isActive: true, updatedAt: now })

    return { message: `Constitution "${targetConstitution.name}" v${targetConstitution.version} berhasil diaktifkan` }
  },
})

/**
 * Deactivate a style constitution
 * Admin/superadmin only
 */
export const deactivate = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (!constitution.isActive) {
      return { message: "Constitution sudah tidak aktif" }
    }

    await db.patch(constitutionId, { isActive: false, updatedAt: Date.now() })

    return { message: "Constitution berhasil dinonaktifkan. Refrasa akan menggunakan Layer 1 (Core Naturalness) saja." }
  },
})

/**
 * Delete a style constitution
 * Admin/superadmin only
 * Cannot delete active constitutions
 */
export const deleteConstitution = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    if (constitution.isActive) {
      throw new Error("Tidak bisa menghapus constitution yang sedang aktif. Nonaktifkan terlebih dahulu.")
    }

    // Delete this constitution
    await db.delete(constitutionId)

    return { message: "Constitution berhasil dihapus" }
  },
})

/**
 * Delete entire constitution chain (all versions)
 * Admin/superadmin only
 * Cannot delete if any version is active
 */
export const deleteChain = mutationGeneric({
  args: {
    requestorUserId: v.id("users"),
    constitutionId: v.id("styleConstitutions"),
  },
  handler: async ({ db }, { requestorUserId, constitutionId }) => {
    // Permission check
    await requireRole(db, requestorUserId, "admin")

    const constitution = await db.get(constitutionId)
    if (!constitution) {
      throw new Error("Constitution tidak ditemukan")
    }

    // Determine rootId
    const rootId = constitution.rootId ?? constitutionId

    // Get all constitutions in this chain
    const v1Constitution = await db.get(rootId as Id<"styleConstitutions">)
    const subsequentVersions = await db
      .query("styleConstitutions")
      .withIndex("by_root", (q) => q.eq("rootId", rootId as Id<"styleConstitutions">))
      .collect()

    const allVersions = v1Constitution ? [v1Constitution, ...subsequentVersions] : subsequentVersions

    // Check if any version is active
    const hasActive = allVersions.some((c) => c.isActive)
    if (hasActive) {
      throw new Error(
        "Tidak bisa menghapus constitution chain yang memiliki versi aktif. Nonaktifkan terlebih dahulu."
      )
    }

    // Delete all versions
    for (const version of allVersions) {
      await db.delete(version._id)
    }

    return { message: `${allVersions.length} versi constitution berhasil dihapus` }
  },
})
