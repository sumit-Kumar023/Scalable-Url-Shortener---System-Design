import { customAlphabet } from 'nanoid';

/**
 * SHORT-CODE GENERATION STRATEGY
 * ------------------------------
 * We use secure-random Base62 codes (via nanoid with a custom Base62
 * alphabet) rather than a sequential counter encoded to Base62.
 *
 * Why random Base62 instead of a counter?
 *  - No shared counter/coordination needed across multiple stateless
 *    backend instances (a counter would require a centralized sequence,
 *    e.g. a Mongo counter document or Redis INCR, adding a bottleneck
 *    and a single point of failure).
 *  - Codes are not guessable/enumerable in sequence, which avoids
 *    leaking how many URLs have been created.
 *  - Trivial to explain in an interview: "7 random Base62 characters
 *    give 62^7 (~3.5 trillion) possible codes; collisions are rare and
 *    handled with a bounded retry loop plus a unique DB index."
 *
 * Collision handling:
 *  - We do NOT rely on "check existence, then insert" - that has a
 *    race condition: two requests could both see "not taken" and then
 *    both insert. Instead, the MongoDB unique index on `shortCode` is
 *    the final source of truth. We attempt an insert; if MongoDB
 *    rejects it with a duplicate-key error (code 11000), we generate a
 *    new code and retry, up to a small bounded number of attempts.
 */

const BASE62_ALPHABET =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

const CODE_LENGTH = 7;

const generate = customAlphabet(BASE62_ALPHABET, CODE_LENGTH);

export function generateShortCode(): string {
  return generate();
}

export const MAX_GENERATION_ATTEMPTS = 5;
