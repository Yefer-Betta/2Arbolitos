import { describe, expect, it } from 'vitest';

describe('infraestructura de tests', () => {
  it('ejecuta pruebas en Node', () => {
    expect(typeof process.version).toBe('string');
  });
});
