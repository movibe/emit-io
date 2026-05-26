# Migration Guide: v2 to v3

## Summary of breaking changes

| What changed | v2 | v3 |
|---|---|---|
| Analytics error call | `logger.error(feature, name, critical, err, extra)` | `logger.captureError(feature, name, critical, err, extra)` |
| Analytics info call | `logger.info(feature, name, properties)` | `logger.logFeature(feature, name, properties)` |
| Typed event registry | `declare global { interface EVENT_TAGS { ... } }` | `declare module '@movibe/logger' { interface EventRegistry { ... } }` |
| Config format | `LoggerStrategyConstructor[]` | `LoggerConfig` with `AnalyticsProvider` instances |

Log-level calls `logger.error('message')` and `logger.info('message')` are **unchanged**.

---

## Step-by-step migration

### 1. Update package

```bash
npm install @movibe/logger@^3.0.0
```

Or with bun:

```bash
bun add @movibe/logger@^3.0.0
```

### 2. Rename analytics calls

Find/replace across your codebase:

| Find | Replace |
|---|---|
| `logger.error('Feature', 'name',` | `logger.captureError('Feature', 'name',` |
| `logger.info('Feature', 'name',` | `logger.logFeature('Feature', 'name',` |

**Important**: only the three-or-more-argument overloads were removed. Single-argument log-level calls are unchanged:

```typescript
// These do NOT change — still valid in v3
logger.error('Something went wrong')
logger.info('Server started', { port: 3000 })
logger.warn('Retry attempt', { count: 3 })
logger.debug('Cache miss', { key: 'user:42' })
```

```typescript
// These MUST be renamed
// v2:
logger.error('Auth', 'login_failed', true, err)
logger.info('Auth', 'login_success', { method: 'oauth' })

// v3:
logger.captureError('Auth', 'login_failed', true, err)
logger.logFeature('Auth', 'login_success', { method: 'oauth' })
```

### 3. Update typed event registry

The global `EVENT_TAGS` augmentation is replaced by module augmentation on `EventRegistry`.

v2:

```typescript
declare global {
  interface EVENT_TAGS {
    'my-event': { foo: string }
    'purchase': { orderId: string; total: number }
  }
}
```

v3:

```typescript
declare module '@movibe/logger' {
  interface EventRegistry {
    'my-event': { foo: string }
    'purchase': { orderId: string; total: number }
  }
}
```

Place this augmentation in a `.d.ts` file (e.g. `src/analytics.d.ts`) or in a file that is included by your `tsconfig.json`.

### 4. Switch to AnalyticsProvider interface

The `LoggerStrategyConstructor[]` array config still works in v3 but emits a deprecation warning and will be removed in v4. Migrate to the `LoggerConfig` object with `AnalyticsProvider` instances.

v2:

```typescript
import { LoggerStrategy, LoggerStrategyType } from '@movibe/logger'

class MyStrategy extends LoggerStrategyType {
  init() {}
  log(name, properties) { /* send to analytics */ }
  event(name, properties) { /* send to analytics */ }
  network(name, properties) {}
  info(feature, name, properties) {}
  error(feature, name, critical, error, extra) {}
  reset() {}
  logScreen(screenName, params) {}
  setUserId(userId) {}
  setUserProperty(name, value) {}
  setUser(properties) {}
  setUserProperties(properties) {}
  logBeginCheckout(checkoutId, properties) {}
  logPaymentSuccess(checkoutId, properties) {}
  flush() {}
  getId() { return 'my-strategy' }
}

const logger = new LoggerStrategy([
  { class: new MyStrategy(), enabled: true }
])
```

v3:

```typescript
import { LoggerStrategy, type AnalyticsProvider } from '@movibe/logger'

const myProvider: AnalyticsProvider = {
  name: 'my-provider',
  enabled: true,
  init() { /* setup */ },
  event(name, properties) { /* send to analytics */ },
  identify(user) { /* set user */ },
  screen(name, params) { /* track screen */ },
  error(feature, name, critical, error, extra) { /* report error */ },
  flush() { /* flush queue */ },
  reset() { /* clear user */ },
}

const logger = new LoggerStrategy({ providers: [myProvider] })
```

The `AnalyticsProvider` interface is a plain object (not a class). All methods are optional — implement only what your analytics backend supports.

### 5. Use new features (optional)

These are new capabilities in v3 that were not available in v2.

**Child loggers** — inherit all providers/transports, add bound context:

```typescript
const reqLog = logger.child({ requestId: 'req-123' })
reqLog.info('handling request')  // context includes requestId
```

**AsyncLocalStorage context** — propagate context across async boundaries without passing it manually:

```typescript
import { runWithContext } from '@movibe/logger'

await runWithContext({ traceId: 'abc' }, async () => {
  await doWork()  // all logger calls here automatically include traceId
})
```

**Plugins** — transform or filter log entries in the pipeline:

```typescript
import { redact, sample, rateLimit, normalizeStack } from '@movibe/logger'

const logger = new LoggerStrategy({
  plugins: [
    redact({ paths: ['password', 'user.token'], censor: '[REDACTED]' }),
    normalizeStack(),
  ],
})
```

**New transports** — structured output and remote ingestion:

```typescript
import { JSONTransport, HTTPTransport, DevToolsTransport } from '@movibe/logger'
```

**Consent gate** — GDPR-compliant analytics opt-out:

```typescript
const logger = new LoggerStrategy({
  consent: { analytics: false, errors: true },
})

// Later, after user accepts:
logger.setConsent({ analytics: true })
```

**Pre-init buffer** — queue events before providers are ready:

```typescript
const logger = new LoggerStrategy({
  preInitBuffer: { size: 100 },
})

// Events queued here
logger.event('app-open')

// Flush buffer when providers are ready
logger.init()
```

**Circuit breaker** — protect against flaky providers:

```typescript
import { circuitBreaker } from '@movibe/logger'

const safeProvider = circuitBreaker(myProvider, {
  failureThreshold: 5,
  cooldownMs: 30_000,
})
```

---

## React migration

The `@movibe/logger-react` package exposes `captureError` on `AnalyticsContextValue`. The old `error` method is kept as a deprecated alias and will be removed in v4.

```typescript
// v2
analytics.error('ReactErrorBoundary', error.name, true, error, extra)

// v3
analytics.captureError('ReactErrorBoundary', error.name, true, error, extra)
```

---

## Common gotchas

**Pre-init buffer is opt-in**. In v2, events called before `init()` were silently dropped or had undefined behavior depending on the strategy. In v3, the buffer must be explicitly enabled:

```typescript
// v3 — opt in to buffering
const logger = new LoggerStrategy({
  preInitBuffer: { size: 100 },
})
```

**Consent default is allow-all**. `analytics: true, errors: true` is the default. To restrict by default, set consent in the constructor:

```typescript
const logger = new LoggerStrategy({
  consent: { analytics: false },
})
```

**`LoggerStrategyType` abstract class is deprecated**. It still works in v3 but will be removed in v4. Migrate implementing classes to the `AnalyticsProvider` plain-object interface.

**`close()` is async**. Call `await logger.close()` for graceful shutdown to ensure HTTP transport queues are flushed before the process exits.

---

## v2 items still working in v3

| Item | Status |
|---|---|
| `LoggerStrategyConstructor[]` config | Works, emits `console.warn`. Migrate to `LoggerConfig`. |
| `LoggerStrategyType` abstract class | Works, marked `@deprecated`. Migrate to `AnalyticsProvider`. |
| `log()`, `network()`, `setUserId()`, `setUserProperty()`, `setUser()`, `setUserProperties()`, `logBeginCheckout()`, `logPaymentSuccess()` | Unchanged. |

## Removed in v3

| Item | Status |
|---|---|
| `logger.error(feature, name, critical, err)` overload | **Removed**. Use `logger.captureError(...)`. |
| `logger.info(feature, name, properties)` overload | **Removed**. Use `logger.logFeature(...)`. |
| Global `EVENT_TAGS` augmentation | **Removed**. Use `EventRegistry` module augmentation. |
