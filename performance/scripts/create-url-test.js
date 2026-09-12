/**
 * Benchmarks POST /api/urls using a real authenticated user.
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="http://localhost"
 *   $env:AUTH_TOKEN="<JWT from POST /api/auth/login>"
 *   k6 run performance/scripts/create-url-test.js
 *
 * Optional:
 *   $env:VUS="20"
 *   $env:DURATION="30s"
 */
import http from 'k6/http';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const AUTH_TOKEN = __ENV.AUTH_TOKEN;
const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '30s';

if (!AUTH_TOKEN) {
  throw new Error('AUTH_TOKEN env var is required - log in first and pass the JWT.');
}

const errorRate = new Rate('errors');

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    errors: ['rate<0.05'],
  },
};

export default function () {
  const payload = JSON.stringify({
    originalUrl: `https://example.com/load-test/${__VU}/${__ITER}`,
  });

  const res = http.post(`${BASE_URL}/api/urls`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${AUTH_TOKEN}`,
    },
  });

  const ok = check(res, {
    'status is 201': (r) => r.status === 201,
  });

  errorRate.add(!ok);
}

export function handleSummary(data) {
  return {
    'performance/results/create-url.json': JSON.stringify(data, null, 2),
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
