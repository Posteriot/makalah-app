"use client"

import { AuthWideCard } from "@/components/auth/AuthWideCard"
import { WaitlistForm } from "@/components/auth/WaitlistForm"

export default function WaitingListPage() {
  return (
    <AuthWideCard
      title="Daftar Waiting List"
      subtitle="Bergabunglah dengan waiting list, dan dapatkan akses eksklusif lebih awal!"
    >
      <WaitlistForm />
    </AuthWideCard>
  )
}
