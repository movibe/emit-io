# next-app example

Next.js 15 App Router with `emit-io-next`.

## What it shows

- `middleware.ts` wraps Next.js middleware with `withLogger` — auto requestId, pageview events, durationMs
- `app/api/health/route.ts` and `app/api/users/[id]/route.ts` use `instrumentRoute` — auto timings + status logging
- `lib/logger.ts` singleton with JSONTransport + ConsoleTransport + redact plugin

## Run

```bash
npm install
npm run dev
```

Then:

```bash
curl http://localhost:3000/api/health
curl http://localhost:3000/api/users/42
```

Check terminal for structured logs with requestId, status, durationMs.
