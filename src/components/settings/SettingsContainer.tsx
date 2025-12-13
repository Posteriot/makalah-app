"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { RoleBadge } from "@/components/admin/RoleBadge"
import { EmailVerificationBanner } from "./EmailVerificationBanner"
import { ProfileForm } from "./ProfileForm"
import type { Id } from "@convex/_generated/dataModel"

interface SettingsContainerProps {
  user: {
    _id: Id<"users">
    email: string
    role: string
    firstName?: string
    lastName?: string
    emailVerified: boolean
    subscriptionStatus: string
  }
}

export function SettingsContainer({ user }: SettingsContainerProps) {
  return (
    <div className="max-w-2xl mx-auto space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Pengaturan Akun</h1>
        <p className="text-muted-foreground mt-2">
          Kelola profil dan preferensi akun Anda
        </p>
      </div>

      {!user.emailVerified && <EmailVerificationBanner />}

      <Card>
        <CardHeader>
          <CardTitle>Status Akun</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Email:</span>
            <span className="text-sm text-muted-foreground">{user.email}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Role:</span>
            <RoleBadge role={user.role as "superadmin" | "admin" | "user"} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Subscription:</span>
            <span className="text-sm text-muted-foreground capitalize">
              {user.subscriptionStatus}
            </span>
          </div>
        </CardContent>
      </Card>

      <ProfileForm user={user} />
    </div>
  )
}
