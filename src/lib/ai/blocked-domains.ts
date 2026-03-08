export const BLOCKED_DOMAINS = [
  "wikipedia.org", "wikimedia.org", "wiktionary.org",
  "blogspot.com", "wordpress.com", "medium.com", "substack.com",
  "tumblr.com", "quora.com", "reddit.com", "answers.yahoo.com",
  "scribd.com", "brainly.co.id", "coursehero.com",
]

export function isBlockedSourceDomain(url: string): boolean {
  try {
    const hostname = new URL(url).hostname.toLowerCase()
    return BLOCKED_DOMAINS.some(d => hostname === d || hostname.endsWith(`.${d}`))
  } catch {
    // Malformed URL — don't block (let citation through, user can judge)
    return false
  }
}
