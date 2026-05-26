# Codegen workflow

`@emitio/codegen` generates TypeScript types from a YAML schema and keeps them in sync with CI checks.

## 1. Define schema

```yaml
# analytics-schema.yaml
events:
  user_login:
    description: User signed in
    properties:
      method:
        type: string
        required: true
        enum: [email, oauth, sso]
      duration_ms:
        type: number
  purchase:
    description: User completed a purchase
    properties:
      order_id:
        type: string
        required: true
      total:
        type: number
        required: true
      currency:
        type: string
        enum: [USD, EUR, GBP]
        pii: false
  user_email_collected:
    properties:
      email:
        type: string
        pii: true   # flagged for PII — codegen can warn or block
```

## 2. Generate TypeScript types

```bash
npx @emitio/codegen generate analytics-schema.yaml --out src/analytics
```

Output: `src/analytics/index.d.ts` with `EventRegistry` augmentation ready to import.

## 3. Check for drift in CI

Fails the build if generated types are out of sync with the schema:

```bash
npx @emitio/codegen check analytics-schema.yaml
```

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check analytics schema drift
  run: npx @emitio/codegen check analytics-schema.yaml
```

## 4. Detect PII

```bash
npx @emitio/codegen generate schema.yaml --detect-pii --strict-pii
```

`--detect-pii` warns on fields marked `pii: true`. `--strict-pii` turns warnings into errors.

## 5. Export to backend formats

Export the schema for validation in backend services or data pipelines:

```bash
# JSON Schema (OpenAPI-compatible)
npx @emitio/codegen export schema.yaml --format=json-schema --out schemas/

# Apache Avro
npx @emitio/codegen export schema.yaml --format=avro --out schemas/
```
