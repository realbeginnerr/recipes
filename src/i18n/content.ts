import type { Language } from './translations'
import { contentEnglish } from './contentEnglish'

// Match the current source text, not a record ID: edits never show an old translation.
// Keep this at the presentation boundary so switching language cannot alter a save.
export function translateContent(text: string | undefined, language: Language): string {
  if (!text || language === 'ko') return text ?? ''
  return contentEnglish[text.trim()] ?? text.split(/\r?\n/).map(line => contentEnglish[line.trim()] ?? line).join('\n')
}
