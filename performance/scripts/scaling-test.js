/**
 * There is no separate k6 script for "scaling" - Test 6 (horizontal
 * scaling) reuses redirect-test.js three times, once per backend
 * replica count. What changes between runs is the INFRASTRUCTURE, not
 * the load pattern, so a dedicated script would just duplicate
 * redirect-test.js.
 *
 * Workflow (see performance/README.md "Test 6" for full detail):
 *
 *   docker compose up -d --build --scale backend=1
 *   $env:OUTPUT_FILE="performance/results/scaling-1.json"
 *   k6 run performance/scripts/redirect-test.js
 *
 *   docker compose up -d --scale backend=2
 *   $env:OUTPUT_FILE="performance/results/scaling-2.json"
 *   k6 run performance/scripts/redirect-test.js
 *
 *   docker compose up -d --scale backend=4
 *   $env:OUTPUT_FILE="performance/results/scaling-4.json"
 *   k6 run performance/scripts/redirect-test.js
 *
 * CPU/memory are collected separately with:
 *   docker stats --no-stream
 * (run this in another terminal window while each k6 test is executing).
 */
throw new Error(
  'This file is documentation, not a runnable k6 script. See the comment ' +
  'above and performance/README.md for the actual scaling workflow, which ' +
  'reuses redirect-test.js with different --scale values.'
);
