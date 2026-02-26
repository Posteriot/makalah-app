import { describe, expect, it } from "vitest"
import { isCompileDaftarPustakaIntent } from "@/lib/ai/paper-search-helpers"

describe("chat route compile intent detection", () => {
  it("mendeteksi intent compile daftar pustaka dari perintah natural", () => {
    expect(isCompileDaftarPustakaIntent("tolong compile daftar pustaka sekarang")).toBe(true)
    expect(isCompileDaftarPustakaIntent("lakukan kompilasi daftar pustaka mode preview")).toBe(true)
    expect(isCompileDaftarPustakaIntent("jalankan compileDaftarPustaka mode persist")).toBe(true)
  })

  it("tidak false-positive untuk request search biasa", () => {
    expect(isCompileDaftarPustakaIntent("cari referensi terbaru tentang AI untuk pendahuluan")).toBe(false)
    expect(isCompileDaftarPustakaIntent("tolong web search literatur tambahan")).toBe(false)
    expect(isCompileDaftarPustakaIntent("susun ringkasan diskusi")).toBe(false)
  })
})
