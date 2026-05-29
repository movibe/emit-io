import { describe, expect, test } from 'vitest'
import { redact } from '../plugins/redact.js'
import type { LogEntry } from '../types.js'
import { LogLevel } from '../types.js'

function makeEntry(context?: Record<string, unknown>): LogEntry {
  return {
    level: LogLevel.INFO,
    message: 'test',
    timestamp: new Date(),
    context,
  }
}

describe('redact', () => {
  test('path simples: redacta campo de nível raiz', () => {
    const plugin = redact({ paths: ['password'] })
    const entry = makeEntry({ password: 'secret123', name: 'alice' })
    const result = plugin(entry)!
    expect(result.context?.password).toBe('[REDACTED]')
    expect(result.context?.name).toBe('alice')
  })

  test('path aninhado: redacta campo profundo, preserva vizinhos', () => {
    const plugin = redact({ paths: ['user.token'] })
    const entry = makeEntry({ user: { token: 'tok', name: 'bob' } })
    const result = plugin(entry)!
    expect((result.context?.user as any).token).toBe('[REDACTED]')
    expect((result.context?.user as any).name).toBe('bob')
  })

  test('wildcard *.secret atinge todas as chaves de nível 1', () => {
    const plugin = redact({ paths: ['*.secret'] })
    const entry = makeEntry({ a: { secret: 'x' }, b: { secret: 'y' }, c: { other: 'z' } })
    const result = plugin(entry)!
    expect((result.context?.a as any).secret).toBe('[REDACTED]')
    expect((result.context?.b as any).secret).toBe('[REDACTED]')
    expect((result.context?.c as any).other).toBe('z')
  })

  test('path inexistente: no-op silencioso', () => {
    const plugin = redact({ paths: ['nonexistent', 'deep.missing.path'] })
    const entry = makeEntry({ foo: 'bar' })
    const result = plugin(entry)!
    expect(result.context).toEqual({ foo: 'bar' })
  })

  test('censor customizado é respeitado', () => {
    const plugin = redact({ paths: ['token'], censor: '***' })
    const entry = makeEntry({ token: 'abc' })
    const result = plugin(entry)!
    expect(result.context?.token).toBe('***')
  })

  test('remove: true deleta o campo em vez de substituir', () => {
    const plugin = redact({ paths: ['password'], remove: true })
    const entry = makeEntry({ password: 'pw', name: 'carol' })
    const result = plugin(entry)!
    expect('password' in result.context!).toBe(false)
    expect(result.context?.name).toBe('carol')
  })

  test('remove: false (default) substitui pelo censor', () => {
    const plugin = redact({ paths: ['password'] })
    const entry = makeEntry({ password: 'pw' })
    const result = plugin(entry)!
    expect('password' in result.context!).toBe(true)
    expect(result.context?.password).toBe('[REDACTED]')
  })

  test('não muta o context original', () => {
    const plugin = redact({ paths: ['password'] })
    const originalContext = { password: 'original', name: 'dave' }
    const entry = makeEntry(originalContext)
    plugin(entry)
    expect(originalContext.password).toBe('original')
  })

  test('context ausente: retorna entry inalterado', () => {
    const plugin = redact({ paths: ['password'] })
    const entry = makeEntry(undefined)
    const result = plugin(entry)!
    expect(result).toBe(entry)
    expect(result.context).toBeUndefined()
  })

  test('múltiplos paths em uma única call', () => {
    const plugin = redact({
      paths: ['password', 'user.token', '*.secret', 'headers.authorization'],
    })
    const entry = makeEntry({
      password: 'p',
      user: { token: 't', name: 'n' },
      foo: { secret: 's' },
      headers: { authorization: 'Bearer xyz', accept: 'application/json' },
    })
    const result = plugin(entry)!
    expect(result.context?.password).toBe('[REDACTED]')
    expect((result.context?.user as any).token).toBe('[REDACTED]')
    expect((result.context?.user as any).name).toBe('n')
    expect((result.context?.foo as any).secret).toBe('[REDACTED]')
    expect((result.context?.headers as any).authorization).toBe('[REDACTED]')
    expect((result.context?.headers as any).accept).toBe('application/json')
  })

  test('wildcard com remove: true deleta os campos afetados', () => {
    const plugin = redact({ paths: ['*.secret'], remove: true })
    const entry = makeEntry({ a: { secret: 'x', keep: 1 }, b: { secret: 'y' } })
    const result = plugin(entry)!
    expect('secret' in (result.context?.a as any)).toBe(false)
    expect((result.context?.a as any).keep).toBe(1)
    expect('secret' in (result.context?.b as any)).toBe(false)
  })
})
