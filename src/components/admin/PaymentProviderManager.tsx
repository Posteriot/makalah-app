"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@convex/_generated/api"
import { toast } from "sonner"
import { CheckCircle, WarningCircle } from "iconoir-react"
import type { Id } from "@convex/_generated/dataModel"

interface PaymentProviderManagerProps {
  userId: Id<"users">
}

const PROVIDERS = [
  { value: "xendit" as const, label: "Xendit" },
  { value: "midtrans" as const, label: "Midtrans" },
]

const PAYMENT_METHODS = [
  { value: "QRIS" as const, label: "QRIS" },
  { value: "VIRTUAL_ACCOUNT" as const, label: "Virtual Account" },
  { value: "EWALLET" as const, label: "E-Wallet" },
]

type Provider = "xendit" | "midtrans"
type PaymentMethod = "QRIS" | "VIRTUAL_ACCOUNT" | "EWALLET"

const sectionCard = "rounded-shell border border-border/60 bg-card/95 p-4"

export function PaymentProviderManager({ userId }: PaymentProviderManagerProps) {
  const config = useQuery(api.billing.paymentProviderConfigs.getActiveConfig)
  const envStatus = useQuery(
    api.billing.paymentProviderConfigs.checkProviderEnvStatus,
    { requestorUserId: userId }
  )
  const upsertConfig = useMutation(api.billing.paymentProviderConfigs.upsertConfig)

  const [activeProvider, setActiveProvider] = useState<Provider>("xendit")
  const [enabledMethods, setEnabledMethods] = useState<PaymentMethod[]>([
    "QRIS",
    "VIRTUAL_ACCOUNT",
    "EWALLET",
  ])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (config) {
      setActiveProvider(config.activeProvider as Provider)
      setEnabledMethods([...(config.enabledMethods as PaymentMethod[])])
    }
  }, [config])

  function toggleMethod(method: PaymentMethod) {
    setEnabledMethods((prev) =>
      prev.includes(method)
        ? prev.filter((m) => m !== method)
        : [...prev, method]
    )
  }

  function isProviderConfigured(provider: Provider): boolean {
    if (!envStatus) return false
    if (provider === "xendit") {
      return envStatus.xendit.secretKey && envStatus.xendit.webhookToken
    }
    return envStatus.midtrans.serverKey && envStatus.midtrans.clientKey
  }

  async function handleSave() {
    setSaving(true)
    try {
      await upsertConfig({
        requestorUserId: userId,
        activeProvider,
        enabledMethods,
      })
      toast.success("Konfigurasi payment provider berhasil disimpan")
    } catch (e) {
      toast.error("Gagal menyimpan konfigurasi")
    } finally {
      setSaving(false)
    }
  }

  if (config === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-interface text-sm text-muted-foreground">
          Memuat konfigurasi...
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Provider Selection */}
      <div className={sectionCard}>
        <h3 className="text-interface text-sm font-medium mb-3">Provider Aktif</h3>
        <div className="flex gap-3">
          {PROVIDERS.map((provider) => {
            const configured = isProviderConfigured(provider.value)
            const isActive = activeProvider === provider.value
            return (
              <button
                key={provider.value}
                type="button"
                onClick={() => setActiveProvider(provider.value)}
                className={`flex items-center gap-2 rounded-action border px-4 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:border-border/80 hover:bg-card/80"
                }`}
              >
                <span className="text-interface">{provider.label}</span>
                {configured ? (
                  <CheckCircle
                    className="h-4 w-4 text-teal-500"
                    strokeWidth={1.5}
                  />
                ) : (
                  <WarningCircle
                    className="h-4 w-4 text-amber-500"
                    strokeWidth={1.5}
                  />
                )}
              </button>
            )
          })}
        </div>
        {envStatus && (
          <p className="text-narrative text-xs text-muted-foreground mt-2">
            {isProviderConfigured(activeProvider)
              ? "Environment variables untuk provider ini sudah dikonfigurasi."
              : "Environment variables untuk provider ini belum lengkap. Periksa konfigurasi server."}
          </p>
        )}
      </div>

      {/* Payment Methods */}
      <div className={sectionCard}>
        <h3 className="text-interface text-sm font-medium mb-3">
          Metode Pembayaran
        </h3>
        <div className="space-y-2">
          {PAYMENT_METHODS.map((method) => {
            const checked = enabledMethods.includes(method.value)
            return (
              <label
                key={method.value}
                className="flex items-center gap-3 cursor-pointer rounded-action px-3 py-2 hover:bg-muted/50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleMethod(method.value)}
                  className="h-4 w-4 rounded-badge border-border accent-primary"
                />
                <span className="text-interface text-sm">{method.label}</span>
              </label>
            )
          })}
        </div>
      </div>

      {/* Webhook URL */}
      <div className={sectionCard}>
        <h3 className="text-interface text-sm font-medium mb-3">Webhook URL</h3>
        <code className="text-interface text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-badge">
          /api/webhooks/payment
        </code>
      </div>

      {/* Save Button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || enabledMethods.length === 0}
        className="rounded-action bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Menyimpan..." : "Simpan Konfigurasi"}
      </button>
    </div>
  )
}
