import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// --- Mocks must be registered before the import under test --------------

const generateUploadUrlMock = vi.fn()
const createFileMock = vi.fn()
const useMutationMock = vi.fn((ref: unknown) => {
    const name = String(ref)
    if (name.includes("generateUploadUrl")) return generateUploadUrlMock
    if (name.includes("createFile")) return createFileMock
    return vi.fn()
})

vi.mock("convex/react", () => ({
    useMutation: (ref: unknown) => useMutationMock(ref),
}))

vi.mock("../../../convex/_generated/api", () => ({
    api: {
        files: {
            generateUploadUrl: "api.files.generateUploadUrl",
            createFile: "api.files.createFile",
        },
    },
}))

const toastErrorMock = vi.fn()
vi.mock("sonner", () => ({
    toast: {
        error: (...args: unknown[]) => toastErrorMock(...args),
    },
}))

const sentryCaptureMock = vi.fn()
vi.mock("@sentry/nextjs", () => ({
    captureException: (...args: unknown[]) => sentryCaptureMock(...args),
}))

vi.mock("@/components/ui/dropdown-menu", () => {
    // Minimal pass-through stubs so the menu content is always in the DOM
    // and we can interact with items without a Radix portal.
    const Passthrough = ({ children }: { children?: React.ReactNode }) => (
        <>{children}</>
    )
    const Item = ({
        children,
        onSelect,
    }: {
        children?: React.ReactNode
        onSelect?: (event: Event) => void
    }) => (
        <button
            type="button"
            role="menuitem"
            onClick={() => onSelect?.(new Event("select"))}
        >
            {children}
        </button>
    )
    return {
        DropdownMenu: Passthrough,
        DropdownMenuContent: Passthrough,
        DropdownMenuItem: Item,
        DropdownMenuLabel: Passthrough,
        DropdownMenuSeparator: () => null,
        DropdownMenuTrigger: ({ children }: { children?: React.ReactNode }) =>
            <>{children}</>,
    }
})

import { ContextAddMenu } from "./ContextAddMenu"

// --- Helpers ------------------------------------------------------------

function makeFile(
    name: string,
    type: string,
    sizeBytes: number = 1024
): File {
    const blob = new Blob(["x".repeat(sizeBytes)], { type })
    return new File([blob], name, { type })
}

function mockFetchOnce(response: Partial<Response>) {
    const fn = vi.fn().mockResolvedValueOnce(response as Response)
    vi.stubGlobal("fetch", fn)
    return fn
}

function getHiddenFileInput(): HTMLInputElement {
    const input = document.querySelector(
        'input[type="file"]'
    ) as HTMLInputElement | null
    if (!input) throw new Error("hidden file input not found")
    return input
}

// --- Tests --------------------------------------------------------------

describe("ContextAddMenu", () => {
    beforeEach(() => {
        generateUploadUrlMock.mockReset()
        createFileMock.mockReset()
        toastErrorMock.mockReset()
        sentryCaptureMock.mockReset()
    })

    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('renders a "+" trigger button with accessible name "Tambah konteks"', () => {
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        expect(
            screen.getByRole("button", { name: /tambah konteks/i })
        ).toBeInTheDocument()
    })

    it("renders 6 file-type menu items inside the dropdown", () => {
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        const items = screen.getAllByRole("menuitem")
        expect(items).toHaveLength(6)
        // Items are rendered in the TYPE_OPTIONS order: pdf/doc/xls/ppt/txt/img
        expect(items[0]).toHaveTextContent(/PDF/)
        expect(items[1]).toHaveTextContent(/Word/)
        expect(items[2]).toHaveTextContent(/Spreadsheet/)
        expect(items[3]).toHaveTextContent(/Presentasi/)
        expect(items[4]).toHaveTextContent(/Teks/)
        expect(items[5]).toHaveTextContent(/Gambar/)
    })

    it("sets the hidden file input `accept` attribute when a dropdown item is selected", async () => {
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()

        // Pick "PDF"
        fireEvent.click(screen.getByRole("menuitem", { name: /PDF/ }))
        expect(input.accept).toBe(".pdf")

        // Pick "Spreadsheet" — accept should swap
        fireEvent.click(
            screen.getByRole("menuitem", { name: /Spreadsheet/ })
        )
        expect(input.accept).toBe(".xlsx")

        // Pick "Gambar" — image filter is a comma-separated list
        fireEvent.click(screen.getByRole("menuitem", { name: /Gambar/ }))
        expect(input.accept).toBe(".jpg,.jpeg,.png,.gif,.webp")
    })

    it("rejects an unsupported MIME type with a toast and does not call any upload mutations", async () => {
        mockFetchOnce({ ok: true, json: async () => ({ storageId: "s1" }) })

        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()
        const badFile = makeFile("evil.zip", "application/zip")
        fireEvent.change(input, { target: { files: [badFile] } })

        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith(
                expect.stringMatching(/Tipe file tidak didukung/)
            )
        })
        expect(generateUploadUrlMock).not.toHaveBeenCalled()
        expect(createFileMock).not.toHaveBeenCalled()
        expect(sentryCaptureMock).not.toHaveBeenCalled()
    })

    it("rejects a file over the 10MB size limit with a toast and no mutations", async () => {
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()
        // Construct a File whose reported size exceeds 10MB without actually
        // allocating the bytes (we patch the `size` getter).
        const hugeFile = new File([""], "big.pdf", {
            type: "application/pdf",
        })
        Object.defineProperty(hugeFile, "size", { value: 11 * 1024 * 1024 })

        fireEvent.change(input, { target: { files: [hugeFile] } })

        await waitFor(() => {
            expect(toastErrorMock).toHaveBeenCalledWith(
                expect.stringMatching(/terlalu besar/i)
            )
        })
        expect(generateUploadUrlMock).not.toHaveBeenCalled()
        expect(createFileMock).not.toHaveBeenCalled()
    })

    it("captures to Sentry and toasts when the upload fetch returns !ok", async () => {
        generateUploadUrlMock.mockResolvedValueOnce(
            "https://storage.example/upload"
        )
        mockFetchOnce({
            ok: false,
            status: 503,
            statusText: "Service Unavailable",
            json: async () => ({}),
        })

        const onFileUploaded = vi.fn()
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={onFileUploaded}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()
        fireEvent.change(input, {
            target: { files: [makeFile("doc.pdf", "application/pdf")] },
        })

        await waitFor(() => {
            expect(sentryCaptureMock).toHaveBeenCalled()
        })
        expect(toastErrorMock).toHaveBeenCalledWith(
            expect.stringMatching(/Upload gagal/)
        )
        expect(onFileUploaded).not.toHaveBeenCalled()
        expect(createFileMock).not.toHaveBeenCalled()

        // Assert the captured error carries the subsystem tag so Sentry
        // filters stay useful even when every upload fails under the same
        // toast.
        const [, context] = sentryCaptureMock.mock.calls[0]
        expect(context?.tags?.subsystem).toBe("chat.upload")
    })

    it("captures to Sentry when the upload response is missing storageId", async () => {
        generateUploadUrlMock.mockResolvedValueOnce(
            "https://storage.example/upload"
        )
        mockFetchOnce({
            ok: true,
            status: 200,
            statusText: "OK",
            json: async () => ({ something: "else" }),
        })

        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={vi.fn()}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()
        fireEvent.change(input, {
            target: { files: [makeFile("doc.pdf", "application/pdf")] },
        })

        await waitFor(() => {
            expect(sentryCaptureMock).toHaveBeenCalled()
        })
        const capturedError = sentryCaptureMock.mock.calls[0][0] as Error
        expect(capturedError.message).toMatch(/storageId/i)
        expect(createFileMock).not.toHaveBeenCalled()
    })

    it("runs the happy-path for a non-image upload: generateUploadUrl → POST → createFile → onFileUploaded", async () => {
        generateUploadUrlMock.mockResolvedValueOnce(
            "https://storage.example/upload"
        )
        createFileMock.mockResolvedValueOnce("file-id-1")

        // Need two fetch calls: one for the storage POST, one for
        // /api/extract-file. Stub the global with a multi-call mock.
        const fetchMock = vi.fn().mockImplementation((url: string) => {
            if (url === "https://storage.example/upload") {
                return Promise.resolve({
                    ok: true,
                    status: 200,
                    statusText: "OK",
                    json: async () => ({ storageId: "storage-id-1" }),
                } as Response)
            }
            // /api/extract-file — fire-and-forget, returns ok
            return Promise.resolve({ ok: true } as Response)
        })
        vi.stubGlobal("fetch", fetchMock)

        const onFileUploaded = vi.fn()
        render(
            <ContextAddMenu
                conversationId="conv-1"
                onFileUploaded={onFileUploaded}
                onImageDataUrl={vi.fn()}
            />
        )
        const input = getHiddenFileInput()
        fireEvent.change(input, {
            target: { files: [makeFile("doc.pdf", "application/pdf", 2048)] },
        })

        await waitFor(() => {
            expect(onFileUploaded).toHaveBeenCalledTimes(1)
        })
        expect(onFileUploaded).toHaveBeenCalledWith({
            fileId: "file-id-1",
            name: "doc.pdf",
            size: 2048,
            type: "application/pdf",
        })
        expect(createFileMock).toHaveBeenCalledWith({
            storageId: "storage-id-1",
            name: "doc.pdf",
            type: "application/pdf",
            size: 2048,
            conversationId: "conv-1",
        })
        expect(sentryCaptureMock).not.toHaveBeenCalled()
        expect(toastErrorMock).not.toHaveBeenCalled()
    })
})
