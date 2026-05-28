import type {
  EVENT_TAGS, LOG_TAGS, NETWORK_ANALYTICS_TAGS, User,
  BeginCheckoutEvent, LoggerStrategyConstructor, LoggerStrategyType,
  PurchaseLogEvent, LogLevel, LogEntry, Transport, Plugin,
  AnalyticsProvider, EmitIoStrategyConfig, RegisteredEvents, ConsentState
} from './types.js'

import { LogLevel as LogLevelEnum } from './types.js'
import { getContext } from './context.js'

function createLogEntry(level: LogLevelEnum, message: string, context?: Record<string, unknown>, error?: Error): LogEntry {
  return { level, message, timestamp: new Date(), context, error }
}

export class EmitIoStrategy<
  TLogTags extends string = LOG_TAGS,
  TNetworkTags extends string = NETWORK_ANALYTICS_TAGS,
  TUser extends { id: string } = User,
  TBeginCheckout extends { currency?: string; value?: number } = BeginCheckoutEvent,
  TPurchase extends { type: string } = PurchaseLogEvent,
  TEvent extends Record<string, any> = RegisteredEvents
> {
  private providers: AnalyticsProvider<TEvent, TUser>[] = []
  private legacyStrategies: LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>[] = []
  private legacyStrategyMap = new Map<string, LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>>()
  private transports: Transport[] = []
  private plugins: Plugin[] = []
  private emitAppOpenOnInit: boolean
  private initialized = false
  private bindings: Record<string, unknown> = {}
  private preInitBuffer?: Array<() => void>
  private preInitBufferSize = 100
  private isBuffering = false
  private consent: ConsentState = { analytics: true, errors: true }

  constructor(config?: EmitIoStrategyConfig<TEvent, TUser> | LoggerStrategyConstructor<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>[])
  constructor(
    config?: EmitIoStrategyConfig<TEvent, TUser> | LoggerStrategyConstructor<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>[]
  ) {
    this.emitAppOpenOnInit = true

    if (!config) return

    if (Array.isArray(config)) {
      console.warn('[EmitIoStrategy] LoggerStrategyConstructor array is deprecated; pass EmitIoStrategyConfig with AnalyticsProvider instances. Will be removed in v4.')
      for (const injector of config) {
        if (injector.enabled) {
          this.legacyStrategies.push(injector.class)
          const id = injector.class.getId?.()
          if (id) {
            this.legacyStrategyMap.set(id, injector.class)
          }
        }
      }
    } else {
      if (config.providers) {
        this.providers.push(...config.providers.filter(p => p.enabled))
      }
      if (config.transports) {
        this.transports.push(...config.transports)
      }
      if (config.plugins) {
        this.plugins.push(...config.plugins)
      }
      if (config.emitAppOpenOnInit !== undefined) {
        this.emitAppOpenOnInit = config.emitAppOpenOnInit
      }
      if (config.preInitBuffer) {
        this.preInitBufferSize = config.preInitBuffer.size ?? 100
        this.preInitBuffer = []
        this.isBuffering = true
      }
      if (config.consent) {
        this.consent = { analytics: true, errors: true, ...config.consent }
      }
    }
  }

  setConsent(state: Partial<ConsentState>): void {
    this.consent = { ...this.consent, ...state }
  }

  getConsent(): ConsentState {
    return { ...this.consent }
  }

  // ============================================================
  // Pre-init buffer
  // ============================================================

  private bufferOrRun(fn: () => void): void {
    if (this.isBuffering && this.preInitBuffer) {
      if (this.preInitBuffer.length >= this.preInitBufferSize) {
        this.preInitBuffer.shift()
      }
      this.preInitBuffer.push(fn)
      return
    }
    fn()
  }

  // ============================================================
  // Plugin + Transport Pipeline
  // ============================================================

  addPlugin(plugin: Plugin): void {
    this.plugins.push(plugin)
  }

  addTransport(transport: Transport): void {
    this.transports.push(transport)
  }

  addProvider(provider: AnalyticsProvider<TEvent, TUser>): void {
    if (provider.enabled) {
      this.providers.push(provider)
    }
  }

  private runPipeline(entry: LogEntry): LogEntry | null {
    let current: LogEntry | null = entry
    for (const plugin of this.plugins) {
      current = plugin(current)
      if (current === null) return null
    }
    return current
  }

  child(bindings: Record<string, unknown>): EmitIoStrategy<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent> {
    const c = new EmitIoStrategy<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>()
    c.providers = this.providers
    c.legacyStrategies = this.legacyStrategies
    c.legacyStrategyMap = this.legacyStrategyMap
    c.transports = this.transports
    c.plugins = this.plugins
    c.bindings = { ...this.bindings, ...bindings }
    c.initialized = this.initialized
    c.emitAppOpenOnInit = false
    c.consent = { ...this.consent }
    return c
  }

  private emitToTransports(entry: LogEntry): void {
    const alsCtx = getContext()
    const hasAlsCtx = alsCtx !== undefined && Object.keys(alsCtx).length > 0
    const hasBindings = Object.keys(this.bindings).length > 0
    const hasEntryCtx = entry.context !== undefined

    let merged: LogEntry
    if (hasAlsCtx || hasBindings || hasEntryCtx) {
      merged = {
        ...entry,
        context: { ...alsCtx, ...this.bindings, ...entry.context },
      }
    } else {
      merged = entry
    }

    const processed = this.runPipeline(merged)
    if (processed === null) return

    for (const transport of this.transports) {
      if (transport.enabled !== false && processed.level >= transport.minLevel) {
        transport.log(processed)
      }
    }
  }

  private forEachTransport(fn: (t: Transport) => void): void {
    for (const transport of this.transports) {
      fn(transport)
    }
  }

  // ============================================================
  // Log Level-based methods (v2 API) — NOT buffered
  // ============================================================

  debug(message: string, context?: Record<string, unknown>): void {
    this.emitToTransports(createLogEntry(LogLevelEnum.DEBUG, message, context))
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.emitToTransports(createLogEntry(LogLevelEnum.WARN, message, context))
  }

  fatal(message: string, context?: Record<string, unknown>): void {
    this.emitToTransports(createLogEntry(LogLevelEnum.FATAL, message, context))
  }

  // ============================================================
  // Provider execution
  // ============================================================

  private executeOnProviders<T>(
    methodName: string,
    callback: (provider: AnalyticsProvider<TEvent, TUser>) => T
  ): void {
    for (const provider of this.providers) {
      try {
        callback(provider)
      } catch (e) {
        console.error(`[EmitIoStrategy] provider error in ${methodName}:`, e)
      }
    }
  }

  private executeOnLegacy<T>(
    methodName: string,
    callback: (strategy: LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>) => T
  ): void {
    for (const strategy of this.legacyStrategies) {
      try {
        callback(strategy)
      } catch (e) {
        console.error(`[EmitIoStrategy] legacy error in ${methodName}:`, e)
      }
    }
  }

  private executeOnAll<T>(
    methodName: string,
    legacyFn: (s: LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent>) => T,
    providerFn: (p: AnalyticsProvider<TEvent, TUser>) => T
  ): void {
    this.executeOnLegacy(methodName, legacyFn)
    this.executeOnProviders(methodName, providerFn)
  }

  // ============================================================
  // error() — log-level only (v3 API)
  // ============================================================

  error(message: string, context?: Record<string, unknown>): void {
    this.emitToTransports(createLogEntry(LogLevelEnum.ERROR, message, context))
  }

  // ============================================================
  // captureError() — analytics error (v3 API, replaces error overload)
  // ============================================================

  captureError(feature: string, name: string, critical: boolean, err: Error, extra?: Record<string, unknown>): void {
    // Always emit to transport (structural log) regardless of consent
    this.emitToTransports(
      createLogEntry(LogLevelEnum.ERROR, `[${feature}] ${name}`, { ...extra, critical }, err)
    )
    // Analytics error gate: only call providers if errors consent is granted
    if (this.consent.errors === false) return
    this.executeOnAll('captureError',
      (s) => s.error?.(feature, name, critical, err, extra),
      (p) => p.error?.(feature, name, critical, err, extra)
    )
  }

  // ============================================================
  // Legacy analytics methods (backward compatible)
  // ============================================================

  init(): void {
    if (this.initialized) return
    this.initialized = true
    this.isBuffering = false

    this.executeOnAll('init',
      (s) => s.init?.(),
      (p) => p.init?.()
    )

    if (this.preInitBuffer) {
      const buf = this.preInitBuffer
      this.preInitBuffer = undefined
      for (const fn of buf) fn()
    }

    if (this.emitAppOpenOnInit) {
      this.event('app-open' as any)
    }
  }

  log(name: TLogTags, properties?: Record<string, any>): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnLegacy('log', (s) => {
        s.log?.(name, properties)
      })
      this.emitToTransports(createLogEntry(LogLevelEnum.INFO, String(name), properties))
    })
  }

  event<K extends keyof TEvent>(name: K, properties?: TEvent[K]): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnAll('event',
        (s) => s.event?.(name, properties),
        (p) => p.event?.(name, properties)
      )
    })
  }

  network(name: TNetworkTags, properties?: Record<string, any>): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnLegacy('network', (s) => {
        s.network?.(name, properties)
      })
    })
  }

  // ============================================================
  // info() — log-level only (v3 API)
  // ============================================================

  info(message: string, context?: Record<string, unknown>): void {
    this.emitToTransports(createLogEntry(LogLevelEnum.INFO, message, context))
  }

  // ============================================================
  // logFeature() — analytics info (v3 API, replaces info overload)
  // ============================================================

  logFeature(feature: string, name: string, properties?: Record<string, any> | string | boolean): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnLegacy('info', (s) => {
        s.info?.(feature, name, properties)
      })
      this.emitToTransports(createLogEntry(LogLevelEnum.INFO, `[${feature}] ${name}`, { properties }))
    })
  }

  logScreen(screenName: string, params?: Record<string, any>): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnAll('screen',
        (s) => s.logScreen?.(screenName, params),
        (p) => p.screen?.(screenName, params)
      )
    })
  }

  setUserId(userId: string): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnLegacy('setUserId', (s) => {
        s.setUserId?.(userId)
      })
    })
  }

  setUserProperty(name: string, value: Record<string, any>): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      this.executeOnLegacy('setUserProperty', (s) => {
        s.setUserProperty?.(name, value)
      })
    })
  }

  setUser(properties: TUser): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      if (!properties?.id) {
        this.executeOnAll('error',
          (s) => s.error?.('EmitIoStrategy', 'setUser', false, new Error('User ID is required')),
          (p) => p.error?.('EmitIoStrategy', 'setUser', false, new Error('User ID is required'))
        )
        return
      }

      this.executeOnAll('identify',
        (s) => s.setUser?.(properties),
        (p) => p.identify?.(properties)
      )
    })
  }

  setUserProperties(properties: Record<string, any>): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      if (!properties || Object.keys(properties).length === 0) {
        return
      }

      this.executeOnLegacy('setUserProperties', (s) => {
        s.setUserProperties?.(properties)
      })
    })
  }

  logBeginCheckout(checkoutId: string, params: TBeginCheckout): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      if (!checkoutId) {
        this.executeOnAll('error',
          (s) => s.error?.('EmitIoStrategy', 'logBeginCheckout', false, new Error('Checkout ID is required')),
          (p) => p.error?.('EmitIoStrategy', 'logBeginCheckout', false, new Error('Checkout ID is required'))
        )
        return
      }

      this.executeOnLegacy('logBeginCheckout', (s) => {
        s.logBeginCheckout?.(checkoutId, params)
      })
    })
  }

  logPaymentSuccess(checkoutId: string, params: TPurchase): void {
    if (this.consent.analytics === false) return
    this.bufferOrRun(() => {
      if (!checkoutId || !params?.type) {
        this.executeOnAll('error',
          (s) => s.error?.('EmitIoStrategy', 'logPaymentSuccess', false, new Error('Checkout ID and payment type are required')),
          (p) => p.error?.('EmitIoStrategy', 'logPaymentSuccess', false, new Error('Checkout ID and payment type are required'))
        )
        return
      }

      this.executeOnLegacy('logPaymentSuccess', (s) => {
        s.logPaymentSuccess?.(checkoutId, params)
      })
    })
  }

  flush(): void {
    this.executeOnAll('flush',
      (s) => s.flush?.(),
      (p) => p.flush?.()
    )
    this.forEachTransport((t) => t.flush?.())
  }

  async close(): Promise<void> {
    this.executeOnAll('flush',
      (s) => s.flush?.(),
      (p) => p.flush?.()
    )
    await Promise.all(
      this.transports.map(t => Promise.resolve(t.flush?.()))
    )
  }

  reset(): void {
    this.executeOnAll('reset',
      (s) => s.reset?.(),
      (p) => p.reset?.()
    )
  }

  getStrategy(id: string): AnalyticsProvider<TEvent, TUser> | LoggerStrategyType<TLogTags, TNetworkTags, TUser, TBeginCheckout, TPurchase, TEvent> | undefined {
    const fromProviders = this.providers.find(p => p.name === id)
    if (fromProviders) return fromProviders
    return this.legacyStrategyMap.get(id)
  }

  hasStrategy(id: string): boolean {
    return this.providers.some(p => p.name === id) || this.legacyStrategyMap.has(id)
  }
}

// Re-export all public types
export type {
  LOG_TAGS, EVENT_TAGS, NETWORK_ANALYTICS_TAGS,
  User, LogItem, CheckoutData, PaymentData,
  BeginCheckoutEvent, PurchaseLogEvent, Item,
  LoggerStrategyConstructor, LoggerStrategyType,
  LogLevel, LogEntry, Transport, Plugin,
  AnalyticsProvider,EmitIoStrategyConfig,
  EventRegistry, RegisteredEvents,
  ConsentState,
} from './types.js'

export { LogLevel as LogLevelEnum } from './types.js'
export { resolveEnabled } from './types.js'

// Built-in transports and providers
export {
  ConsoleTransport,
  ConsoleProvider,
} from './console.js'
export type {
  ConsoleTransportOptions,
  ConsoleProviderOptions,
} from './console.js'

export { JSONTransport } from './json-transport.js'
export type { JSONTransportOptions } from './json-transport.js'

export { sample, rateLimit, redact, normalizeStack } from './plugins/index.js'
export type { SampleOptions, RateLimitOptions, RedactOptions, NormalizeStackOptions, StackFrame } from './plugins/index.js'

export { runWithContext, getContext } from './context.js'

export { circuitBreaker } from './circuit-breaker.js'
export type { CircuitBreakerOptions, CircuitState } from './circuit-breaker.js'

export { HTTPTransport } from './http-transport.js'
export type { HTTPTransportOptions } from './http-transport.js'

export { DevToolsTransport } from './devtools-transport.js'
export type { DevToolsTransportOptions } from './devtools-transport.js'
