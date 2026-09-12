import { generateShortCode } from '../services/shortCode.service';

describe('generateShortCode', () => {
  it('generates a 7-character Base62 code', () => {
    const code = generateShortCode();
    expect(code).toHaveLength(7);
    expect(code).toMatch(/^[0-9A-Za-z]{7}$/);
  });

  it('generates different codes across calls (probabilistically unique)', () => {
    const codes = new Set(Array.from({ length: 1000 }, () => generateShortCode()));
    // With 62^7 possibilities, 1000 draws colliding is astronomically unlikely.
    expect(codes.size).toBe(1000);
  });
});
