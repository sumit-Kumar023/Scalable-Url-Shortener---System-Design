/**
 * Benchmarks GET /:shortCode - the highest-priority endpoint.
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="http://localhost"
 *   $env:SHORT_CODE="abc1234"
 *   k6 run performance/scripts/redirect-test.js
 *
 * For the Redis-vs-MongoDB comparison (see performance/README.md, Test 2):
 *   Scenario A (Redis enabled, default): just run as above, output goes
 *     to performance/results/redirect-redis.json.
 *   Scenario B (Redis bypassed): set DISABLE_REDIS_CACHE=true in the
 *     backend's .env, `docker compose restart backend`, then run:
 *       $env:OUTPUT_FILE="performance/results/redirect-mongodb.json"
 *       k6 run performance/scripts/redirect-test.js
 *   Compare the two JSON files' http_req_duration / http_reqs metrics.
 *
 * Optional overrides:
 *   $env:STAGE_TARGETS="50,100,200"   comma-separated VU targets
 *   $env:STAGE_DURATION="30s"         duration per ramp stage
 */
import http from 'k6/http';
import { check } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const SHORT_CODE = __ENV.SHORT_CODE;
const STAGE_DURATION = __ENV.STAGE_DURATION || '30s';
const TARGETS = (__ENV.STAGE_TARGETS || '50,100,200').split(',').map((n) => parseInt(n.trim(), 10));

if (!SHORT_CODE) {
  throw new Error('SHORT_CODE env var is required - create a URL first and pass its short code.');
}

const errorRate = new Rate('errors');
const redirectDuration = new Trend('redirect_duration', true);

function buildStages(targets, duration) {
  const stages = [];
  for (const target of targets) {
    stages.push({ duration, target });
  }
  // Ramp back down to 0 over the same duration as the last stage.
  stages.push({ duration, target: 0 });
  return stages;
}

export const options = {
  stages: buildStages(TARGETS, STAGE_DURATION),
  thresholds: {
    // Informational thresholds only - k6 will report pass/fail but this
    // script does not fabricate numbers, it just measures what happens.
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/${SHORT_CODE}`, { redirects: 0 });

  const ok = check(res, {
    'status is 302': (r) => r.status === 302,
  });

  errorRate.add(!ok);
  redirectDuration.add(res.timings.duration);
}

export function handleSummary(data) {
  const outputFile = __ENV.OUTPUT_FILE || 'performance/results/redirect-redis.json';
  return {
    [outputFile]: JSON.stringify(data, null, 2),
    stdout: JSON.stringify(
      {
        rps: data.metrics.http_reqs ? data.metrics.http_reqs.values.rate : null,
        p95_ms: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : null,
        p99_ms: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : null,
        error_rate: data.metrics.errors ? data.metrics.errors.values.rate : null,
      },
      null,
      2
    ),
  };
}
