import DOMPurify from 'dompurify'

/**
 * Sanitize HTML string to prevent XSS.
 * Safe to call server-side (returns input unchanged if window is unavailable).
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === 'undefined') return dirty
  return DOMPurify.sanitize(dirty, { USE_PROFILES: { html: true } })
}

/**
 * Strip all HTML tags — returns plain text only.
 */
export function sanitizeText(dirty: string): string {
  if (typeof window === 'undefined') return dirty
  return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
