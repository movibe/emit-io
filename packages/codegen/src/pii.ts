import type { ParsedEvent } from './types.js'

export type PIIMatch = {
  event: string
  property: string
  pattern: string
}

export const PII_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: 'email', regex: /email/i },
  { name: 'phone', regex: /phone/i },
  { name: 'cpf', regex: /cpf/i },
  { name: 'ssn', regex: /ssn/i },
  { name: 'credit_card', regex: /credit[\s_-]?card/i },
  { name: 'password', regex: /password/i },
  { name: 'token', regex: /token/i },
  { name: 'secret', regex: /secret/i },
  { name: 'api_key', regex: /api[\s_-]?key/i },
  { name: 'address', regex: /address/i },
  { name: 'dob', regex: /\b(dob|birth)/i },
]

export function detectPII(events: ParsedEvent[]): PIIMatch[] {
  const matches: PIIMatch[] = []
  for (const event of events) {
    for (const field of event.fields) {
      for (const { name, regex } of PII_PATTERNS) {
        if (regex.test(field.name)) {
          matches.push({ event: event.name, property: field.name, pattern: name })
        }
      }
    }
  }
  return matches
}
