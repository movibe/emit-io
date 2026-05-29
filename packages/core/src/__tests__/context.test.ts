import { describe, expect, test } from 'vitest'
import type { LogEntry, Transport } from '../index.js'
import { EmitIoStrategy, getContext, LogLevelEnum, runWithContext } from '../index.js'

function makeTransport() {
  const entries: LogEntry[] = []
  const transport: Transport = {
    name: 'test',
    minLevel: LogLevelEnum.DEBUG,
    log: (entry) => {
      entries.push(entry)
    },
  }
  return { transport, entries }
}

describe('context propagation via AsyncLocalStorage', () => {
  test('getContext returns undefined outside runWithContext', () => {
    expect(getContext()).toBeUndefined()
  })

  test('runWithContext sync — context applied in log inside', () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    runWithContext({ requestId: 'abc', traceId: 'xyz' }, () => {
      log.info('hello')
    })

    expect(entries).toHaveLength(1)
    expect(entries[0].context).toMatchObject({ requestId: 'abc', traceId: 'xyz' })
  })

  test('runWithContext async — context propagates through await', async () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    await runWithContext({ requestId: 'async-req' }, async () => {
      await Promise.resolve()
      log.info('after await')
      await Promise.resolve()
      log.warn('after second await')
    })

    expect(entries).toHaveLength(2)
    expect(entries[0].context).toMatchObject({ requestId: 'async-req' })
    expect(entries[1].context).toMatchObject({ requestId: 'async-req' })
  })

  test('nested runWithContext — child ctx merges with parent', () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    runWithContext({ requestId: 'parent-req', level: 'outer' }, () => {
      runWithContext({ traceId: 'child-trace', level: 'inner' }, () => {
        log.info('inside nested')
      })
    })

    expect(entries).toHaveLength(1)
    // child ctx overrides parent on same keys, merges otherwise
    expect(entries[0].context).toMatchObject({
      requestId: 'parent-req',
      traceId: 'child-trace',
      level: 'inner',
    })
  })

  test('direct context argument overrides ALS context', () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    runWithContext({ requestId: 'from-als', extra: 'als-extra' }, () => {
      log.info('msg', { requestId: 'from-arg', direct: true })
    })

    expect(entries[0].context).toMatchObject({
      requestId: 'from-arg', // arg wins
      extra: 'als-extra', // als key preserved
      direct: true,
    })
  })

  test('bindings override ALS but direct context arg overrides bindings', () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })
    const child = log.child({ requestId: 'from-binding', svc: 'api' })

    runWithContext({ requestId: 'from-als', traceId: 'tid' }, () => {
      child.info('msg', { requestId: 'from-context' })
    })

    expect(entries[0].context).toMatchObject({
      requestId: 'from-context', // arg wins over binding wins over als
      svc: 'api', // binding preserved
      traceId: 'tid', // als preserved (not overridden by binding or arg)
    })
  })

  test('parallel runWithContext — no leak between branches', async () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    await Promise.all([
      runWithContext({ requestId: 'branch-A' }, async () => {
        await Promise.resolve()
        log.info('from A')
      }),
      runWithContext({ requestId: 'branch-B' }, async () => {
        await Promise.resolve()
        log.info('from B')
      }),
    ])

    expect(entries).toHaveLength(2)
    const msgA = entries.find((e) => e.message === 'from A')
    const msgB = entries.find((e) => e.message === 'from B')
    expect(msgA?.context?.requestId).toBe('branch-A')
    expect(msgB?.context?.requestId).toBe('branch-B')
  })

  test('getContext inside runWithContext returns current context', () => {
    const ctx = { requestId: 'check', traceId: 'tid' }

    runWithContext(ctx, () => {
      expect(getContext()).toEqual(ctx)
    })
  })

  test('log without runWithContext does not add ALS context', () => {
    const { transport, entries } = makeTransport()
    const log = new EmitIoStrategy({ transports: [transport] })

    log.info('no context')

    expect(entries[0].context).toBeUndefined()
  })
})
