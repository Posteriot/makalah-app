type MailtoParts = {
  to: string
  subject?: string
  body?: string
}

function parseMailtoHref(mailtoHref: string): MailtoParts {
  const normalized = mailtoHref.startsWith("mailto:")
    ? mailtoHref.slice("mailto:".length)
    : mailtoHref

  const [toPart, queryPart = ""] = normalized.split("?")
  const params = new URLSearchParams(queryPart)

  return {
    to: decodeURIComponent(toPart || ""),
    subject: params.get("subject") ?? undefined,
    body: params.get("body") ?? undefined,
  }
}

function buildGmailComposeUrl(parts: MailtoParts): string {
  const params = new URLSearchParams({
    view: "cm",
    fs: "1",
    tf: "1",
  })

  if (parts.to) params.set("to", parts.to)
  if (parts.subject) params.set("su", parts.subject)
  if (parts.body) params.set("body", parts.body)

  return `https://mail.google.com/mail/?${params.toString()}`
}

type OpenEmailOptions = {
  openInNewTab?: boolean
}

/**
 * Open Gmail compose using data parsed from a mailto URL.
 * Default behavior opens in a new tab; if blocked, fallback to current tab.
 */
export function openMailClientOrGmail(
  mailtoHref: string,
  options: OpenEmailOptions = {}
) {
  if (typeof window === "undefined") return

  const href = mailtoHref.startsWith("mailto:")
    ? mailtoHref
    : `mailto:${mailtoHref}`
  const gmailUrl = buildGmailComposeUrl(parseMailtoHref(href))
  const openInNewTab = options.openInNewTab ?? true

  if (openInNewTab) {
    const popup = window.open(gmailUrl, "_blank", "noopener,noreferrer")
    if (popup) {
      popup.opener = null
    }
    return
  }

  window.location.assign(gmailUrl)
}
