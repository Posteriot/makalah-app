"use client"

import { useRouter } from "next/navigation"
import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { WaitlistForm } from "@/components/auth/WaitlistForm"

export default function WaitingListPage() {
  const router = useRouter()

  return (
    <AuthWideCard
      title="Daftar Waiting List"
      subtitle="Bergabunglah dengan waiting list, dan dapatkan akses eksklusif lebih awal!"
      showCloseButton
      onCloseClick={() => router.push("/")}
    >
      <WaitlistForm />
    </AuthWideCard>
  )
}
