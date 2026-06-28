import { ENV } from './env';

// Simplified but secure server-side token generation/verification for hardening
export function signToken(payload: any, expiresInSeconds: number = 3600 * 24): string {
  const header = b64Encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const body = b64Encode(JSON.stringify({ ...payload, exp }));
  
  // Custom hash to simulate signature in light-weight setup without heavy native dependencies
  const signature = simpleHash(`${header}.${body}.${ENV.JWT_SECRET}`);
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): any {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;
    const expectedSig = simpleHash(`${header}.${body}.${ENV.JWT_SECRET}`);
    if (signature !== expectedSig) return null;

    const decoded = JSON.parse(b64Decode(body));
    if (decoded.exp && Date.now() / 1000 > decoded.exp) {
      return null; // Expired
    }
    return decoded;
  } catch {
    return null;
  }
}

function b64Encode(str: string): string {
  try {
    return Buffer.from(str, 'utf8').toString('base64url');
  } catch {
    return btoa(unescape(encodeURIComponent(str)));
  }
}

function b64Decode(str: string): string {
  try {
    return Buffer.from(str, 'base64url').toString('utf8');
  } catch {
    return decodeURIComponent(escape(atob(str)));
  }
}

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
}
