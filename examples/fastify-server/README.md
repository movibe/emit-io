# Fastify Server Example

Demonstrates `emit-io-fastify` with per-request child loggers, request IDs, auto-log hooks, and sensitive data redaction.

## Run

```bash
cd /Users/movibe/sites/libs/logger
npm install
cd examples/fastify-server
npm start
```

## Endpoints

```bash
curl http://localhost:3000/health

curl http://localhost:3000/users/42

curl -X POST http://localhost:3000/login \
  -H 'content-type: application/json' \
  -d '{"username":"alice","password":"s3cret"}'
```

All logs output NDJSON to stdout. `password` is redacted to `[REDACTED]`. Each request gets a unique `requestId` echoed in the `x-request-id` response header.
