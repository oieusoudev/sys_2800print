import jwt from 'jsonwebtoken';

// Verificar se JWT_SECRET está configurado
if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET environment variable is required');
}

export interface JWTPayload {
  userId: string;
  username: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export function verifyJWT(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    // Verificar se o token não expirou
    const now = Math.floor(Date.now() / 1000);
    if (decoded.exp < now) {
      console.warn('JWT token has expired');
      return null;
    }
    
    return decoded;
  } catch (error) {
    console.error('JWT verification failed:', error);
    return null;
  }
}

export function signJWT(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
  const tokenPayload: JWTPayload = {
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
  };

  return jwt.sign(tokenPayload, process.env.JWT_SECRET!, {
    algorithm: 'HS256'
  });
}

export function extractUserFromToken(token: string): JWTPayload | null {
  return verifyJWT(token);
}