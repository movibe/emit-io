import { test, expect, describe, vi, beforeEach, afterEach } from 'vitest'

describe('runtime guards — context.ts no-op store without process', () => {
  let originalProcess: typeof globalThis.process

  beforeEach(() => {
    originalProcess = globalThis.process
  })

  afterEach(() => {
    globalThis.process = originalProcess
    vi.resetModules()
  })

  test('context module loads with no process — getContext returns undefined', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const mod = await import('../context.js')
    expect(mod.getContext()).toBeUndefined()
  })

  test('runWithContext with no process — does not throw and returns fn result', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const mod = await import('../context.js')
    const result = mod.runWithContext({ x: 1 }, () => 42)
    expect(result).toBe(42)
  })

  test('runWithContext with no process — nested calls do not throw', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const mod = await import('../context.js')
    expect(() =>
      mod.runWithContext({ a: 1 }, () => {
        mod.runWithContext({ b: 2 }, () => {})
      })
    ).not.toThrow()
  })
})

describe('runtime guards — JSONTransport without process', () => {
  let originalProcess: typeof globalThis.process
  let consoleSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    originalProcess = globalThis.process
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    globalThis.process = originalProcess
    consoleSpy.mockRestore()
    vi.resetModules()
  })

  test('JSONTransport falls back to console.log when process is undefined', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const { JSONTransport } = await import('../json-transport.js')
    const { LogLevel } = await import('../types.js')
    const transport = new JSONTransport()
    expect(() =>
      transport.log({
        level: LogLevel.INFO,
        message: 'hello from browser',
        timestamp: new Date(),
      })
    ).not.toThrow()
    expect(consoleSpy).toHaveBeenCalled()
  })

  test('JSONTransport custom write option works regardless of process', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const lines: string[] = []
    const { JSONTransport } = await import('../json-transport.js')
    const { LogLevel } = await import('../types.js')
    const transport = new JSONTransport({ write: (line) => lines.push(line) })
    transport.log({
      level: LogLevel.WARN,
      message: 'custom write',
      timestamp: new Date(),
    })
    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('custom write')
  })
})

describe('runtime guards — EmitIoStrategy works without process', () => {
  let originalProcess: typeof globalThis.process

  beforeEach(() => {
    originalProcess = globalThis.process
  })

  afterEach(() => {
    globalThis.process = originalProcess
    vi.resetModules()
  })

  test('EmitIoStrategy info/warn/error do not throw without process', async () => {
    delete (globalThis as any).process
    vi.resetModules()
    const { EmitIoStrategy } = await import('../index.js')
    const entries: unknown[] = []
    const logger = new EmitIoStrategy({
      transports: [{
        name: 'mem',
        minLevel: 0,
        log: (e) => entries.push(e),
      }],
      emitAppOpenOnInit: false,
    })
    expect(() => logger.info('info msg')).not.toThrow()
    expect(() => logger.warn('warn msg')).not.toThrow()
    expect(() => logger.error('error msg')).not.toThrow()
    expect(entries).toHaveLength(3)
  })
})
