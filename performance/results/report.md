# Performance Report

> **Status: NOT YET MEASURED.**
> These benchmarks require Docker (MongoDB, Redis, Nginx, the backend and
> frontend containers) and k6, which were not available in the environment
> this project was generated in. Every table below is a placeholder -
> run the commands in `performance/README.md` on your own machine and
> replace the `NOT YET MEASURED` cells with the real output. Do not use
> placeholder values for resume or interview claims.

## Redirect Performance

| Configuration | RPS | p95 | p99 | Error Rate |
|---|---:|---:|---:|---:|
| Redis | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED |
| MongoDB (Redis bypassed) | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED |

Command: `k6 run performance/scripts/redirect-test.js` (see
`performance/README.md` Test 1 and Test 2 for the exact setup for each row).

## Redis Cache

| Metric | Result |
|---|---:|
| Hits | NOT YET MEASURED |
| Misses | NOT YET MEASURED |
| Hit Rate | NOT YET MEASURED |

Command: `k6 run performance/scripts/cache-test.js`, then read `GET /health`.

## URL Creation

| Metric | Result |
|---|---:|
| RPS | NOT YET MEASURED |
| p95 | NOT YET MEASURED |
| p99 | NOT YET MEASURED |
| Error Rate | NOT YET MEASURED |

Command: `k6 run performance/scripts/create-url-test.js`.

## Rate Limiting

| Metric | Result |
|---|---:|
| Accepted | NOT YET MEASURED |
| Rate Limited | NOT YET MEASURED |

Command: `k6 run performance/scripts/rate-limit-test.js`.

## Scaling

| Instances | RPS | p95 | p99 | Error Rate | CPU | Memory |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED |
| 2 | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED |
| 4 | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED | NOT YET MEASURED |

Command: see `performance/README.md` Test 6.

## MongoDB Index Verification

| Query | Index Used? | Execution Time |
|---|---|---:|
| `shortCode -> originalUrl` lookup | NOT YET MEASURED | NOT YET MEASURED |

Command: see `performance/README.md` Test 7 (`.explain('executionStats')`).

---

### Backend-level test suite (this one IS measured - see below)

Unlike the k6 load tests above, the Jest/Supertest backend test suite
**was** run in the environment this project was built in (no Docker
required - it mocks Mongoose models and uses `ioredis-mock` for Redis):

```
Test Suites: 6 passed, 6 total
Tests:       37 passed, 37 total
```

Covers: short-code generation/uniqueness, collision retry logic, unsafe
URL scheme rejection, auth register/login flows, JWT sign/verify,
Redis cache-aside hit/miss/TTL-capping/invalidation behavior, Redis-backed
rate limiting, and full HTTP-level integration tests (health check, auth
validation, protected-route enforcement, redirect 302/404/expiration
handling) via supertest against the real Express app.
