import {
  Button,
  Heading,
  Section,
  Text,
} from "@react-email/components"
import * as React from "react"
import { EmailLayout } from "./EmailLayout"

interface PaymentSuccessEmailProps {
  userName?: string
  amount: number
  newBalance: number
  transactionId: string
  paidAt: string
  appUrl?: string
}

export function PaymentSuccessEmail({
  userName = "Pengguna",
  amount,
  newBalance,
  transactionId,
  paidAt,
  appUrl = "https://makalah.ai",
}: PaymentSuccessEmailProps) {
  const formattedAmount = `Rp ${amount.toLocaleString("id-ID")}`
  const formattedBalance = `Rp ${newBalance.toLocaleString("id-ID")}`

  return (
    <EmailLayout preview={`Pembayaran ${formattedAmount} berhasil - saldo baru: ${formattedBalance}`}>
      {/* Greeting */}
      <Heading style={heading}>Pembayaran Berhasil!</Heading>
      <Text style={paragraph}>
        Halo {userName},
      </Text>
      <Text style={paragraph}>
        Terima kasih! Pembayaran top up credit Anda telah berhasil diproses.
      </Text>

      {/* Transaction Details */}
      <Section style={detailsBox}>
        <Text style={detailLabel}>Jumlah Top Up</Text>
        <Text style={detailValue}>{formattedAmount}</Text>

        <Text style={detailLabel}>Saldo Baru</Text>
        <Text style={detailValueHighlight}>{formattedBalance}</Text>

        <Text style={detailLabel}>ID Transaksi</Text>
        <Text style={detailValueMono}>{transactionId}</Text>

        <Text style={detailLabel}>Waktu Pembayaran</Text>
        <Text style={detailValue}>{paidAt}</Text>
      </Section>

      {/* CTA */}
      <Section style={ctaSection}>
        <Text style={paragraph}>
          Credit Anda sudah siap digunakan. Mulai menyusun paper akademik dengan bantuan AI sekarang!
        </Text>
        <Button style={button} href={`${appUrl}/chat`}>
          Mulai Menyusun Paper
        </Button>
      </Section>

      {/* Note */}
      <Text style={noteText}>
        Jika ada pertanyaan tentang transaksi ini, hubungi kami di support@makalah.ai
      </Text>
    </EmailLayout>
  )
}

// Styles
const heading: React.CSSProperties = {
  color: "#16a34a", // green-600
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
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  margin: "24px 0",
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

const detailValueHighlight: React.CSSProperties = {
  color: "#16a34a",
  fontSize: "20px",
  fontWeight: "bold",
  margin: "0 0 16px",
}

const detailValueMono: React.CSSProperties = {
  color: "#1f2937",
  fontSize: "14px",
  fontFamily: "monospace",
  margin: "0 0 16px",
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

const noteText: React.CSSProperties = {
  color: "#9ca3af",
  fontSize: "12px",
  lineHeight: "20px",
  margin: "24px 0 0",
  textAlign: "center" as const,
}

export default PaymentSuccessEmail
