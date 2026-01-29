import {
  Body,
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

// Brand colors from app
const colors = {
  primary: "#2563eb", // blue-600
  primaryDark: "#1d4ed8", // blue-700
  background: "#ffffff",
  text: "#1f2937", // gray-800
  textMuted: "#6b7280", // gray-500
  border: "#e5e7eb", // gray-200
  success: "#16a34a", // green-600
  error: "#dc2626", // red-600
}

interface EmailLayoutProps {
  preview: string
  children: React.ReactNode
}

export function EmailLayout({ preview, children }: EmailLayoutProps) {
  return (
    <Html>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={logo}>Makalah AI</Heading>
          </Section>

          {/* Content */}
          <Section style={content}>{children}</Section>

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              Email ini dikirim oleh Makalah AI
            </Text>
            <Text style={footerText}>
              <Link href="https://makalah.ai" style={footerLink}>
                makalah.ai
              </Link>
              {" | "}
              <Link href="https://makalah.ai/documentation" style={footerLink}>
                Bantuan
              </Link>
            </Text>
            <Text style={copyright}>
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
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
}

const container: React.CSSProperties = {
  backgroundColor: colors.background,
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  maxWidth: "600px",
}

const header: React.CSSProperties = {
  padding: "24px 32px",
  borderBottom: `1px solid ${colors.border}`,
}

const logo: React.CSSProperties = {
  color: colors.primary,
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0",
  textAlign: "center" as const,
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

const footerText: React.CSSProperties = {
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

const copyright: React.CSSProperties = {
  color: colors.textMuted,
  fontSize: "11px",
  lineHeight: "16px",
  margin: "16px 0 0",
  textAlign: "center" as const,
}

export default EmailLayout
