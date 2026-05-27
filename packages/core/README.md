# emit-io-core

Core logging + analytics library for TypeScript — Node, browser, edge, React Native.

## Install

```bash
npm install emit-io-core
```

## Quick Start

```typescript
import {
  LoggerStrategy,
  ConsoleTransport,
  JSONTransport,
  HTTPTransport,
  redact,
  sample,
  LogLevelEnum,
} from 'emit-io-core'

const emit = new LoggerStrategy({
  transports: [
    new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true }),
    new JSONTransport({ minLevel: LogLevelEnum.INFO }),
  ],
  plugins: [
    redact({ paths: ['password', '*.secret'] }),
    sample({ rate: 0.1, levels: [LogLevelEnum.DEBUG] }),
  ],
  consent: { analytics: true, errors: true },
})

// Structured log levels
emit.debug('query executed', { sql: 'SELECT 1', ms: 3 })
emit.info('server started', { port: 3000 })
emit.warn('slow response', { ms: 1200 })
emit.error('db connection lost', { host: 'pg-primary' })
emit.fatal('out of memory')

// Analytics error — writes to transport AND dispatches to providers
emit.captureError('Auth', 'login_failed', true, new Error('bad token'), { userId: 'u-1' })

// Analytics event
emit.event('purchase', { orderId: 'x', total: 99 })

// Feature info (analytics + transport)
emit.logFeature('Checkout', 'step_completed', { step: 2 })
```

## API

### `new LoggerStrategy(config?)`

```typescript
interface LoggerConfig {
  transports?: Transport[]
  providers?: AnalyticsProvider[]
  plugins?: Plugin[]
  consent?: { analytics?: boolean; errors?: boolean }
  preInitBuffer?: { size?: number }
  emitAppOpenOnInit?: boolean
}
```

### Log level methods

| Method | Level | Description |
|---|---|---|
| `debug(msg, ctx?)` | DEBUG | Verbose debug output |
| `info(msg, ctx?)` | INFO | Informational |
| `warn(msg, ctx?)` | WARN | Warning |
| `error(msg, ctx?)` | ERROR | Structured error log |
| `fatal(msg, ctx?)` | FATAL | Fatal / process-ending |

### Analytics methods

| Method | Description |
|---|---|
| `captureError(feature, name, critical, err, extra?)` | Error to transports + providers |
| `event(name, properties?)` | Custom analytics event |
| `logFeature(feature, name, properties?)` | Analytics + transport info |
| `logScreen(name, params?)` | Screen / page view |
| `setUser(user)` | Identify user (requires `id`) |
| `setUserId(id)` | Set user ID only |
| `setUserProperty(name, value)` | Set one user property |
| `setUserProperties(props)` | Set multiple user properties |
| `logBeginCheckout(checkoutId, params)` | E-commerce checkout start |
| `logPaymentSuccess(checkoutId, params)` | E-commerce payment |

### Other methods

| Method | Description |
|---|---|
| `child(bindings)` | Returns a new logger that merges `bindings` into every entry |
| `addTransport(t)` | Add a transport at runtime |
| `addPlugin(p)` | Add a plugin at runtime |
| `addProvider(p)` | Add a provider at runtime |
| `setConsent(state)` | Update consent flags |
| `getConsent()` | Read current consent state |
| `init()` | Initialize providers + flush pre-init buffer |
| `flush()` | Sync flush all transports |
| `close()` | Async flush then stop |
| `reset()` | Reset user state on all providers |

## Transports

### `ConsoleTransport`

```typescript
new ConsoleTransport({ minLevel: LogLevelEnum.DEBUG, pretty: true })
```

### `JSONTransport`

```typescript
new JSONTransport({ minLevel: LogLevelEnum.INFO })
// Custom write (e.g. file stream):
new JSONTransport({ write: (line) => fs.appendFileSync('app.log', line) })
```

### `HTTPTransport`

```typescript
new HTTPTransport({
  url: 'https://logs.example.com/ingest',
  minLevel: LogLevelEnum.WARN,
  batchSize: 50,
  flushIntervalMs: 5000,
  maxRetries: 3,
  retryBackoffMs: 1000,
  headers: { Authorization: 'Bearer token' },
})
```

### `DevToolsTransport`

```typescript
new DevToolsTransport({ url: 'ws://localhost:9999' })
```

Connects via WebSocket to a devtools panel. Buffers entries while disconnected and drains on reconnect.

## Plugins

Built-in plugins are plain `(entry: LogEntry) => LogEntry | null` functions.

```typescript
import { redact, sample, rateLimit, normalizeStack } from 'emit-io-core'

redact({ paths: ['password', 'user.token', '*.secret'] })
sample({ rate: 0.05, levels: [LogLevelEnum.DEBUG] })
rateLimit({ maxPerSecond: 100 })
normalizeStack({ maxFrames: 10 })
```

## Type-Safe Events

```typescript
declare module 'emit-io-core' {
  interface EventRegistry {
    'purchase': { orderId: string; total: number }
    'page-view': { path: string }
  }
}

emit.event('purchase', { orderId: 'x', total: 99 })  // typed
emit.event('unknown', {})  // TS error
```

## Child Loggers + ALS Context

```typescript
const reqLog = emit.child({ requestId: 'abc-123' })
reqLog.info('request received')  // logs include requestId

import { runWithContext } from 'emit-io-core'
await runWithContext({ traceId: 'tx-1' }, async () => {
  reqLog.info('in trace')  // merges traceId from ALS + requestId from binding
})
```

`runWithContext` uses `AsyncLocalStorage` on Node/edge; falls back to a no-op on environments without it.

## Consent Gate

```typescript
emit.setConsent({ analytics: false })   // block events/identify/screen
emit.setConsent({ analytics: true })    // re-enable after user consent
// errors: false → transport still receives the entry; providers do not
```

## Circuit Breaker

```typescript
import { circuitBreaker } from 'emit-io-core'

const safe = circuitBreaker(myProvider, {
  failureThreshold: 5,
  cooldownMs: 30_000,
  onStateChange: (state, name) => emit.warn('circuit', { state, name }),
})
new LoggerStrategy({ providers: [safe] })
```

## Pre-Init Buffer

```typescript
const emit = new LoggerStrategy({
  preInitBuffer: { size: 100 },
})

emit.event('app-open')   // buffered

// Later, after async config is loaded:
emit.init()              // flushes buffer → providers
```

## Test Helpers

```typescript
import { createTestLogger } from 'emit-io-core/test'

const { logger, entries } = createTestLogger()
emit.info('hello', { x: 1 })
// entries() returns all LogEntry objects captured so far
```

## License

MIT
