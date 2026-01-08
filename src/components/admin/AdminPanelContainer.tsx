"use client"

import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserList } from "./UserList"
import { SystemPromptsManager } from "./SystemPromptsManager"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { AIProviderManager } from "./AIProviderManager"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Id } from "@convex/_generated/dataModel"

interface AdminPanelContainerProps {
  userId: Id<"users">
  userRole: "superadmin" | "admin" | "user"
}

export function AdminPanelContainer({
  userId,
  userRole,
}: AdminPanelContainerProps) {
  const users = useQuery(api.users.listAllUsers, { requestorUserId: userId })

  if (users === undefined) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Admin Panel</h1>
        <p className="text-muted-foreground mt-2">
          Kelola pengguna dan lihat statistik aplikasi
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">User Management</TabsTrigger>
          <TabsTrigger value="system-prompts">System Prompts</TabsTrigger>
          <TabsTrigger value="ai-providers">AI Providers</TabsTrigger>
          <TabsTrigger value="stats">Statistik</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserList users={users} currentUserRole={userRole} />
        </TabsContent>

        <TabsContent value="system-prompts" className="space-y-4">
          <SystemHealthPanel userId={userId} />
          <SystemPromptsManager userId={userId} />
        </TabsContent>

        <TabsContent value="ai-providers" className="space-y-4">
          <AIProviderManager userId={userId} />
        </TabsContent>

        <TabsContent value="stats" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Statistik</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Fitur statistik akan segera hadir.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
