/**
 * Deliberately exceeds the configured rate limit on GET /:shortCode to
 * verify HTTP 429 responses are returned once the limit is crossed.
 * 429s here are the INTENDED outcome, not failures.
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="http://localhost"
 *   $env:SHORT_CODE="abc1234"
 *   k6 run performance/scripts/rate-limit-test.js
 *
 * Defaults assume RATE_LIMIT_REDIRECT_MAX=100 requests/min/IP (see
 * .env.example). Adjust VUS/DURATION to comfortably exceed whatever
 * limit your .env actually configures.
 */
import http from 'k6/http';
import { Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const SHORT_CODE = __ENV.SHORT_CODE;
const VUS = parseInt(__ENV.VUS || '30', 10);
const DURATION = __ENV.DURATION || '20s';

if (!SHORT_CODE) {
  throw new Error('SHORT_CODE env var is required.');
}

const accepted = new Counter('accepted_requests');
const rateLimited = new Counter('rate_limited_requests');

export const options = {
  vus: VUS,
  duration: DURATION,
};

export default function () {
  const res = http.get(`${BASE_URL}/${SHORT_CODE}`, { redirects: 0 });

  if (res.status === 429) {
    rateLimited.add(1);
  } else if (res.status === 302) {
    accepted.add(1);
  }
}

export function handleSummary(data) {
  const acceptedCount = data.metrics.accepted_requests ? data.metrics.accepted_requests.values.count : 0;
  const rateLimitedCount = data.metrics.rate_limited_requests ? data.metrics.rate_limited_requests.values.count : 0;

  return {
    'performance/results/rate-limit.json': JSON.stringify(data, null, 2),
    stdout: JSON.stringify({ accepted: acceptedCount, rateLimited: rateLimitedCount }, null, 2),
  };
}
