import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import { render } from "@react-email/components"

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrandSettings {
  appName: string
  primaryColor: string
  secondaryColor: string
  backgroundColor: string
  contentBackgroundColor: string
  textColor: string
  mutedTextColor: string
  fontFamily: string
  footerText: string
  footerLinks: { label: string; url: string }[]
  logoUrl?: string
}

export interface EmailSection {
  id: string
  type: string // "heading" | "paragraph" | "button" | "divider" | "info_box" | "otp_code" | "detail_row"
  content?: string
  url?: string
  label?: string
  style?: {
    backgroundColor?: string
    textColor?: string
    fontSize?: string
    textAlign?: string
    padding?: string
  }
  rows?: { label: string; value: string }[]
}

// ---------------------------------------------------------------------------
// Dark mode CSS — static constant, NOT user input
// Adapts header, body, footer to system dark theme.
// Works in Apple Mail, iOS Mail, Outlook.com.
// Gmail ignores this (shows light mode default) — acceptable.
// ---------------------------------------------------------------------------

function DarkModeStyles() {
  return (
    <style>{`
      @media (prefers-color-scheme: dark) {
        .em-body { background-color: #0f172a !important; }
        .em-container { background-color: #1e293b !important; }
        .em-header { background-color: #0f172a !important; border-bottom-color: #334155 !important; }
        .em-header-light { display: none !important; }
        .em-header-dark { display: inline-block !important; }
        .em-heading { color: #f1f5f9 !important; }
        .em-text { color: #e2e8f0 !important; }
        .em-muted { color: #94a3b8 !important; }
        .em-divider { border-color: #334155 !important; }
        .em-info-box { background-color: #0f172a !important; border: 1px solid #334155 !important; }
        .em-footer-divider { border-color: #334155 !important; }
        .em-link { color: #60a5fa !important; }
        .em-otp { color: #f1f5f9 !important; }
        .em-detail-label { color: #94a3b8 !important; }
        .em-detail-value { color: #e2e8f0 !important; }
      }
    `}</style>
  )
}

// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

function mergeStyle(
  base: React.CSSProperties,
  override?: EmailSection["style"],
): React.CSSProperties {
  if (!override) return base
  const merged = { ...base }
  if (override.backgroundColor) merged.backgroundColor = override.backgroundColor
  if (override.textColor) merged.color = override.textColor
  if (override.fontSize) merged.fontSize = override.fontSize
  if (override.textAlign)
    merged.textAlign = override.textAlign as React.CSSProperties["textAlign"]
  if (override.padding) merged.padding = override.padding
  return merged
}

function renderSection(section: EmailSection, brand: BrandSettings): React.ReactNode {
  switch (section.type) {
    case "heading": {
      const style = mergeStyle(
        {
          color: brand.textColor,
          fontSize: "24px",
          fontWeight: "bold" as const,
          margin: "0 0 16px",
        },
        section.style,
      )
      return (
        <Heading key={section.id} className="em-heading" style={style}>
          {section.content ?? ""}
        </Heading>
      )
    }

    case "paragraph": {
      const style = mergeStyle(
        {
          color: brand.textColor,
          fontSize: "14px",
          lineHeight: "24px",
          margin: "0 0 16px",
        },
        section.style,
      )
      return (
        <Text key={section.id} className="em-text" style={style}>
          {section.content ?? ""}
        </Text>
      )
    }

    case "button": {
      const style = mergeStyle(
        {
          backgroundColor: brand.primaryColor,
          borderRadius: "8px",
          color: "#ffffff",
          fontSize: "14px",
          fontWeight: "600" as const,
          padding: "12px 24px",
          textDecoration: "none",
          textAlign: "center" as const,
          display: "inline-block" as const,
        },
        section.style,
      )
      return (
        <Button key={section.id} style={style} href={section.url ?? "#"}>
          {section.label ?? section.content ?? ""}
        </Button>
      )
    }

    case "divider": {
      return (
        <Hr
          key={section.id}
          className="em-divider"
          style={{ borderColor: "#e2e8f0", margin: "16px 0" }}
        />
      )
    }

    case "info_box": {
      const style = mergeStyle(
        {
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          padding: "16px",
          margin: "16px 0",
        },
        section.style,
      )
      return (
        <Section key={section.id} className="em-info-box" style={style}>
          <Text
            className="em-text"
            style={{
              color: brand.textColor,
              fontSize: "14px",
              lineHeight: "24px",
              margin: "0",
            }}
          >
            {section.content ?? ""}
          </Text>
        </Section>
      )
    }

    case "otp_code": {
      const style = mergeStyle(
        {
          fontFamily: "monospace",
          fontSize: "32px",
          fontWeight: "bold" as const,
          textAlign: "center" as const,
          letterSpacing: "0.3em",
          color: brand.textColor,
          margin: "16px 0",
        },
        section.style,
      )
      return (
        <Text key={section.id} className="em-otp" style={style}>
          {section.content ?? ""}
        </Text>
      )
    }

    case "detail_row": {
      if (!section.rows?.length) return null
      return (
        <Section
          key={section.id}
          style={{ margin: "16px 0" }}
        >
          {section.rows.map((row, i) => (
            <React.Fragment key={`${section.id}-row-${i}`}>
              <Text
                className="em-detail-label"
                style={{
                  color: brand.mutedTextColor,
                  fontSize: "12px",
                  fontWeight: "500" as const,
                  margin: "0 0 4px",
                  textTransform: "uppercase" as const,
                }}
              >
                {row.label}
              </Text>
              <Text
                className="em-detail-value"
                style={{
                  color: brand.textColor,
                  fontSize: "16px",
                  fontWeight: "600" as const,
                  margin: "0 0 16px",
                }}
              >
                {row.value}
              </Text>
            </React.Fragment>
          ))}
        </Section>
      )
    }

    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Email component
// ---------------------------------------------------------------------------

function EmailTemplate({
  brand,
  subject,
  sections,
  siteUrl,
}: {
  brand: BrandSettings
  subject: string
  sections: EmailSection[]
  siteUrl: string
}) {
  // Logo URLs — light mode (default) and dark mode (swapped via CSS)
  const logoIconLight = `${siteUrl}/logo/logo-color-lightmode.png`
  const logoIconDark = `${siteUrl}/logo/logo-color-darkmode.png`
  const brandTextLight = `${siteUrl}/logo/email-brand-text-black.png`
  const brandTextDark = `${siteUrl}/logo/email-brand-text-white.png`

  return (
    <Html>
      <Head>
        <DarkModeStyles />
      </Head>
      <Preview>{subject}</Preview>
      <Body
        className="em-body"
        style={{
          backgroundColor: brand.backgroundColor,
          fontFamily: brand.fontFamily,
          margin: "0",
          padding: "0",
        }}
      >
        <Container
          className="em-container"
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: brand.contentBackgroundColor,
          }}
        >
          {/* Header — adaptive light/dark via CSS image swap */}
          <Section
            className="em-header"
            style={{
              padding: "20px 32px",
              borderBottom: "1px solid #e2e8f0",
            }}
          >
            <table cellPadding="0" cellSpacing="0" role="presentation" style={{ margin: "0 auto" }}>
              <tbody>
                <tr>
                  <td style={{ paddingRight: "12px", verticalAlign: "middle" }}>
                    {/* Light mode icon (default) */}
                    <Img
                      className="em-header-light"
                      src={logoIconLight}
                      alt=""
                      width="28"
                      height="28"
                      style={{ borderRadius: "4px", display: "inline-block", verticalAlign: "middle" }}
                    />
                    {/* Dark mode icon (hidden by default, shown via CSS) */}
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
                    {/* Light mode brand text (default) */}
                    <Img
                      className="em-header-light"
                      src={brandTextLight}
                      alt="Makalah"
                      height="18"
                      style={{ display: "inline-block", verticalAlign: "middle" }}
                    />
                    {/* Dark mode brand text (hidden by default, shown via CSS) */}
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

          {/* Content sections */}
          <Section style={{ padding: "32px" }}>
            {sections.map((s) => renderSection(s, brand))}
          </Section>

          {/* Footer */}
          <Hr
            className="em-footer-divider"
            style={{ borderColor: "#e2e8f0", margin: "0" }}
          />
          <Section style={{ padding: "24px 32px" }}>
            <Text
              className="em-muted"
              style={{
                color: brand.mutedTextColor,
                fontSize: "12px",
                lineHeight: "16px",
                margin: "4px 0",
                textAlign: "center" as const,
              }}
            >
              {brand.footerText}
            </Text>
            {brand.footerLinks.length > 0 && (
              <Text
                className="em-muted"
                style={{
                  color: brand.mutedTextColor,
                  fontSize: "12px",
                  lineHeight: "16px",
                  margin: "4px 0",
                  textAlign: "center" as const,
                }}
              >
                {brand.footerLinks.map((link, i) => (
                  <React.Fragment key={link.url}>
                    {i > 0 && " | "}
                    <Link
                      href={link.url}
                      className="em-link"
                      style={{
                        color: brand.primaryColor,
                        textDecoration: "underline",
                      }}
                    >
                      {link.label}
                    </Link>
                  </React.Fragment>
                ))}
              </Text>
            )}
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function renderEmailTemplate(
  brandSettings: BrandSettings,
  subject: string,
  sections: EmailSection[],
  siteUrl?: string,
): Promise<string> {
  const resolvedSiteUrl = siteUrl ?? process.env.SITE_URL ?? "https://makalah.ai"
  const html = await render(
    <EmailTemplate
      brand={brandSettings}
      subject={subject}
      sections={sections}
      siteUrl={resolvedSiteUrl}
    />,
  )
  return html
}
