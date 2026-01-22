"use client"

import "@/app/admin-styles.css"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { UserList } from "./UserList"
import { SystemPromptsManager } from "./SystemPromptsManager"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { AIProviderManager } from "./AIProviderManager"
import { StyleConstitutionManager } from "./StyleConstitutionManager"
import { Monitor } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import {
  Users,
  FileText,
  Cpu,
  PencilLine,
  BarChart3,
} from "lucide-react"

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
      <div className="admin-container">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      {/* Admin Panel Header */}
      <div className="admin-header">
        <h1 className="admin-title">
          <Monitor className="admin-title-icon text-foreground" />
          Admin Panel
        </h1>
        <p className="admin-description">
          Kelola pengguna dan lihat statistik aplikasi
        </p>
      </div>

      {/* Admin Panel Body (Sidebar + Content) */}
      <Tabs defaultValue="users" className="admin-body">
        <aside className="admin-sidebar">
          <TabsList className="sidebar-nav">
            <TabsTrigger value="users" className="sidebar-nav-item">
              <Users className="sidebar-icon" />
              <span>User Management</span>
            </TabsTrigger>
            <TabsTrigger value="prompts" className="sidebar-nav-item">
              <FileText className="sidebar-icon" />
              <span>System Prompts</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="sidebar-nav-item">
              <Cpu className="sidebar-icon" />
              <span>AI Providers</span>
            </TabsTrigger>
            <TabsTrigger value="refrasa" className="sidebar-nav-item">
              <PencilLine className="sidebar-icon" />
              <span>Refrasa</span>
            </TabsTrigger>
            <TabsTrigger value="stats" className="sidebar-nav-item">
              <BarChart3 className="sidebar-icon" />
              <span>Statistik</span>
            </TabsTrigger>
          </TabsList>
        </aside>

        <div className="admin-content">
          {/* Panel: User Management */}
          <TabsContent value="users" className="content-panel mt-0">
            <UserList users={users} currentUserRole={userRole} />
          </TabsContent>

          {/* Panel: System Prompts */}
          <TabsContent value="prompts" className="content-panel mt-0 space-y-6">
            <SystemHealthPanel userId={userId} />
            <SystemPromptsManager userId={userId} />
          </TabsContent>

          {/* Panel: AI Providers */}
          <TabsContent value="providers" className="content-panel mt-0 space-y-6">
            <AIProviderManager userId={userId} />
          </TabsContent>

          {/* Panel: Refrasa */}
          <TabsContent value="refrasa" className="content-panel mt-0 space-y-6">
            <StyleConstitutionManager userId={userId} />
          </TabsContent>

          {/* Panel: Statistik */}
          <TabsContent value="stats" className="content-panel mt-0">
            <div className="card card--placeholder">
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                  <BarChart3 className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fitur Statistik</h3>
                <p className="text-sm text-muted-foreground max-w-md mb-4">
                  Fitur statistik akan segera hadir. Anda akan dapat melihat analitik penggunaan aplikasi, statistik pengguna, dan metrik performa.
                </p>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  Coming Soon
                </span>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
