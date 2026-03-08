import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { PaymentProviderManager } from "./PaymentProviderManager"

const mockUseQuery = vi.fn()
const mockUseMutation = vi.fn()
const mutate = vi.fn()
const configResult = {
  enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT", "EWALLET"] as const,
  visibleVAChannels: [
    "BJB_VIRTUAL_ACCOUNT",
    "BNI_VIRTUAL_ACCOUNT",
    "BRI_VIRTUAL_ACCOUNT",
    "BSI_VIRTUAL_ACCOUNT",
    "CIMB_VIRTUAL_ACCOUNT",
    "MANDIRI_VIRTUAL_ACCOUNT",
    "PERMATA_VIRTUAL_ACCOUNT",
  ] as const,
  webhookUrl: "/api/webhooks/payment",
  defaultExpiryMinutes: 30,
}
const envStatusResult = {
  xendit: {
    secretKey: true,
    webhookToken: true,
  },
}

vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: () => mockUseMutation(),
}))

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

describe("PaymentProviderManager", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseMutation.mockReturnValue(mutate)
    mockUseQuery.mockImplementation((_queryRef: unknown, args: unknown) => {
      if (args && typeof args === "object" && "requestorUserId" in args) {
        return envStatusResult
      }

      return configResult
    })
  })

  it("renders xendit-only settings without alternate provider selector", () => {
    render(<PaymentProviderManager userId={"user_123" as never} />)

    expect(screen.getByText("Provider Aktif")).toBeInTheDocument()
    expect(screen.getByText("Xendit")).toBeInTheDocument()
    expect(
      screen.queryByText(new RegExp(["Mid", "trans"].join("")))
    ).not.toBeInTheDocument()
  })

  it("saves enabled methods and visible VA channels", async () => {
    render(<PaymentProviderManager userId={"user_123" as never} />)

    fireEvent.click(screen.getByLabelText("E-Wallet"))
    fireEvent.click(screen.getByLabelText("Bank Mandiri"))
    fireEvent.click(screen.getByRole("button", { name: /simpan konfigurasi/i }))

    await waitFor(() => {
      expect(mutate).toHaveBeenCalledWith({
        requestorUserId: "user_123",
        enabledMethods: ["QRIS", "VIRTUAL_ACCOUNT"],
        visibleVAChannels: [
          "BJB_VIRTUAL_ACCOUNT",
          "BNI_VIRTUAL_ACCOUNT",
          "BRI_VIRTUAL_ACCOUNT",
          "BSI_VIRTUAL_ACCOUNT",
          "CIMB_VIRTUAL_ACCOUNT",
          "PERMATA_VIRTUAL_ACCOUNT",
        ],
        webhookUrl: "/api/webhooks/payment",
        defaultExpiryMinutes: 30,
      })
    })
  })

  it("shows warning when all VA channels are hidden while VA method is enabled", () => {
    render(<PaymentProviderManager userId={"user_123" as never} />)

    fireEvent.click(screen.getByLabelText("Bank BJB"))
    fireEvent.click(screen.getByLabelText("Bank Negara Indonesia"))
    fireEvent.click(screen.getByLabelText("Bank Rakyat Indonesia"))
    fireEvent.click(screen.getByLabelText("Bank Syariah Indonesia"))
    fireEvent.click(screen.getByLabelText("CIMB Niaga"))
    fireEvent.click(screen.getByLabelText("Bank Mandiri"))
    fireEvent.click(screen.getByLabelText("PermataBank"))

    expect(
      screen.getByText(/metode Virtual Account tidak akan ditampilkan/i)
    ).toBeInTheDocument()
  })
})
