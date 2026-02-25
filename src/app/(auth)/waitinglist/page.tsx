"use client"

import dynamic from "next/dynamic"
import { useRouter } from "next/navigation"
import { AuthWideCard } from "@/components/auth/AuthWideCard"

const WaitlistForm = dynamic(
  () => import("@/components/auth/WaitlistForm").then((mod) => mod.WaitlistForm),
  { ssr: false }
)

export default function WaitingListPage() {
  const router = useRouter()

  return (
    <AuthWideCard
      title="Daftar Waiting List"
      subtitle="Bergabunglah dengan waiting list, dan dapatkan akses eksklusif lebih awal!"
      showBackButton
      onBackClick={() => router.back()}
      showCloseButton
      onCloseClick={() => router.push("/")}
    >
      <WaitlistForm />
    </AuthWideCard>
  )
}
