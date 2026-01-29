"use client"

import "@/app/admin-styles.css"
import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { UserList } from "./UserList"
import { SystemPromptsManager } from "./SystemPromptsManager"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { AIProviderManager } from "./AIProviderManager"
import { StyleConstitutionManager } from "./StyleConstitutionManager"
import { WaitlistManager } from "./WaitlistManager"
import { Monitor, Menu, X, LayoutDashboard, CheckCircle2, UserCog, UserPlus } from "lucide-react"
import type { Id } from "@convex/_generated/dataModel"
import type { LucideIcon } from "lucide-react"
import {
  Users,
  FileText,
  Cpu,
  PencilLine,
  BarChart3,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface AdminPanelContainerProps {
  userId: Id<"users">
  userRole: "superadmin" | "admin" | "user"
}

interface SidebarItem {
  id: string
  label: string
  icon: LucideIcon
  headerTitle: string
  headerDescription: string
  headerIcon: LucideIcon
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: LayoutDashboard,
    headerTitle: "Admin Panel",
    headerDescription: "Kelola pengguna dan lihat statistik aplikasi",
    headerIcon: Monitor,
  },
  {
    id: "users",
    label: "User Management",
    icon: Users,
    headerTitle: "User Management",
    headerDescription: "Kelola pengguna dan hak akses",
    headerIcon: Users,
  },
  {
    id: "prompts",
    label: "System Prompts",
    icon: FileText,
    headerTitle: "System Prompts",
    headerDescription: "Kelola system prompt untuk AI",
    headerIcon: FileText,
  },
  {
    id: "providers",
    label: "AI Providers",
    icon: Cpu,
    headerTitle: "AI Providers",
    headerDescription: "Konfigurasi provider dan model AI",
    headerIcon: Cpu,
  },
  {
    id: "refrasa",
    label: "Refrasa",
    icon: PencilLine,
    headerTitle: "Refrasa",
    headerDescription: "Kelola style constitution untuk tool Refrasa",
    headerIcon: PencilLine,
  },
  {
    id: "waitlist",
    label: "Waiting List",
    icon: UserPlus,
    headerTitle: "Waiting List",
    headerDescription: "Kelola pendaftar waiting list dan kirim undangan",
    headerIcon: UserPlus,
  },
  {
    id: "stats",
    label: "Statistik",
    icon: BarChart3,
    headerTitle: "Statistik",
    headerDescription: "Lihat statistik penggunaan aplikasi",
    headerIcon: BarChart3,
  },
]

type TabId = SidebarItem["id"]

function AdminSidebar({
  activeTab,
  onTabChange,
  isOpen,
  onClose,
}: {
  activeTab: TabId
  onTabChange: (tab: TabId) => void
  isOpen: boolean
  onClose: () => void
}) {
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-0",
          "w-[200px] bg-sidebar border-r border-sidebar-border",
          "transform transition-transform duration-200 ease-in-out",
          "md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-4 border-b border-border md:hidden">
          <span className="font-semibold text-sm">Menu</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-accent rounded"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-2 pt-6 space-y-1">
          {SIDEBAR_ITEMS.map((item) => {
            const isActive = activeTab === item.id
            const Icon = item.icon

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id)
                  onClose()
                }}
                className={cn(
                  "relative w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors text-left",
                  "hover:bg-accent",
                  isActive
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] bg-primary rounded-r" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

// Overview Content Component
function AdminOverviewContent({
  users,
  onNavigate,
}: {
  users: Array<{
    _id: Id<"users">
    email: string
    firstName?: string
    lastName?: string
    role: "superadmin" | "admin" | "user"
    subscriptionStatus?: string
    isVerified?: boolean
  }>
  onNavigate: (tab: string) => void
}) {
  // Calculate user stats
  const totalUsers = users.length
  const superadminCount = users.filter((u) => u.role === "superadmin").length
  const adminCount = users.filter((u) => u.role === "admin").length
  const userCount = users.filter((u) => u.role === "user").length

  // Calculate tier stats
  const gratisCount = users.filter(
    (u) => !u.subscriptionStatus || u.subscriptionStatus === "free" || u.subscriptionStatus === "gratis"
  ).length
  const bppCount = users.filter((u) => u.subscriptionStatus === "bpp").length
  const proCount = users.filter((u) => u.subscriptionStatus === "pro").length

  return (
    <div className="space-y-6">
      {/* Top Cards: System Status + User Summary - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* System Status Card */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Status Sistem
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-emerald-600">
                  NORMAL
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Semua sistem berjalan normal
              </p>
            </div>
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          </div>
          <button
            onClick={() => onNavigate("prompts")}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            <FileText className="h-4 w-4" />
            Lihat System Prompts
          </button>
        </div>

        {/* User Summary Card */}
        <div className="bg-card border border-border rounded-lg p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Total Pengguna
              </p>
              <p className="text-2xl font-semibold mt-1">{totalUsers}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Pengguna terdaftar di platform
              </p>
            </div>
            <Users className="h-5 w-5 text-muted-foreground" />
          </div>
          <button
            onClick={() => onNavigate("users")}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-md hover:bg-primary/90 transition-colors"
          >
            <UserCog className="h-4 w-4" />
            Kelola Users
          </button>
        </div>
      </div>

      {/* User by Role Card */}
      <div className="bg-card border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">Pengguna Berdasarkan Role</h2>
          <span className="text-xs text-muted-foreground">Total: {totalUsers}</span>
        </div>

        {/* Progress Bar Visual */}
        <div className="relative h-3 bg-muted rounded-full overflow-hidden mb-4">
          {totalUsers > 0 && (
            <>
              <div
                className="absolute left-0 top-0 h-full bg-red-500"
                style={{ width: `${(superadminCount / totalUsers) * 100}%` }}
              />
              <div
                className="absolute top-0 h-full bg-zinc-600"
                style={{
                  left: `${(superadminCount / totalUsers) * 100}%`,
                  width: `${(adminCount / totalUsers) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full bg-zinc-400"
                style={{
                  left: `${((superadminCount + adminCount) / totalUsers) * 100}%`,
                  width: `${(userCount / totalUsers) * 100}%`,
                }}
              />
            </>
          )}
        </div>

        {/* Legend */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div>
              <span className="font-medium">{superadminCount}</span>
              <span className="text-muted-foreground ml-1">Superadmin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-600" />
            <div>
              <span className="font-medium">{adminCount}</span>
              <span className="text-muted-foreground ml-1">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-zinc-400" />
            <div>
              <span className="font-medium">{userCount}</span>
              <span className="text-muted-foreground ml-1">User</span>
            </div>
          </div>
        </div>
      </div>

      {/* User by Tier Card */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-medium">Pengguna Berdasarkan Tier</h2>
        </div>

        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-emerald-600">
                GRATIS
              </span>
              <span className="text-sm">Tier dasar dengan limit</span>
            </div>
            <span className="text-sm font-semibold">{gratisCount}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-blue-600">
                BPP
              </span>
              <span className="text-sm">Bayar Per Paper</span>
            </div>
            <span className="text-sm font-semibold">{bppCount}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-3 hover:bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-0.5 rounded text-white bg-amber-600">
                PRO
              </span>
              <span className="text-sm">Langganan premium</span>
            </div>
            <span className="text-sm font-semibold">{proCount}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions / Admin Guide Card */}
      <div className="bg-muted/30 border border-border rounded-lg p-4">
        <h3 className="font-medium mb-3">Panduan Admin Panel</h3>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-primary font-medium">1.</span>
            <span>
              <strong>User Management:</strong> Promote/demote user ke admin, lihat status verifikasi
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-medium">2.</span>
            <span>
              <strong>System Prompts:</strong> Kelola prompt AI global untuk semua user
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-medium">3.</span>
            <span>
              <strong>AI Providers:</strong> Konfigurasi model dan fallback provider
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary font-medium">4.</span>
            <span>
              <strong>Refrasa:</strong> Kelola style constitution untuk tool parafrase
            </span>
          </li>
        </ul>
      </div>
    </div>
  )
}

export function AdminPanelContainer({
  userId,
  userRole,
}: AdminPanelContainerProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const users = useQuery(api.users.listAllUsers, { requestorUserId: userId })

  // Get current tab info for dynamic header
  const currentTab = SIDEBAR_ITEMS.find((item) => item.id === activeTab) || SIDEBAR_ITEMS[0]
  const HeaderIcon = currentTab.headerIcon

  if (users === undefined) {
    return (
      <div className="admin-container max-w-[1400px] mx-auto">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container max-w-[1400px] mx-auto">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center gap-3 p-4 border-b border-border">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-accent rounded-md"
        >
          <Menu className="h-5 w-5" />
        </button>
        <span className="font-semibold">Admin Panel</span>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="admin-body grid grid-cols-1 md:grid-cols-[200px_1fr] min-h-[calc(100vh-var(--header-h)-var(--footer-h)-48px)] overflow-hidden">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content */}
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          {/* Dynamic Page Header */}
          <div className="mb-6">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <HeaderIcon className="h-5 w-5 text-primary" />
              {currentTab.headerTitle}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentTab.headerDescription}
            </p>
          </div>

          {/* Tab Content */}
          {activeTab === "overview" && (
            <AdminOverviewContent users={users} onNavigate={setActiveTab} />
          )}

          {activeTab === "users" && (
            <UserList users={users} currentUserRole={userRole} />
          )}

          {activeTab === "prompts" && (
            <div className="space-y-6">
              <SystemHealthPanel userId={userId} />
              <SystemPromptsManager userId={userId} />
            </div>
          )}

          {activeTab === "providers" && (
            <div className="space-y-6">
              <AIProviderManager userId={userId} />
            </div>
          )}

          {activeTab === "refrasa" && (
            <div className="space-y-6">
              <StyleConstitutionManager userId={userId} />
            </div>
          )}

          {activeTab === "waitlist" && (
            <WaitlistManager userId={userId} />
          )}

          {activeTab === "stats" && (
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
          )}
        </div>
      </div>
    </div>
  )
}
