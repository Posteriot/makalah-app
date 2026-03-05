import { describe, expect, it } from "vitest"
import { splitInternalThought } from "./internal-thought-separator"

describe("splitInternalThought", () => {
  it("memisahkan frasa penundaan search dari jawaban utama", () => {
    const input = "Bentar ya, aku cari dulu informasinya. Oke, ini rangkumannya: poin A."
    const out = splitInternalThought(input)

    expect(out.publicContent).toContain("Oke, ini rangkumannya")
    expect(out.internalThoughtContent).toContain("Bentar ya")
  })

  it("memisahkan dua kalimat internal di awal ketika tanpa spasi setelah titik", () => {
    const input = "Bentar ya, aku cari dulu informasinya.Oke, aku sudah melakukan pencarian awal dan menemukan beberapa referensi. Ini dia ringkasannya."
    const out = splitInternalThought(input)

    expect(out.internalThoughtContent).toContain("Bentar ya")
    expect(out.internalThoughtContent).toContain("aku sudah melakukan pencarian awal")
    expect(out.publicContent).toContain("Ini dia ringkasannya")
  })

  it("tidak mengubah jawaban biasa yang tidak mengandung internal thought", () => {
    const input = "Berikut tiga referensi utama yang relevan dengan topik lo."
    const out = splitInternalThought(input)

    expect(out.publicContent).toBe(input)
    expect(out.internalThoughtContent).toBe("")
  })

  it("tetap mengembalikan internal-only saat tidak ada konten publik", () => {
    const input = "Tunggu bentar ya, gue cari dulu."
    const out = splitInternalThought(input)

    expect(out.publicContent).toBe("")
    expect(out.internalThoughtContent).toContain("gue cari dulu")
  })
})
