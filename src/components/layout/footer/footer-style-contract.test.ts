import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"

const projectRoot = resolve(import.meta.dirname, "../../..")
const globalsNewCss = readFileSync(resolve(projectRoot, "app/globals-new.css"), "utf8")
const footerComponent = readFileSync(resolve(projectRoot, "components/layout/footer/Footer.tsx"), "utf8")
const marketingLayout = readFileSync(resolve(projectRoot, "app/(marketing)/layout.tsx"), "utf8")
const dashboardLayout = readFileSync(resolve(projectRoot, "app/(dashboard)/layout.tsx"), "utf8")

describe("footer style contract", () => {
  it("mendefinisikan utility footer scoped core di globals-new.css", () => {
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-shell')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-surface')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-grid')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-links-grid')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-divider')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-meta')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-social-link')
    expect(globalsNewCss).toContain('[data-ui-scope="core"] .footer-icon')
  })

  it("merender footer dengan utility scoped core, bukan utility legacy generik", () => {
    expect(footerComponent).toContain('className="footer-shell"')
    expect(footerComponent).toContain('className="footer-surface"')
    expect(footerComponent).toContain('className="footer-grid"')
    expect(footerComponent).toContain('className="footer-links-grid"')
    expect(footerComponent).toContain('className="footer-divider"')
    expect(footerComponent).toContain('className="footer-meta"')
    expect(footerComponent).toContain('className="footer-social-link"')
    expect(footerComponent).toContain('className="footer-icon"')
    expect(footerComponent).not.toContain('className="icon-interface"')
    expect(footerComponent).not.toContain("rounded-action")
  })

  it("tidak membungkus footer dengan suspense yang tidak pernah suspend", () => {
    expect(marketingLayout).toContain("<Footer />")
    expect(marketingLayout).not.toContain('h-[208px] md:h-[248px]')

    expect(dashboardLayout).toContain("<Footer />")
    expect(dashboardLayout).not.toContain('h-[208px] md:h-[248px]')
  })
})
