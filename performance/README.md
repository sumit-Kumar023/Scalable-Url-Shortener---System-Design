# Performance Testing Guide

All benchmarks use [k6](https://k6.io/). Every script lives in
`performance/scripts/` and writes its raw JSON summary to
`performance/results/`. **No numbers in this repo are fabricated** - if a
benchmark hasn't been run yet, the corresponding result file will say
`NOT YET MEASURED` and this guide tells you the exact command to produce
a real one.

Run every command from the **project root** (so relative output paths
resolve correctly), with the stack already running:

```powershell
docker compose up --build -d
```

## 0. One-time setup: get a token and a short code

```powershell
# Register + log in (or reuse an existing account)
$body = @{ name = "Load Test"; email = "loadtest@example.com"; password = "password123" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "http://localhost/api/auth/register" -Body $body -ContentType "application/json"

$loginBody = @{ email = "loadtest@example.com"; password = "password123" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "http://localhost/api/auth/login" -Body $loginBody -ContentType "application/json"
$env:AUTH_TOKEN = $login.data.token

# Create a URL to redirect-test against
$urlBody = @{ originalUrl = "https://example.com" } | ConvertTo-Json
$created = Invoke-RestMethod -Method Post -Uri "http://localhost/api/urls" -Body $urlBody -ContentType "application/json" -Headers @{ Authorization = "Bearer $($env:AUTH_TOKEN)" }
$env:SHORT_CODE = $created.data.shortCode
$env:BASE_URL = "http://localhost"

Write-Host "Short code: $($env:SHORT_CODE)"
```

## Test 1 - Redirect performance

```powershell
k6 run performance/scripts/redirect-test.js
```

Reports RPS, p95, p99, and error rate for `GET /:shortCode`, ramping
0 → 50 → 100 → 200 VUs (override with `$env:STAGE_TARGETS` /
`$env:STAGE_DURATION`).

## Test 2 - Redis vs MongoDB

**Scenario A (Redis enabled, default):**

```powershell
k6 run performance/scripts/redirect-test.js
# writes performance/results/redirect-redis.json
```

**Scenario B (Redis bypassed):**

```powershell
# In .env, set:
#   DISABLE_REDIS_CACHE=true
docker compose restart backend

$env:OUTPUT_FILE = "performance/results/redirect-mongodb.json"
k6 run performance/scripts/redirect-test.js

# Revert afterwards:
#   DISABLE_REDIS_CACHE=false
docker compose restart backend
```

Compare the two `http_req_duration` / `http_reqs` blocks. Compute:

```
Latency improvement  = ((MongoDB p95 - Redis p95) / MongoDB p95) * 100
Throughput improvement = ((Redis RPS - MongoDB RPS) / MongoDB RPS) * 100
```

using the actual numbers from both JSON files - never estimate these.

## Test 3 - Cache hit rate

```powershell
$env:SHORT_CODES = $env:SHORT_CODE   # or a comma-separated list of several codes
k6 run performance/scripts/cache-test.js

# The real, measured hit rate is reported by the backend itself:
Invoke-RestMethod -Uri "http://localhost/health" | Select-Object -ExpandProperty data | Select-Object -ExpandProperty cache
```

## Test 4 - URL creation

```powershell
k6 run performance/scripts/create-url-test.js
```

## Test 5 - Rate limiting

```powershell
k6 run performance/scripts/rate-limit-test.js
```

429 responses here are the **expected, intended** outcome once the
configured limit (`RATE_LIMIT_REDIRECT_MAX`, default 100/min/IP) is
exceeded - they are reported separately from real errors.

## Test 6 - Horizontal scaling

```powershell
docker compose up -d --build --scale backend=1
$env:OUTPUT_FILE = "performance/results/scaling-1.json"
k6 run performance/scripts/redirect-test.js
docker stats --no-stream | Out-File performance/results/scaling-1-stats.txt

docker compose up -d --scale backend=2
$env:OUTPUT_FILE = "performance/results/scaling-2.json"
k6 run performance/scripts/redirect-test.js
docker stats --no-stream | Out-File performance/results/scaling-2-stats.txt

docker compose up -d --scale backend=4
$env:OUTPUT_FILE = "performance/results/scaling-4.json"
k6 run performance/scripts/redirect-test.js
docker stats --no-stream | Out-File performance/results/scaling-4-stats.txt
```

`docker stats --no-stream` gives a one-shot CPU%/memory snapshot per
container; run it in a second terminal while the k6 test is mid-flight
for a representative reading.

## Test 7 - MongoDB index verification

```powershell
docker compose exec mongodb mongosh url-shortener --eval "db.shorturls.find({ shortCode: '$($env:SHORT_CODE)' }).explain('executionStats')"
```

Look at `executionStats.executionStages.stage` - it should say
`IXSCAN` (index scan), not `COLLSCAN` (full collection scan), and note
`executionTimeMillis`.

## Interpreting the metrics

| Metric | What it tells you |
|---|---|
| RPS | How many requests/sec the system sustained under load |
| p95 latency | 95% of requests were faster than this - a good "typical worst case" |
| p99 latency | 99% of requests were faster than this - catches tail latency/outliers |
| Error rate | Fraction of requests that failed (non-2xx/3xx, excluding intentional 429s in Test 5) |
| Cache hit rate | `hits / (hits + misses) * 100` - higher means Redis is absorbing more read traffic |

## Generating `performance/results/report.md`

After running the tests you care about, copy the real numbers from each
JSON file's `metrics` block into `performance/results/report.md`,
replacing the `NOT YET MEASURED` placeholders. Do not round in a way
that changes the conclusion, and do not fill in a table row you didn't
actually measure.
