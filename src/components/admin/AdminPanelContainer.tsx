"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import { UserList } from "./UserList"
import { SystemPromptsManager } from "./SystemPromptsManager"
import { SystemHealthPanel } from "./SystemHealthPanel"
import { AIProviderManager } from "./AIProviderManager"
import { StyleConstitutionManager } from "./StyleConstitutionManager"
import { WaitlistManager } from "./WaitlistManager"
import type { Id } from "@convex/_generated/dataModel"
import {
  Computer,
  Menu,
  Xmark,
  Dashboard,
  CheckCircle,
  Settings,
  UserPlus,
  Group,
  Page,
  Cpu,
  EditPencil,
  StatsReport,
} from "iconoir-react"
import type { ComponentType, SVGProps } from "react"

// Iconoir icon type for dynamic rendering
type IconoirIcon = ComponentType<SVGProps<SVGSVGElement>>
import { cn } from "@/lib/utils"

interface AdminPanelContainerProps {
  userId: Id<"users">
  userRole: "superadmin" | "admin" | "user"
}

interface SidebarItem {
  id: string
  label: string
  icon: IconoirIcon
  headerTitle: string
  headerDescription: string
  headerIcon: IconoirIcon
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  {
    id: "overview",
    label: "Overview",
    icon: Dashboard,
    headerTitle: "Admin Panel",
    headerDescription: "Kelola pengguna dan lihat statistik aplikasi",
    headerIcon: Computer,
  },
  {
    id: "users",
    label: "User Management",
    icon: Group,
    headerTitle: "User Management",
    headerDescription: "Kelola pengguna dan hak akses",
    headerIcon: Group,
  },
  {
    id: "prompts",
    label: "System Prompts",
    icon: Page,
    headerTitle: "System Prompts",
    headerDescription: "Kelola system prompt untuk AI",
    headerIcon: Page,
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
    icon: EditPencil,
    headerTitle: "Refrasa",
    headerDescription: "Kelola style constitution untuk tool Refrasa",
    headerIcon: EditPencil,
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
    icon: StatsReport,
    headerTitle: "Statistik",
    headerDescription: "Lihat statistik penggunaan aplikasi",
    headerIcon: StatsReport,
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

      {/* Sidebar - Mechanical Grace: Slate bg, hairline border */}
      <aside
        className={cn(
          "fixed md:relative top-0 left-0 h-full md:h-auto z-50 md:z-0",
          "w-[220px] md:w-auto md:col-span-3 bg-slate-900 border-r border-hairline",
          "transform transition-transform duration-200 ease-in-out",
          "md:transform-none",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Mobile Close Button */}
        <div className="flex items-center justify-between p-3 border-b border-hairline md:hidden">
          <span className="font-mono text-xs font-medium uppercase tracking-wide text-slate-400">Menu</span>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-800 rounded-action transition-colors focus-ring"
          >
            <Xmark className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation - Dense padding */}
        <nav className="p-1.5 pt-4 space-y-0.5">
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
                  "relative w-full flex items-center gap-2.5 px-2.5 py-2 rounded-action text-xs font-medium transition-colors text-left",
                  "hover:bg-slate-800",
                  isActive
                    ? "bg-slate-800 text-amber-500"
                    : "text-slate-400"
                )}
              >
                {/* Active indicator - Amber */}
                {isActive && (
                  <span className="absolute left-0 top-1.5 bottom-1.5 w-[2px] bg-amber-500 rounded-r" />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                <span className="font-mono">{item.label}</span>
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
    <div className="space-y-4">
      {/* Top Cards: System Status + User Summary - 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* System Status Card - Mechanical Grace: Slate bg, hairline border */}
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Status Sistem
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  NORMAL
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 font-mono">
                Semua sistem berjalan normal
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-emerald-500" />
          </div>
          <button
            onClick={() => onNavigate("prompts")}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-mono font-medium text-amber-500 hover:text-amber-400 transition-colors"
          >
            <Page className="h-3.5 w-3.5" />
            Lihat System Prompts
          </button>
        </div>

        {/* User Summary Card */}
        <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
                Total Pengguna
              </p>
              <p className="text-2xl font-mono font-semibold mt-1 text-slate-100">{totalUsers}</p>
              <p className="text-xs text-slate-400 mt-1 font-mono">
                Pengguna terdaftar di platform
              </p>
            </div>
            <Group className="h-5 w-5 text-slate-500" />
          </div>
          <button
            onClick={() => onNavigate("users")}
            className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 text-slate-950 text-xs font-mono font-medium rounded-action hover:bg-amber-400 transition-colors"
          >
            <Settings className="h-3.5 w-3.5" />
            Kelola Users
          </button>
        </div>
      </div>

      {/* User by Role Card - Mechanical Grace */}
      <div className="bg-slate-900/50 border border-hairline rounded-shell p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-medium text-slate-200">Pengguna Berdasarkan Role</h2>
          <span className="text-[10px] font-mono text-slate-500">Total: {totalUsers}</span>
        </div>

        {/* Progress Bar Visual */}
        <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden mb-3">
          {totalUsers > 0 && (
            <>
              <div
                className="absolute left-0 top-0 h-full bg-rose-500"
                style={{ width: `${(superadminCount / totalUsers) * 100}%` }}
              />
              <div
                className="absolute top-0 h-full bg-amber-500"
                style={{
                  left: `${(superadminCount / totalUsers) * 100}%`,
                  width: `${(adminCount / totalUsers) * 100}%`,
                }}
              />
              <div
                className="absolute top-0 h-full bg-slate-500"
                style={{
                  left: `${((superadminCount + adminCount) / totalUsers) * 100}%`,
                  width: `${(userCount / totalUsers) * 100}%`,
                }}
              />
            </>
          )}
        </div>

        {/* Legend - Mono typography */}
        <div className="grid grid-cols-3 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
            <div className="font-mono">
              <span className="font-semibold text-slate-200">{superadminCount}</span>
              <span className="text-slate-500 ml-1">Super</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
            <div className="font-mono">
              <span className="font-semibold text-slate-200">{adminCount}</span>
              <span className="text-slate-500 ml-1">Admin</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            <div className="font-mono">
              <span className="font-semibold text-slate-200">{userCount}</span>
              <span className="text-slate-500 ml-1">User</span>
            </div>
          </div>
        </div>
      </div>

      {/* User by Tier Card - Mechanical Grace: hairline borders, dense */}
      <div className="bg-slate-900/50 border border-hairline rounded-shell overflow-hidden">
        <div className="px-4 py-2.5 border-b border-hairline">
          <h2 className="text-sm font-medium text-slate-200">Pengguna Berdasarkan Tier</h2>
        </div>

        <div className="divide-y divide-slate-800">
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                GRATIS
              </span>
              <span className="text-xs font-mono text-slate-400">Tier dasar dengan limit</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200">{gratisCount}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-400 border border-sky-500/30">
                BPP
              </span>
              <span className="text-xs font-mono text-slate-400">Bayar Per Paper</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200">{bppCount}</span>
          </div>
          <div className="flex items-center justify-between px-4 py-2.5 hover:bg-slate-800/50 transition-colors">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30">
                PRO
              </span>
              <span className="text-xs font-mono text-slate-400">Langganan premium</span>
            </div>
            <span className="text-sm font-mono font-semibold text-slate-200">{proCount}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions / Admin Guide Card - Mechanical Grace */}
      <div className="bg-slate-800/30 border border-hairline rounded-shell p-4">
        <h3 className="text-sm font-medium text-slate-200 mb-3">Panduan Admin Panel</h3>
        <ul className="text-xs font-mono text-slate-400 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-semibold">1.</span>
            <span>
              <strong className="text-slate-300">User Management:</strong> Promote/demote user ke admin, lihat status verifikasi
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-semibold">2.</span>
            <span>
              <strong className="text-slate-300">System Prompts:</strong> Kelola prompt AI global untuk semua user
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-semibold">3.</span>
            <span>
              <strong className="text-slate-300">AI Providers:</strong> Konfigurasi model dan fallback provider
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-500 font-semibold">4.</span>
            <span>
              <strong className="text-slate-300">Refrasa:</strong> Kelola style constitution untuk tool parafrase
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
      <div className="admin-container">
        <div className="animate-pulse space-y-4 p-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="admin-container">
      {/* Mobile Header - Mechanical Grace */}
      <div className="md:hidden flex items-center gap-3 p-3 border-b border-hairline bg-slate-900">
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 hover:bg-slate-800 rounded-action transition-colors focus-ring"
        >
          <Menu className="h-4 w-4" />
        </button>
        <span className="font-mono text-xs font-medium uppercase tracking-wide text-slate-300">Admin Panel</span>
      </div>

      {/* Main Grid: Sidebar + Content */}
      <div className="admin-body grid grid-cols-16 min-h-[calc(100vh-var(--header-h)-var(--footer-h)-48px)] overflow-hidden">
        <AdminSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
        />

        {/* Content */}
        <div className="col-span-16 md:col-span-13 p-4 md:p-5 overflow-auto">
          {/* Dynamic Page Header - Mechanical Grace */}
          <div className="mb-5">
            <h1 className="text-base font-semibold flex items-center gap-2 text-slate-100">
              <HeaderIcon className="h-4 w-4 text-amber-500" />
              {currentTab.headerTitle}
            </h1>
            <p className="text-xs font-mono text-slate-500 mt-1">
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
            <div className="bg-slate-900/50 border border-hairline rounded-shell">
              <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8">
                <div className="w-14 h-14 bg-slate-800 rounded-shell flex items-center justify-center mb-4">
                  <StatsReport className="w-7 h-7 text-slate-500" />
                </div>
                <h3 className="text-sm font-semibold text-slate-200 mb-2">Fitur Statistik</h3>
                <p className="text-xs font-mono text-slate-500 max-w-md mb-4">
                  Fitur statistik akan segera hadir. Anda akan dapat melihat analitik penggunaan aplikasi, statistik pengguna, dan metrik performa.
                </p>
                <span className="inline-flex items-center px-2.5 py-1 rounded-badge text-[10px] font-mono font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
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
