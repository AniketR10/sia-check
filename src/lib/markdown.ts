import { marked } from 'marked'
import DOMPurify from 'dompurify'

marked.setOptions({ gfm: true, breaks: true })

// Render markdown to sanitized html, Notes can be shared and opened from other
// people, so we always run the output through DOMPurify to neutralize any
// injected scripts/handlers before it touches the DOM.
export function renderMarkdown(md: string): string {
  const raw = marked.parse(md, { async: false }) as string
  return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } })
}
