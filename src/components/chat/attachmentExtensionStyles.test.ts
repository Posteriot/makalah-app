import { describe, expect, it } from "vitest"
import {
    EXTENSION_STYLES,
    resolveExtensionStyle,
} from "./attachmentExtensionStyles"

describe("resolveExtensionStyle", () => {
    describe("known extensions", () => {
        it("resolves .pdf to the PDF palette", () => {
            const style = resolveExtensionStyle("report.pdf")
            expect(style).toBe(EXTENSION_STYLES.pdf)
            expect(style.label).toBe("PDF")
        })

        it("is case-insensitive on the extension", () => {
            expect(resolveExtensionStyle("report.PDF")).toBe(
                EXTENSION_STYLES.pdf
            )
            expect(resolveExtensionStyle("report.Pdf")).toBe(
                EXTENSION_STYLES.pdf
            )
        })

        it("maps .doc and .docx to the same DOC palette label", () => {
            const doc = resolveExtensionStyle("draft.doc")
            const docx = resolveExtensionStyle("draft.docx")
            expect(doc).toBe(EXTENSION_STYLES.doc)
            expect(docx).toBe(EXTENSION_STYLES.docx)
            // Both resolve to the same visual "DOC" label even though the
            // keys in the record are distinct.
            expect(doc.label).toBe("DOC")
            expect(docx.label).toBe("DOC")
            expect(doc.bg).toBe(docx.bg)
            expect(doc.text).toBe(docx.text)
        })

        it("maps .xls and .xlsx to the same XLS palette label", () => {
            const xls = resolveExtensionStyle("sheet.xls")
            const xlsx = resolveExtensionStyle("sheet.xlsx")
            expect(xls.label).toBe("XLS")
            expect(xlsx.label).toBe("XLS")
            expect(xls.bg).toBe(xlsx.bg)
        })

        it("maps .ppt and .pptx to the same PPT palette label", () => {
            const ppt = resolveExtensionStyle("slides.ppt")
            const pptx = resolveExtensionStyle("slides.pptx")
            expect(ppt.label).toBe("PPT")
            expect(pptx.label).toBe("PPT")
            expect(ppt.bg).toBe(pptx.bg)
        })

        it("resolves .txt to the TXT palette", () => {
            const style = resolveExtensionStyle("notes.txt")
            expect(style.label).toBe("TXT")
            expect(style.bg).toContain("zinc")
        })

        it("resolves filenames with multiple dots by using the final extension", () => {
            expect(resolveExtensionStyle("archive.tar.pdf").label).toBe("PDF")
            expect(resolveExtensionStyle("name.with.dots.docx").label).toBe(
                "DOC"
            )
        })
    })

    describe("unknown extensions fall back", () => {
        it("returns the fallback palette with uppercase label for unknown short extensions", () => {
            const style = resolveExtensionStyle("notes.md")
            expect(style.label).toBe("MD")
            expect(style.bg).toContain("var(--chat-muted)")
            expect(style.text).toContain("var(--chat-muted-foreground)")
        })

        it("truncates overlong fallback labels to 4 characters", () => {
            const style = resolveExtensionStyle("data.tarball")
            expect(style.label).toBe("TARB")
            expect(style.label.length).toBeLessThanOrEqual(4)
        })

        it('returns label "FILE" when the file has no extension at all', () => {
            expect(resolveExtensionStyle("README").label).toBe("FILE")
            expect(resolveExtensionStyle("plain").label).toBe("FILE")
        })

        it('treats dotfiles like ".env" as having no extension (label "FILE")', () => {
            // `splitFileName` in @/lib/types/attached-file requires a dot at
            // index > 0 to recognize an extension, so leading-dot files fall
            // back to the generic FILE label. This test locks in that
            // behaviour so a later refactor of splitFileName cannot silently
            // regress the contract.
            expect(resolveExtensionStyle(".env").label).toBe("FILE")
            expect(resolveExtensionStyle(".gitignore").label).toBe("FILE")
        })

        it('returns label "FILE" for a trailing-dot filename with no extension after it', () => {
            expect(resolveExtensionStyle("weird.").label).toBe("FILE")
        })
    })

    describe("returned style shape", () => {
        it("always returns an object with bg, text, and label strings", () => {
            const samples = [
                "a.pdf",
                "b.docx",
                "c.md",
                "d",
                ".env",
                "multi.dot.xlsx",
            ]
            for (const name of samples) {
                const style = resolveExtensionStyle(name)
                expect(typeof style.bg).toBe("string")
                expect(typeof style.text).toBe("string")
                expect(typeof style.label).toBe("string")
                expect(style.bg.length).toBeGreaterThan(0)
                expect(style.text.length).toBeGreaterThan(0)
                expect(style.label.length).toBeGreaterThan(0)
            }
        })
    })
})
