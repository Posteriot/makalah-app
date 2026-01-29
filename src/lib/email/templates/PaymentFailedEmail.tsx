import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import { EmailLayout } from "./EmailLayout"

interface PaymentFailedEmailProps {
  userName?: string
  amount: number
  failureReason?: string
  transactionId: string
  appUrl?: string
}

export function PaymentFailedEmail({
  userName = "Pengguna",
  amount,
  failureReason,
  transactionId,
  appUrl = "https://makalah.ai",
}: PaymentFailedEmailProps) {
  const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`

  // Translate common failure reasons
  const getReadableReason = (reason?: string): string => {
    if (!reason) return "Pembayaran tidak dapat diproses"
    const reasons: Record<string, string> = {
      INSUFFICIENT_FUNDS: "Saldo tidak mencukupi",
      CARD_DECLINED: "Kartu ditolak",
      EXPIRED_CARD: "Kartu sudah kadaluarsa",
      INVALID_ACCOUNT: "Akun tidak valid",
      TIMEOUT: "Waktu pembayaran habis",
      USER_CANCELLED: "Dibatalkan oleh pengguna",
    }
    return reasons[reason] || reason
  }

  return (
    <EmailLayout preview={`Pembayaran ${formattedAmount} gagal - coba lagi`}>
      {/* Greeting */}
      <Heading style={heading}>Pembayaran Gagal</Heading>
      <Text style={paragraph}>
        Halo {userName},
      </Text>
      <Text style={paragraph}>
        Mohon maaf, pembayaran top up credit Anda tidak dapat diproses.
      </Text>

      {/* Transaction Details */}
      <Section style={detailsBox}>
        <Text style={detailLabel}>Jumlah</Text>
        <Text style={detailValue}>{formattedAmount}</Text>

        <Text style={detailLabel}>Alasan Gagal</Text>
        <Text style={detailValueError}>{getReadableReason(failureReason)}</Text>

        <Text style={detailLabel}>ID Transaksi</Text>
        <Text style={detailValueMono}>{transactionId}</Text>
      </Section>

      {/* CTA */}
      <Section style={ctaSection}>
        <Text style={paragraph}>
          Anda bisa mencoba kembali dengan metode pembayaran yang berbeda atau pastikan saldo mencukupi.
        </Text>
        <Button style={button} href={`${appUrl}/subscription/plans`}>
          Coba Lagi
        </Button>
      </Section>

      {/* Help */}
      <Section style={helpBox}>
        <Text style={helpTitle}>Butuh Bantuan?</Text>
        <Text style={helpText}>
          Jika masalah berlanjut, hubungi kami di support@makalah.ai dengan menyertakan ID transaksi di atas.
        </Text>
      </Section>
    </EmailLayout>
  )
}

// Styles
const heading: React.CSSProperties = {
  color: "#dc2626", // red-600
  fontSize: "24px",
  fontWeight: "bold",
  margin: "0 0 16px",
  textAlign: "center" as const,
}

const paragraph: React.CSSProperties = {
  color: "#1f2937",
  fontSize: "14px",
  lineHeight: "24px",
  margin: "0 0 16px",
}

const detailsBox: React.CSSProperties = {
  backgroundColor: "#fef2f2", // red-50
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
  borderLeft: "4px solid #dc2626",
}

const detailLabel: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "500",
  margin: "0 0 4px",
  textTransform: "uppercase" as const,
}

const detailValue: React.CSSProperties = {
  color: "#1f2937",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px",
}

const detailValueError: React.CSSProperties = {
  color: "#dc2626",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 16px",
}

const detailValueMono: React.CSSProperties = {
  color: "#1f2937",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0",
}

const ctaSection: React.CSSProperties = {
  textAlign: "center" as const,
  margin: "32px 0",
}

const button: React.CSSProperties = {
  backgroundColor: "#2563eb",
  borderRadius: "8px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  padding: "12px 24px",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
}

const helpBox: React.CSSProperties = {
  backgroundColor: "#f3f4f6",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0 0",
}

const helpTitle: React.CSSProperties = {
  color: "#1f2937",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 8px",
}

const helpText: React.CSSProperties = {
  color: "#6b7280",
  fontSize: "13px",
  lineHeight: "20px",
  margin: "0",
}

export default PaymentFailedEmail
