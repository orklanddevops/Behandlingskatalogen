import { env } from './env'

type TLawIdentifier = { id: string; regulation: boolean }

function parseIdentifier(value: string, regulation = false): TLawIdentifier | undefined {
  const match = value
    .trim()
    .match(/^(?:(LOV|FOR|FORSKRIFT)[_-])?(\d{4})[-_](\d{2})[-_](\d{2})(?:[-_](\d+))?$/i)
  if (!match) return undefined
  const date = `${match[2]}-${match[3]}-${match[4]}`
  const parsed = new Date(date + 'T00:00:00Z')
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return undefined
  return {
    id: date + (match[5] ? '-' + match[5] : ''),
    regulation: match[1] ? match[1].toUpperCase() !== 'LOV' : regulation,
  }
}

export function getLovdataUrl(code: string, legacyDescription?: string): string | undefined {
  const regulation = /FORSKRIFT|^FOR[_-]/i.test(code)
  let identifier = parseIdentifier(code, regulation)
  // Older short codes used DESCRIPTION as a date/number reference. Keep those records working.
  if (!identifier && legacyDescription) {
    identifier = parseIdentifier(legacyDescription, regulation)
    if (!identifier) {
      try {
        const url = new URL(legacyDescription.trim())
        if (
          ['https:', 'http:'].includes(url.protocol) &&
          /^(www\.)?lovdata\.no$/i.test(url.hostname)
        ) {
          const match = url.pathname.match(
            /^\/(?:dokument\/(?:NL|SF)\/)?(lov|forskrift)\/([^/]+)\/?$/i
          )
          if (match) identifier = parseIdentifier(match[2], match[1].toLowerCase() === 'forskrift')
        }
      } catch {
        // A readable description is never used as part of a URL.
      }
    }
  }
  if (!identifier) return undefined
  const base = identifier.regulation
    ? env.lovdataForskriftBaseUrl || 'https://lovdata.no/forskrift/'
    : env.lovdataLovBaseUrl || 'https://lovdata.no/lov/'
  return base.replace(/\/+$/, '') + '/' + identifier.id
}
