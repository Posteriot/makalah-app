"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { CheckCircle, CreditCard, Internet, WarningCircle } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"
import {
  assertEnabledMethodsConfig,
  DEFAULT_ENABLED_METHODS,
} from "@/lib/payment/runtime-settings"
import {
  ACTIVE_VA_CHANNELS,
  getDefaultVisibleVAChannels,
} from "@/lib/payment/channel-options"

interface PaymentProviderManagerProps {
  userId: Id<"users">
}

const PAYMENT_METHODS = [
  { value: "QRIS" as const, label: "QRIS" },
  { value: "VIRTUAL_ACCOUNT" as const, label: "Virtual Account" },
  { value: "EWALLET" as const, label: "E-Wallet" },
]

type PaymentMethod = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

const panelClass = "overflow-hidden rounded-shell border-main border border-border bg-card/90 dark:bg-slate-900/90"
const panelHeaderClass = "border-b border-border bg-slate-200/45 px-4 py-3 dark:bg-slate-900/50"
const panelBodyClass = "px-4 py-4"
const methodCardClass =
  "flex items-center justify-between gap-3 rounded-action border-main border border-border bg-card/70 px-3 py-3 transition-colors hover:bg-slate-200/35 dark:bg-slate-900/70 dark:hover:bg-slate-800/70"

export function PaymentProviderManager({ userId }: PaymentProviderManagerProps) {
  const config = useQuery(api.billing.paymentProviderConfigs.getActiveConfig)
  const envStatus = useQuery(
    api.billing.paymentProviderConfigs.checkProviderEnvStatus,
    { requestorUserId: userId }
  )
  const upsertConfig = useMutation(api.billing.paymentProviderConfigs.upsertConfig)

  const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>([
    ...(DEFAULT_ENABLED_METHODS as PaymentMethod[]),
  ])
  const [visibleVAChannels, setVisibleVAChannels] = useState<string[]>(
    getDefaultVisibleVAChannels()
  )
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setEnabledMethods([...(config.enabledMethods as PaymentMethod[])])
      setVisibleVAChannels(
        config.visibleVAChannels ? [...config.visibleVAChannels] : getDefaultVisibleVAChannels()
      )
    }
  }, [config])

  function toggleMethod(method: PaymentMethod) {
    setEnabledMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    )
  }

  function toggleVAChannel(channelCode: string) {
    setVisibleVAChannels((prev) =>
      prev.includes(channelCode)
        ? prev.filter((code) => code !== channelCode)
        : [...prev, channelCode]
    )
  }

  function isXenditConfigured(): boolean {
    if (!envStatus) return false
    return envStatus.xendit.secretKey && envStatus.xendit.webhookToken
  }

  const isConnected = isXenditConfigured()

  async function handleSave() {
    if (!config) return

    setSaving(true)
    try {
      assertEnabledMethodsConfig(enabledMethods)
      await upsertConfig({
        requestorUserId: userId,
        enabledMethods,
        visibleVAChannels,
        webhookUrl: config.webhookUrl,
        defaultExpiryMinutes: config.defaultExpiryMinutes,
      })
      toast.success("Konfigurasi payment provider berhasil disimpan")
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Gagal menyimpan konfigurasi"
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  if (config === undefined) {
    return (
      <div className={panelClass}>
        <div className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-1/3 rounded bg-muted" />
            <div className="h-48 rounded bg-muted" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Provider Status */}
      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            Provider Aktif
          </h3>
        </div>
        <div className={panelBodyClass}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div
                className={`inline-flex items-center gap-2 rounded-action px-4 py-2 text-xs font-mono font-medium ${
                  isConnected
                    ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                    : "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300"
                }`}
              >
                <span>Xendit</span>
                {isConnected ? (
                  <CheckCircle
                    className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                    strokeWidth={1.5}
                  />
                ) : (
                  <WarningCircle
                    className="h-4 w-4 text-amber-600 dark:text-amber-400"
                    strokeWidth={1.5}
                  />
                )}
              </div>
              {envStatus && (
                <p className="text-narrative text-xs text-muted-foreground">
                  {isConnected
                    ? "Environment variables Xendit sudah dikonfigurasi."
                    : "Environment variables Xendit belum lengkap. Periksa konfigurasi server."}
                </p>
              )}
            </div>
            <div className="rounded-action border-main border border-border bg-card/70 px-3 py-2 dark:bg-slate-900/70">
              <p className="text-signal text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Runtime
              </p>
              <p className="text-interface mt-1 text-sm font-medium text-foreground">
                Xendit-only
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Methods */}
      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <div className="space-y-1">
            <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
              Metode Pembayaran
            </h3>
            <p className="text-narrative text-xs text-muted-foreground">
              Pilih metode yang ditampilkan di checkout BPP dan Pro.
            </p>
          </div>
        </div>
        <div className="space-y-3 px-4 py-4">
          {PAYMENT_METHODS.map((method) => {
            const checked = enabledMethods.includes(method.value)
            return (
              <div key={method.value} className="space-y-2">
                <label className={`${methodCardClass} cursor-pointer`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      aria-label={method.label}
                      checked={checked}
                      onChange={() => toggleMethod(method.value)}
                      className="h-4 w-4 rounded-badge border-border accent-slate-700 dark:accent-slate-200"
                    />
                    <span className="text-interface text-sm font-medium text-foreground">
                      {method.label}
                    </span>
                  </div>
                  <span className="text-signal rounded-badge border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {checked ? "Aktif" : "Nonaktif"}
                  </span>
                </label>

                {method.value === "VIRTUAL_ACCOUNT" && (
                  <div className="rounded-action border border-border bg-card/50 p-3 dark:bg-slate-900/60">
                    <div className="mb-2.5 space-y-1">
                      <p className="text-interface text-xs font-semibold text-foreground">
                        Virtual Account Channels
                      </p>
                      <p className="text-narrative text-xs text-muted-foreground">
                        Tampilkan atau sembunyikan bank VA yang tersedia di checkout.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {ACTIVE_VA_CHANNELS.map((channel) => {
                        const isVisible = visibleVAChannels.includes(channel.code)
                        return (
                          <label
                            key={channel.code}
                            className={`${methodCardClass} min-h-[4.25rem] cursor-pointer`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                aria-label={channel.label}
                                checked={isVisible}
                                onChange={() => toggleVAChannel(channel.code)}
                                className="mt-0.5 h-4 w-4 rounded-badge border-border accent-slate-700 dark:accent-slate-200"
                              />
                              <div className="space-y-0.5">
                                <p className="text-interface text-sm font-medium text-foreground">
                                  {channel.shortLabel}
                                </p>
                                <p className="text-narrative text-xs text-muted-foreground">
                                  {channel.label}
                                </p>
                              </div>
                            </div>
                            <span className="text-signal rounded-badge border border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                              {isVisible ? "Aktif" : "Nonaktif"}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                    {enabledMethods.includes("VIRTUAL_ACCOUNT") &&
                      visibleVAChannels.length === 0 && (
                        <p className="text-narrative mt-2 rounded-action border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                          Semua bank VA sedang disembunyikan. Checkout tetap
                          berjalan, tapi metode Virtual Account tidak akan
                          ditampilkan.
                        </p>
                      )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Webhook URL */}
      <div className={panelClass}>
        <div className={panelHeaderClass}>
          <div className="space-y-1">
            <h3 className="text-interface flex items-center gap-2 text-sm font-semibold text-foreground">
              <Internet className="h-4 w-4 text-muted-foreground" />
              Webhook URL
            </h3>
            <p className="text-narrative text-xs text-muted-foreground">
              Endpoint callback yang harus dipakai Xendit untuk sinkronisasi status pembayaran.
            </p>
          </div>
        </div>
        <div className={panelBodyClass}>
          <code className="text-interface inline-flex rounded-action border-main border border-border bg-card/70 px-3 py-2 text-xs font-mono text-foreground dark:bg-slate-900/70">
            {config.webhookUrl}
          </code>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-start">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || enabledMethods.length === 0}
          className="focus-ring inline-flex h-8 items-center gap-1.5 rounded-action bg-slate-900 px-3 py-1.5 text-xs font-mono font-medium text-slate-100 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
        >
          <span>{saving ? "Menyimpan..." : "Simpan Konfigurasi"}</span>
        </button>
      </div>
    </div>
  )
}
