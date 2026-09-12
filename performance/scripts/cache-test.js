/**
 * Generates repeated traffic to a small set of "popular" short codes to
 * measure the Redis cache hit rate exposed at GET /health
 * (data.cache.hits / misses / hitRate).
 *
 * Usage (PowerShell):
 *   $env:BASE_URL="http://localhost"
 *   $env:SHORT_CODES="abc1234,def5678,ghi9012"
 *   k6 run performance/scripts/cache-test.js
 *
 * This script does NOT compute the hit rate itself (the backend does,
 * via services/cache.service.ts). After running it, fetch GET /health
 * and read data.cache - that is the real, measured hit rate, never a
 * fabricated number.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost';
const SHORT_CODES = (__ENV.SHORT_CODES || '').split(',').map((s) => s.trim()).filter(Boolean);
const VUS = parseInt(__ENV.VUS || '20', 10);
const DURATION = __ENV.DURATION || '30s';

if (SHORT_CODES.length === 0) {
  throw new Error('SHORT_CODES env var is required - a comma-separated list of existing short codes.');
}

export const options = {
  vus: VUS,
  duration: DURATION,
};

export default function () {
  const code = SHORT_CODES[Math.floor(Math.random() * SHORT_CODES.length)];
  const res = http.get(`${BASE_URL}/${code}`, { redirects: 0 });

  check(res, { 'status is 302 or 404': (r) => r.status === 302 || r.status === 404 });

  sleep(0.05);
}

export function handleSummary(data) {
  return {
    'performance/results/cache.json': JSON.stringify(data, null, 2),
    stdout:
      'Load generation complete. Now fetch GET /health and read data.cache ' +
      'for the real, measured hit rate (hits, misses, hitRate).\n',
  };
}
