# @emit-io/codegen

CLI code generator for [@emit-io/core](https://github.com/Emit-io/emit) — define analytics events in YAML, get a typed TypeScript tracker, drift detection, and JSON Schema / Avro export.

## Install

```bash
npm install --save-dev @emit-io/codegen
# or run without installing:
npx @emit-io/codegen --help
```

## Quick Start

### 1. Define a schema

```yaml
# analytics-schema.yaml
events:
  purchase:
    description: "User completes a purchase"
    orderId: string
    total: number
    currency?: string   # optional field

  page-view:
    path: string
    referrer?: string

  user-signed-up:
    method: string
    plan: string
```

Fields use the format `fieldName: type` for required fields, `fieldName?: type` for optional. Supported types: `string`, `number`, `boolean`.

### 2. Generate TypeScript types + tracker

```bash
npx @emit-io/codegen generate analytics-schema.yaml --out src/analytics
```

Outputs:
- `src/analytics/analytics-events.types.ts` — `EventRegistry` augmentation + per-event interfaces
- `src/analytics/analytics-tracker.ts` — typed wrapper around `LoggerStrategy`

### 3. Use the generated tracker

```typescript
import { createAnalyticsTracker } from './analytics/analytics-tracker'
import { LoggerStrategy } from '@emit-io/core'

const logger = new LoggerStrategy({ /* ... */ })
const tracker = createAnalyticsTracker(logger)

tracker.purchase({ orderId: 'x', total: 99 })      // typed
tracker['page-view']({ path: '/home' })            // typed
tracker['user-signed-up']({ method: 'google', plan: 'pro' })
```

## Commands

### `generate`

```bash
npx @emit-io/codegen generate <schema.yaml> [options]

Options:
  --out <dir>      Output directory (default: same directory as schema file)
  --detect-pii     Warn on suspected PII fields (writes to stderr)
  --strict-pii     Exit 1 if any PII fields are detected
```

### `check`

Detects schema drift against a stored snapshot. Used in CI to catch accidental event or property removals.

```bash
npx @emit-io/codegen check <schema.yaml> [options]

Options:
  --update         Accept breaking changes and update the snapshot
  --strict         Fail on any change, including additions
  --detect-pii     Warn on suspected PII fields
  --strict-pii     Exit 1 if any PII fields are detected
```

On first run, a snapshot file `.analytics-schema.snapshot.json` is created next to the schema file. Subsequent runs diff against it:

- **Breaking changes** (events or properties removed) — exits 1 unless `--update` is passed
- **Additions** — allowed by default; `--strict` exits 1 on any change

### `export`

```bash
npx @emit-io/codegen export <schema.yaml> --format <fmt> [options]

Options:
  --format json-schema | avro    Required
  --out <dir>                    Output directory (default: same as schema file)
```

Generates one file per event:
- `json-schema` → `<event-name>.schema.json`
- `avro` → `<event-name>.avsc`

## PII Detection

```bash
npx @emit-io/codegen generate schema.yaml --detect-pii
```

Field names matching common PII patterns (`email`, `phone`, `ssn`, `credit_card`, `ip`, etc.) emit a warning to stderr:

```
[PII WARN] event 'user-signed-up' property 'email' suspected PII (matched: email)
```

Use `--strict-pii` to fail the build when PII is detected.

## CI Integration

```yaml
# .github/workflows/analytics.yml
- name: Check analytics schema drift
  run: npx @emit-io/codegen check analytics-schema.yaml --strict
```

## Schema Format Reference

```yaml
events:
  <event-name>:
    description: "Optional human-readable description"
    <fieldName>: string | number | boolean      # required field
    <fieldName?>: string | number | boolean     # optional field (note the ?)
```

## License

MIT
