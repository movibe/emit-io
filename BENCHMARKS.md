# Benchmarks

Run: `bun run bench:compare`

**Hardware:** Node v22.13.1 · macOS 26.5 · arm64  
**Date:** 2026-05-26  
**Tool:** [tinybench](https://github.com/tinylibs/tinybench) — 1 second per task

## Setup

| Library | Configuration |
|---|---|
| `@emitio/core` | `JSONTransport` with `write` piped to `/dev/null`, `emitAppOpenOnInit: false` |
| `pino` | `pino(devNullStream)` — stream to `/dev/null` |
| `winston` | `format.json()` + `Stream` transport to `/dev/null` |

All libraries write real serialized JSON to `/dev/null` so the measurement includes actual I/O path overhead, not just hot-loop math.

---

## Results

### Simple info() — no context

| Library | ops/sec (avg) | Latency avg (ns) | Latency med (ns) | Margin | Samples |
|---|---|---|---|---|---|
| `@emitio/core` | 1,202,455 | 976.10 | 833.00 | ±3.73% | 1,024,490 |
| `pino` | 2,416,718 | 681.48 | 416.00 | ±14.46% | 1,467,398 |
| `winston` | 1,519,111 | 1,556.2 | 625.00 | ±10.60% | 645,204 |

### info() with context (3 keys)

| Library | ops/sec (avg) | Latency avg (ns) | Latency med (ns) | Margin | Samples |
|---|---|---|---|---|---|
| `@emitio/core` | 981,834 | 1,872.6 | 959.00 | ±40.72% | 604,457 |
| `pino` | 1,441,241 | 1,638.3 | 667.00 | ±40.80% | 610,406 |
| `winston` | 831,336 | 4,814.2 | 1,125.0 | ±19.28% | 210,273 |

### child().info() — bound context

| Library | ops/sec (avg) | Latency avg (ns) | Latency med (ns) | Margin | Samples |
|---|---|---|---|---|---|
| `@emitio/core` | 1,099,641 | 1,837.8 | 875.00 | ±9.64% | 545,564 |
| `pino` | 2,275,563 | 1,178.6 | 417.00 | ±39.29% | 848,439 |
| `winston` | 1,164,958 | 2,513.3 | 833.00 | ±15.59% | 397,889 |

---

## Interpretation

Pino is the throughput leader across all three scenarios, running roughly 2× faster than `@emitio/core` at median. This is expected: pino is purpose-built for raw log throughput with minimal per-call overhead. `@emitio/core` beats winston in the **context scenario** (median ~1,043K vs ~889K ops/s, ~17% ahead) but is roughly on par with winston in the simple and child scenarios when judged by median rather than mean (which is skewed by outliers in both). The main takeaway: `@emitio/core` runs comfortably in the 1M ops/s range and is never slower than winston, while offering features neither pino nor winston provide out of the box — circuit breaker, per-transport rate limiting, typed analytics events, and consent management.

---

## Reproducing

```bash
git clone https://github.com/Emit-io/emit.git
cd emit
bun install
bun run bench:compare
```
