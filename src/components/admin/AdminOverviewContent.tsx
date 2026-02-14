import {
  CheckCircle,
  Cpu,
  Group,
  Page,
  Settings,
  StatsReport,
} from "iconoir-react"
import type { AdminTabId } from "./adminPanelConfig"
import type { User } from "./UserList"

type AdminOverviewContentProps = {
  users: User[]
  onNavigate: (tab: AdminTabId) => void
}

export function AdminOverviewContent({
  users,
  onNavigate,
}: AdminOverviewContentProps) {
  const totalUsers = users.length
  const superadminCount = users.filter((user) => user.role === "superadmin").length
  const adminCount = users.filter((user) => user.role === "admin").length
  const userCount = users.filter((user) => user.role === "user").length

  const gratisCount = users.filter(
    (user) =>
      !user.subscriptionStatus ||
      user.subscriptionStatus === "free" ||
      user.subscriptionStatus === "gratis"
  ).length
  const bppCount = users.filter((user) => user.subscriptionStatus === "bpp").length
  const proCount = users.filter((user) => user.subscriptionStatus === "pro").length
  const unlimitedCount = users.filter((user) => user.subscriptionStatus === "unlimited").length

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
                STATUS SISTEM
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold tracking-wide text-emerald-600 uppercase dark:text-emerald-400">
                  NORMAL
                </span>
              </div>
              <p className="text-narrative mt-2 text-xs text-muted-foreground">
                Semua sistem berjalan normal
              </p>
            </div>
            <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <button
            type="button"
            onClick={() => onNavigate("prompts")}
            className="focus-ring text-signal mt-3 inline-flex items-center gap-1.5 rounded-action px-1 py-1 text-[10px] font-bold tracking-wider text-muted-foreground transition-colors hover:bg-slate-200 hover:text-foreground dark:hover:bg-slate-800"
          >
            <Page className="h-4 w-4" />
            Lihat System Prompts
          </button>
        </div>

        <div className="rounded-shell border-main border border-border bg-card/90 p-4 dark:bg-slate-900/90">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-signal text-[10px] font-bold tracking-wider text-muted-foreground">
                TOTAL PENGGUNA
              </p>
              <p className="text-interface mt-1 text-2xl font-medium text-foreground">
                {totalUsers}
              </p>
              <p className="text-narrative mt-1 text-xs text-muted-foreground">
                Pengguna terdaftar di platform
              </p>
            </div>
            <Group className="h-5 w-5 text-muted-foreground" />
          </div>
          <button
            type="button"
            onClick={() => onNavigate("users")}
            className="focus-ring text-interface mt-3 inline-flex h-8 items-center gap-1.5 rounded-action border-main border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800"
          >
            <Settings className="h-3.5 w-3.5" />
            Kelola Users
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <div className="flex items-center justify-between">
            <h2 className="text-interface text-base font-medium text-foreground">
              Pengguna Berdasarkan Role
            </h2>
            <span className="text-signal text-[10px] font-bold tracking-wide text-muted-foreground">
              TOTAL: {totalUsers}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="relative mb-3 h-2 overflow-hidden rounded-full bg-muted">
            {totalUsers > 0 && (
              <>
                <div
                  className="absolute inset-y-0 left-0 bg-rose-500"
                  style={{ width: `${(superadminCount / totalUsers) * 100}%` }}
                />
                <div
                  className="absolute inset-y-0 bg-amber-500"
                  style={{
                    left: `${(superadminCount / totalUsers) * 100}%`,
                    width: `${(adminCount / totalUsers) * 100}%`,
                  }}
                />
                <div
                  className="absolute inset-y-0 bg-slate-500"
                  style={{
                    left: `${((superadminCount + adminCount) / totalUsers) * 100}%`,
                    width: `${(userCount / totalUsers) * 100}%`,
                  }}
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
              <div className="h-2.5 w-2.5 rounded-full bg-rose-500" />
              <div className="text-narrative">
                <span className="font-medium text-foreground">{superadminCount}</span>
                <span className="ml-1 text-muted-foreground">Super</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500" />
              <div className="text-narrative">
                <span className="font-medium text-foreground">{adminCount}</span>
                <span className="ml-1 text-muted-foreground">Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-500" />
              <div className="text-narrative">
                <span className="font-medium text-foreground">{userCount}</span>
                <span className="ml-1 text-muted-foreground">User</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <h2 className="text-interface text-base font-medium text-foreground">
            Pengguna Berdasarkan Tier
          </h2>
        </div>
        <div className="divide-y divide-border">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-badge border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-500">
                GRATIS
              </span>
              <span className="text-narrative text-xs text-muted-foreground">
                Tier dasar dengan limit
              </span>
            </div>
            <span className="text-interface text-sm font-medium text-foreground">
              {gratisCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-badge border border-sky-500/30 bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold text-sky-500">
                BPP
              </span>
              <span className="text-narrative text-xs text-muted-foreground">
                Bayar Per Paper
              </span>
            </div>
            <span className="text-interface text-sm font-medium text-foreground">
              {bppCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-badge border border-amber-500/30 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                PRO
              </span>
              <span className="text-narrative text-xs text-muted-foreground">
                Langganan premium
              </span>
            </div>
            <span className="text-interface text-sm font-medium text-foreground">
              {proCount}
            </span>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <span className="rounded-badge border border-slate-500/30 bg-slate-500/15 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                UNLIMITED
              </span>
              <span className="text-narrative text-xs text-muted-foreground">
                Admin / Superadmin
              </span>
            </div>
            <span className="text-interface text-sm font-medium text-foreground">
              {unlimitedCount}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90">
        <div className="border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50">
          <h3 className="text-interface text-base font-medium text-foreground">
            Panduan Admin Panel
          </h3>
        </div>
        <div className="p-4">
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-signal text-[10px] font-bold text-muted-foreground">
                1
              </span>
              <span>
                <strong className="text-foreground">User Management:</strong>{" "}
                Promote/demote user ke admin, lihat status verifikasi
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-signal text-[10px] font-bold text-muted-foreground">
                2
              </span>
              <span>
                <strong className="text-foreground">System Prompts:</strong>{" "}
                Kelola prompt AI global untuk semua user
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-signal text-[10px] font-bold text-muted-foreground">
                3
              </span>
              <span>
                <strong className="text-foreground">AI Providers:</strong>{" "}
                Konfigurasi model dan fallback provider
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-signal text-[10px] font-bold text-muted-foreground">
                4
              </span>
              <span>
                <strong className="text-foreground">Refrasa:</strong> Kelola style
                constitution untuk tool parafrase
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-signal text-[10px] font-bold text-muted-foreground">
                5
              </span>
              <span>
                <strong className="text-foreground">Statistik:</strong> Pantau
                metrik penggunaan saat fitur statistik aktif
              </span>
            </li>
          </ul>
          <div className="mt-4 flex items-center gap-2 rounded-action border-main border border-border bg-card px-3 py-2 dark:bg-slate-900">
            <Cpu className="h-4 w-4 text-muted-foreground" />
            <p className="text-narrative text-xs text-muted-foreground">
              Konfigurasi provider AI memengaruhi kualitas respons chat.
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2 rounded-action border-main border border-border bg-card px-3 py-2 dark:bg-slate-900">
            <StatsReport className="h-4 w-4 text-muted-foreground" />
            <p className="text-narrative text-xs text-muted-foreground">
              Simpan perubahan penting dalam catatan internal sebelum deploy.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
