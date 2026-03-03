import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

const read = (relativePath: string) =>
  readFileSync(path.join(process.cwd(), relativePath), "utf8")

describe("hero CMS CTA delegation smoke", () => {
  it("mendelegasikan CTA ke HeroCTA dengan props CMS", () => {
    const source = read("src/components/marketing/hero/HeroCMS.tsx")

    expect(source).toContain("<HeroCTA ctaText={content.ctaText} signedOutHref={content.ctaHref} />")
    expect(source).not.toContain("SectionCTA href={content.ctaHref}")
  })
})
