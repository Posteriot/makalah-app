import { describe, expect, it } from "vitest"
import { validateComposeSubstantiveness } from "./orchestrator"

describe("validateComposeSubstantiveness", () => {
    it("returns true when sourceCount is 0", () => {
        expect(validateComposeSubstantiveness("short", 0)).toBe(true)
        expect(validateComposeSubstantiveness("", 0)).toBe(true)
    })

    it("returns false for short transitional text with sources", () => {
        expect(validateComposeSubstantiveness("Saya akan mencari informasi tentang topik ini.", 3)).toBe(false)
        expect(validateComposeSubstantiveness("   short   ", 1)).toBe(false)
        expect(validateComposeSubstantiveness("x".repeat(199), 2)).toBe(false)
    })

    it("returns true for substantive text with sources", () => {
        expect(validateComposeSubstantiveness("x".repeat(200), 3)).toBe(true)
        expect(validateComposeSubstantiveness("x".repeat(500), 1)).toBe(true)
    })

    it("returns false for empty text with sources", () => {
        expect(validateComposeSubstantiveness("", 5)).toBe(false)
        expect(validateComposeSubstantiveness("   ", 2)).toBe(false)
    })

    it("handles boundary at exactly 200 characters", () => {
        expect(validateComposeSubstantiveness("a".repeat(200), 1)).toBe(true)
        expect(validateComposeSubstantiveness("a".repeat(199), 1)).toBe(false)
    })
})
