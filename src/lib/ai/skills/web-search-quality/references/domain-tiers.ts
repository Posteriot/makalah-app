/**
 * Domain blocklist for web search source filtering.
 *
 * Only blocked domains are hard-filtered. Everything else passes through
 * and the model evaluates credibility using SKILL.md guidance.
 */

export type DomainTier = "blocked" | "pass"

export const BLOCKED_DOMAINS_SKILL = [
  // User-edited encyclopedias
  "wikipedia.org",
  "wikimedia.org",
  "wiktionary.org",
  // Self-publishing / blog platforms (no editorial oversight)
  "blogspot.com",
  "wordpress.com",
  "medium.com",
  "substack.com",
  "tumblr.com",
  // User-generated Q&A / forums
  "quora.com",
  "reddit.com",
  "answers.yahoo.com",
  // Homework help / content farms
  "scribd.com",
  "brainly.co.id",
  "coursehero.com",
]
