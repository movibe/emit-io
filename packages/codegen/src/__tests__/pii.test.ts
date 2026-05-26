import { test, expect, describe } from 'vitest'
import { detectPII, PII_PATTERNS } from '../pii.js'
import type { ParsedEvent } from '../types.js'

function makeEvent(name: string, fieldNames: string[]): ParsedEvent {
  return {
    name,
    fields: fieldNames.map(f => ({ name: f, type: 'string', optional: false })),
  }
}

describe('detectPII', () => {
  test('detects email field', () => {
    const events = [makeEvent('user-login', ['email'])]
    const matches = detectPII(events)
    expect(matches.length).toBeGreaterThan(0)
    expect(matches[0].event).toBe('user-login')
    expect(matches[0].property).toBe('email')
    expect(matches[0].pattern).toBe('email')
  })

  test('detects phone field', () => {
    const events = [makeEvent('profile', ['phoneNumber'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'phone')).toBe(true)
  })

  test('detects credit_card field (exact)', () => {
    const events = [makeEvent('payment', ['credit_card'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'credit_card')).toBe(true)
  })

  test('detects credit_card variant: creditCard (camelCase)', () => {
    const events = [makeEvent('payment', ['creditCard'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'credit_card')).toBe(true)
  })

  test('detects credit_card variant: credit-card (hyphen)', () => {
    const events = [makeEvent('payment', ['credit-card'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'credit_card')).toBe(true)
  })

  test('detects password field', () => {
    const events = [makeEvent('auth', ['password'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'password')).toBe(true)
  })

  test('detects token field', () => {
    const events = [makeEvent('auth', ['authToken'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'token')).toBe(true)
  })

  test('detects ssn field', () => {
    const events = [makeEvent('profile', ['ssn'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'ssn')).toBe(true)
  })

  test('detects cpf field', () => {
    const events = [makeEvent('profile', ['cpf'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'cpf')).toBe(true)
  })

  test('detects secret field', () => {
    const events = [makeEvent('config', ['apiSecret'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'secret')).toBe(true)
  })

  test('detects api_key field', () => {
    const events = [makeEvent('config', ['api_key'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'api_key')).toBe(true)
  })

  test('detects address field', () => {
    const events = [makeEvent('user', ['homeAddress'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'address')).toBe(true)
  })

  test('detects dob field', () => {
    const events = [makeEvent('user', ['dob'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'dob')).toBe(true)
  })

  test('detects birthdate field', () => {
    const events = [makeEvent('user', ['birthdate'])]
    const matches = detectPII(events)
    expect(matches.some(m => m.pattern === 'dob')).toBe(true)
  })

  test('no false positives on neutral props: id', () => {
    const events = [makeEvent('page-view', ['id'])]
    const matches = detectPII(events)
    expect(matches).toHaveLength(0)
  })

  test('no false positives on neutral props: name', () => {
    const events = [makeEvent('page-view', ['name'])]
    const matches = detectPII(events)
    expect(matches).toHaveLength(0)
  })

  test('no false positives on neutral props: count', () => {
    const events = [makeEvent('analytics', ['count'])]
    const matches = detectPII(events)
    expect(matches).toHaveLength(0)
  })

  test('no false positives on neutral props: page, url, timestamp', () => {
    const events = [makeEvent('page-view', ['page', 'url', 'timestamp'])]
    const matches = detectPII(events)
    expect(matches).toHaveLength(0)
  })

  test('detects across multiple events', () => {
    const events = [
      makeEvent('login', ['email', 'password']),
      makeEvent('profile', ['id', 'phone']),
    ]
    const matches = detectPII(events)
    expect(matches.filter(m => m.event === 'login').length).toBeGreaterThanOrEqual(2)
    expect(matches.filter(m => m.event === 'profile').length).toBeGreaterThanOrEqual(1)
  })

  test('returns empty array for events with no fields', () => {
    const events = [makeEvent('app-open', [])]
    const matches = detectPII(events)
    expect(matches).toHaveLength(0)
  })

  test('returns empty array for empty events list', () => {
    const matches = detectPII([])
    expect(matches).toHaveLength(0)
  })

  test('PII_PATTERNS has expected entries', () => {
    const names = PII_PATTERNS.map(p => p.name)
    expect(names).toContain('email')
    expect(names).toContain('phone')
    expect(names).toContain('credit_card')
    expect(names).toContain('password')
    expect(names).toContain('token')
    expect(names).toContain('ssn')
    expect(names).toContain('cpf')
    expect(names).toContain('api_key')
    expect(names).toContain('address')
    expect(names).toContain('dob')
  })
})
