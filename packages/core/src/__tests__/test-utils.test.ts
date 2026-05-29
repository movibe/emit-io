import { describe, expect, test } from 'vitest'
import { EmitIoStrategy } from '../index.js'
import { createMockProvider, createMockTransport, createTestEmitter } from '../test-utils.js'
import { LogLevel } from '../types.js'

describe('createMockTransport', () => {
  test('captures log entries', () => {
    const transport = createMockTransport()
    const emit = new EmitIoStrategy({ transports: [transport] })
    emit.info('hello', { id: 1 })
    expect(transport.entries).toHaveLength(1)
    expect(transport.entries[0].message).toBe('hello')
    expect(transport.entries[0].context).toEqual({ id: 1 })
  })

  test('reflects level in entry', () => {
    const transport = createMockTransport()
    const emit = new EmitIoStrategy({ transports: [transport] })
    emit.warn('warning msg')
    expect(transport.entries[0].level).toBe(LogLevel.WARN)
  })

  test('reflects error in entry', () => {
    const transport = createMockTransport()
    const emit = new EmitIoStrategy({ transports: [transport] })
    const err = new Error('boom')
    emit.captureError('feature', 'err-name', true, err)
    expect(transport.entries[0].error).toBe(err)
  })

  test('clear() resets entries and flushCalls', () => {
    const transport = createMockTransport()
    const emit = new EmitIoStrategy({ transports: [transport] })
    emit.info('msg')
    emit.flush()
    expect(transport.entries).toHaveLength(1)
    expect(transport.flushCalls).toBe(1)
    transport.clear()
    expect(transport.entries).toHaveLength(0)
    expect(transport.flushCalls).toBe(0)
  })

  test('default name and minLevel', () => {
    const transport = createMockTransport()
    expect(transport.name).toBe('mock-transport')
    expect(transport.minLevel).toBe(LogLevel.DEBUG)
  })

  test('accepts custom name and minLevel', () => {
    const transport = createMockTransport({ name: 'my-transport', minLevel: LogLevel.WARN })
    expect(transport.name).toBe('my-transport')
    expect(transport.minLevel).toBe(LogLevel.WARN)
  })

  test('entries below minLevel are not logged', () => {
    const transport = createMockTransport({ minLevel: LogLevel.WARN })
    const emit = new EmitIoStrategy({ transports: [transport] })
    emit.debug('debug msg')
    emit.info('info msg')
    emit.warn('warn msg')
    expect(transport.entries).toHaveLength(1)
    expect(transport.entries[0].message).toBe('warn msg')
  })
})

describe('createMockProvider', () => {
  test('captures events array', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.event('user-login', { method: 'email' })
    expect(provider.events).toHaveLength(1)
    expect(provider.events[0].name).toBe('user-login')
    expect(provider.events[0].properties).toEqual({ method: 'email' })
  })

  test('events with properties', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.event('add-to-cart', { product_id: 'p1', quantity: 2 })
    expect(provider.events[0].properties).toEqual({ product_id: 'p1', quantity: 2 })
  })

  test('identifies array populated by setUser', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.setUser({ id: 'u1' })
    expect(provider.identifies).toHaveLength(1)
    expect(provider.identifies[0]).toEqual({ id: 'u1' })
  })

  test('screens array populated by logScreen', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.logScreen('HomeScreen', { from: 'nav' })
    expect(provider.screens).toHaveLength(1)
    expect(provider.screens[0].name).toBe('HomeScreen')
    expect(provider.screens[0].params).toEqual({ from: 'nav' })
  })

  test('errors array populated by captureError() call', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    const err = new Error('oops')
    emit.captureError('feature', 'err-name', true, err, { extra: 'data' })
    expect(provider.errors).toHaveLength(1)
    expect(provider.errors[0].feature).toBe('feature')
    expect(provider.errors[0].name).toBe('err-name')
    expect(provider.errors[0].critical).toBe(true)
    expect(provider.errors[0].error).toBe(err)
  })

  test('initCalls counter increments on init()', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.init()
    expect(provider.initCalls).toBe(1)
  })

  test('flushCalls counter increments on flush()', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.flush()
    emit.flush()
    expect(provider.flushCalls).toBe(2)
  })

  test('resetCalls counter increments on reset()', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.reset()
    expect(provider.resetCalls).toBe(1)
  })

  test('clear() resets all state', () => {
    const provider = createMockProvider()
    const emit = new EmitIoStrategy({ providers: [provider], emitAppOpenOnInit: false })
    emit.event('user-login', { method: 'email' })
    emit.setUser({ id: 'u1' })
    emit.logScreen('HomeScreen')
    emit.flush()
    emit.reset()
    provider.clear()
    expect(provider.events).toHaveLength(0)
    expect(provider.identifies).toHaveLength(0)
    expect(provider.screens).toHaveLength(0)
    expect(provider.flushCalls).toBe(0)
    expect(provider.resetCalls).toBe(0)
  })

  test('default name and enabled', () => {
    const provider = createMockProvider()
    expect(provider.name).toBe('mock-provider')
    expect(provider.enabled).toBe(true)
  })

  test('accepts custom name and enabled', () => {
    const provider = createMockProvider({ name: 'my-provider', enabled: false })
    expect(provider.name).toBe('my-provider')
    expect(provider.enabled).toBe(false)
  })
})

describe('createTestEmitter', () => {
  test('composes transport and provider into logger', () => {
    const { emit, transport } = createTestEmitter()
    emit.info('test')
    expect(transport.entries[0].message).toBe('test')
  })

  test('transport entries accessible', () => {
    const { emit, transport } = createTestEmitter()
    emit.debug('debug')
    emit.warn('warn')
    expect(transport.entries).toHaveLength(2)
  })

  test('provider events accessible', () => {
    const { emit, provider } = createTestEmitter()
    emit.event('user-login', { method: 'google' })
    expect(provider.events).toHaveLength(1)
    expect(provider.events[0].name).toBe('user-login')
  })

  test('clear() works independently on transport and provider', () => {
    const { emit, transport, provider } = createTestEmitter()
    emit.info('msg')
    emit.event('user-login', { method: 'email' })
    transport.clear()
    provider.clear()
    expect(transport.entries).toHaveLength(0)
    expect(provider.events).toHaveLength(0)
  })

  test('no app-open event emitted by default (emitAppOpenOnInit: false)', () => {
    const { emit, provider } = createTestEmitter()
    emit.init()
    expect(provider.events).toHaveLength(0)
  })
})
