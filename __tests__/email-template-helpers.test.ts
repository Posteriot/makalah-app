import { replacePlaceholders } from "@/lib/email/template-helpers"

describe("replacePlaceholders", () => {
  it("replaces known keys", () => {
    const result = replacePlaceholders("Hello {{name}}, welcome to {{app}}!", {
      name: "Erik",
      app: "Makalah",
    })
    expect(result).toBe("Hello Erik, welcome to Makalah!")
  })

  it("preserves unknown {{keys}}", () => {
    const result = replacePlaceholders(
      "Hello {{name}}, your code is {{code}}",
      {
        name: "Erik",
      }
    )
    expect(result).toBe("Hello Erik, your code is {{code}}")
  })

  it("handles empty data", () => {
    const result = replacePlaceholders("Hello {{name}}", {})
    expect(result).toBe("Hello {{name}}")
  })

  it("handles template with no placeholders", () => {
    const result = replacePlaceholders("Just plain text", { name: "Erik" })
    expect(result).toBe("Just plain text")
  })

  it("replaces multiple occurrences of same key", () => {
    const result = replacePlaceholders("{{name}} said hi to {{name}}", {
      name: "Erik",
    })
    expect(result).toBe("Erik said hi to Erik")
  })
})
