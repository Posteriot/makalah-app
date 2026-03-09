import {
  Body,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"

const colors = {
  background: "#f8fafc",
  contentBackground: "#ffffff",
  text: "#1e293b",
  textMuted: "#64748b",
  border: "#e2e8f0",
  primary: "#2563eb",
}

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
  siteUrl?: string
}

function DarkModeStyles() {
  return (
    <style>{`
      @media (prefers-color-scheme: dark) {
        .em-body { background-color: #0f172a !important; }
        .em-container { background-color: #1e293b !important; }
        .em-header { background-color: #0f172a !important; border-bottom-color: #334155 !important; }
        .em-header-light { display: none !important; }
        .em-header-dark { display: inline-block !important; }
        .em-text { color: #e2e8f0 !important; }
        .em-muted { color: #94a3b8 !important; }
        .em-divider { border-color: #334155 !important; }
        .em-link { color: #60a5fa !important; }
      }
    `}</style>
  )
}

export function EmailLayout({ preview, children, siteUrl }: EmailLayoutProps) {
  const base = siteUrl ?? process.env.SITE_URL ?? "https://makalah.ai"
  const logoIconLight = `${base}/logo/logo-color-lightmode.png`
  const logoIconDark = `${base}/logo/logo-color-darkmode.png`
  const brandTextLight = `${base}/logo/email-brand-text-black.png`
  const brandTextDark = `${base}/logo/email-brand-text-white.png`

  return (
    <Html>
      <Head>
        <DarkModeStyles />
      </Head>
      <Preview>{preview}</Preview>
      <Body className="em-body" style={main}>
        <Container className="em-container" style={container}>
          {/* Header — adaptive light/dark */}
          <Section className="em-header" style={header}>
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "0 auto" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "12px", verticalAlign: "middle" }}>
                    <Img
                      className="em-header-light"
                      src={logoIconLight}
                      alt=""
                      width="28"
                      height="28"
                      style={{ borderRadius: "4px", display: "inline-block", verticalAlign: "middle" }}
                    />
                    <Img
                      className="em-header-dark"
                      src={logoIconDark}
                      alt=""
                      width="28"
                      height="28"
                      style={{ borderRadius: "4px", display: "none", verticalAlign: "middle" }}
                    />
                  </td>
                  <td style={{ verticalAlign: "middle" }}>
                    <Img
                      className="em-header-light"
                      src={brandTextLight}
                      alt="Makalah"
                      height="18"
                      style={{ display: "inline-block", verticalAlign: "middle" }}
                    />
                    <Img
                      className="em-header-dark"
                      src={brandTextDark}
                      alt="Makalah"
                      height="18"
                      style={{ display: "none", verticalAlign: "middle" }}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr className="em-divider" style={hr} />
          <Section style={footer}>
            <Text className="em-muted" style={footerTextStyle}>
              Email ini dikirim oleh Makalah AI
            </Text>
            <Text className="em-muted" style={footerTextStyle}>
              <Link href="https://makalah.ai" className="em-link" style={footerLink}>
                makalah.ai
              </Link>
              {" | "}
              <Link href="https://makalah.ai/documentation" className="em-link" style={footerLink}>
                Bantuan
              </Link>
            </Text>
            <Text className="em-muted" style={copyrightStyle}>
              &copy; {new Date().getFullYear()} Makalah AI. All rights reserved.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// Styles
const main: React.CSSProperties = {
  backgroundColor: colors.background,
  fontFamily:
    'Geist, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
  margin: "0",
  padding: "0",
}

const container: React.CSSProperties = {
  backgroundColor: colors.contentBackground,
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

const header: React.CSSProperties = {
  padding: "20px 32px",
  borderBottom: `1px solid ${colors.border}`,
}

const content: React.CSSProperties = {
  padding: "32px",
}

const hr: React.CSSProperties = {
  borderColor: colors.border,
  margin: "0",
}

const footer: React.CSSProperties = {
  padding: "24px 32px",
}

const footerTextStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "12px",
  lineHeight: "16px",
  margin: "4px 0",
  textAlign: "center" as const,
}

const footerLink: React.CSSProperties = {
  color: colors.primary,
  textDecoration: "underline",
}

const copyrightStyle: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "11px",
  lineHeight: "16px",
  margin: "16px 0 0",
  textAlign: "center" as const,
}

export default EmailLayout
