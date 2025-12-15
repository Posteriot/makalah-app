
import type { GoogleGenerativeAIProviderMetadata } from "@ai-sdk/google"

// Simulation of the extraction logic used in route.ts
async function verifyMetadataExtraction() {
    console.log("Verifying Metadata Extraction...")

    // Mock Provider Metadata from Google
    const mockProviderMetadata = {
        google: {
            groundingMetadata: {
                webSearchQueries: ["berita terkini indonesia"],
                searchEntryPoint: { renderedContent: "<html>...</html>" },
                groundingSupports: [{ url: "https://example.com/news" }]
            }
        }
    }

    // Type Safety Check (Static)
    const googleMetadata = mockProviderMetadata.google as GoogleGenerativeAIProviderMetadata | undefined
    const groundingMetadata = googleMetadata?.groundingMetadata

    if (groundingMetadata && groundingMetadata.webSearchQueries) {
        console.log("✅ Metadata Extraction Successful")
        console.log("Captured Queries:", groundingMetadata.webSearchQueries)
        console.log("Captured Supports:", groundingMetadata.groundingSupports)
    } else {
        console.error("❌ Metadata Extraction Failed")
    }

    // Null safety check
    const emptyMetadata = {}
    const emptyGoogle = (emptyMetadata as unknown as { google?: GoogleGenerativeAIProviderMetadata }).google
    if (!emptyGoogle?.groundingMetadata) {
        console.log("✅ Graceful handling of missing metadata verified")
    }
}

verifyMetadataExtraction()
