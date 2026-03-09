import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
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
        <Heading key={section.id} style={style}>
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
        <Text key={section.id} style={style}>
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
      return <Hr key={section.id} style={{ borderColor: "#e5e7eb", margin: "16px 0" }} />
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
        <Section key={section.id} style={style}>
          <Text
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
        <Text key={section.id} style={style}>
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
}: {
  brand: BrandSettings
  subject: string
  sections: EmailSection[]
}) {
  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body
        style={{
          backgroundColor: brand.backgroundColor,
          fontFamily: brand.fontFamily,
        }}
      >
        <Container
          style={{
            maxWidth: "600px",
            margin: "0 auto",
            backgroundColor: brand.contentBackgroundColor,
          }}
        >
          {/* Header */}
          <Section
            style={{
              padding: "24px 32px",
              borderBottom: "1px solid #e5e7eb",
            }}
          >
            <Heading
              style={{
                color: brand.primaryColor,
                fontSize: "24px",
                fontWeight: "bold",
                margin: "0",
                textAlign: "center" as const,
              }}
            >
              {brand.appName}
            </Heading>
          </Section>

          {/* Content sections */}
          <Section style={{ padding: "32px" }}>
            {sections.map((s) => renderSection(s, brand))}
          </Section>

          {/* Footer */}
          <Hr style={{ borderColor: "#e5e7eb", margin: "0" }} />
          <Section style={{ padding: "24px 32px" }}>
            <Text
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
): Promise<string> {
  const html = await render(
    <EmailTemplate brand={brandSettings} subject={subject} sections={sections} />,
  )
  return html
}
