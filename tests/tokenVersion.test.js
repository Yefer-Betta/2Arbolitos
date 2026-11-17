import { describe, expect, it, vi, beforeEach } from 'vitest';

const prismaMock = {
  user: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

vi.mock('../server/src/config/database.js', () => ({ default: prismaMock }));

beforeEach(() => {
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockReset();
});

const { authenticate, verifyTokenVersion } = await import('../server/src/middleware/auth.js');

// Usar jsonwebtoken real desde server para generar tokens válidos
const jwt = await import('C:/Users/yefe_/Documents/Proyecto/2arboltos/server/node_modules/jsonwebtoken').then(m => m.default || m);

process.env.JWT_SECRET = 'test-secret';

function response() {
  return {
    statusCode: null,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function makeToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });
}

describe('token versioning (C8) - verifyTokenVersion', () => {
  it('lanza error cuando tokenVersion del JWT es menor que el de la BD', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: 2 });
    await expect(verifyTokenVersion({ id: 'user-1', tokenVersion: 1 })).rejects.toThrow(
      'Token inválido - la contraseña ha sido cambiada',
    );
  });

  it('no lanza error cuando tokenVersion coincide', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: 3 });
    await expect(verifyTokenVersion({ id: 'user-1', tokenVersion: 3 })).resolves.toBeUndefined();
  });

  it('lanza error cuando el usuario no existe', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);
    await expect(verifyTokenVersion({ id: 'user-inexistente', tokenVersion: 1 })).rejects.toThrow(
      'Usuario no encontrado',
    );
  });
});

describe('token versioning (C8) - authenticate middleware', () => {
  it('rechaza JWT antiguo después de cambio de contraseña', async () => {
    const oldTokenVersion = 1;
    const newTokenVersion = 2;

    prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: newTokenVersion });

    const token = makeToken({ id: 'user-1', role: 'WAITER', tokenVersion: oldTokenVersion });

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = response();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token inválido - la contraseña ha sido cambiada');
    expect(res.body.code).toBe('TOKEN_VERSION_MISMATCH');
  });

  it('acepta JWT válido con tokenVersion actual', async () => {
    const currentTokenVersion = 3;

    prismaMock.user.findUnique.mockResolvedValue({ tokenVersion: currentTokenVersion });

    const token = makeToken({ id: 'user-1', role: 'WAITER', tokenVersion: currentTokenVersion });

    const req = { headers: { authorization: `Bearer ${token}` }, originalUrl: '/api/orders' };
    const res = response();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.statusCode).toBeNull();
  });

  it('devuelve 401 cuando no hay token', async () => {
    const req = { headers: {} };
    const res = response();
    const next = vi.fn();

    await authenticate(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.statusCode).toBe(401);
    expect(res.body.error).toBe('Token no proporcionado');
  });
});
