import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

// Fail fast when functions are called, rather than at module load,
// to avoid breaking Next.js build steps that import this file.
function getSecretKey() {
  const AUTH_SECRET = process.env.AUTH_SECRET;
  if (!AUTH_SECRET) {
    throw new Error('AUTH_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(AUTH_SECRET);
}
const COOKIE_NAME = 'session';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days in seconds

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
  maxAge: COOKIE_MAX_AGE,
};

/**
 * Signs a JWT with the given payload. Expires in 7 days.
 * @param {{ userId: string, email: string, role: string }} payload
 * @returns {Promise<string>} signed JWT
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecretKey());
}

/**
 * Verifies a JWT string. Returns the payload or null if invalid/expired.
 * @param {string} token
 * @returns {Promise<{userId: string, email: string, role: string} | null>}
 */
export async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch {
    return null;
  }
}

/**
 * Reads the session cookie (server-side only) and returns the verified payload.
 * Uses Next.js `cookies()` from next/headers — must be called from a Server
 * Component, Route Handler, or Server Action.
 *
 * @returns {Promise<{userId: string, email: string, role: string} | null>}
 */
export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Sets the session cookie on a NextResponse.
 * @param {import('next/server').NextResponse} response
 * @param {string} token
 */
export function setSessionCookie(response, token) {
  response.cookies.set(COOKIE_NAME, token, COOKIE_OPTIONS);
  return response;
}

/**
 * Clears the session cookie on a NextResponse.
 * Must use the same Path as set, otherwise the cookie won't be cleared.
 * @param {import('next/server').NextResponse} response
 */
export function clearSessionCookie(response) {
  response.cookies.set(COOKIE_NAME, '', {
    ...COOKIE_OPTIONS,
    maxAge: 0,
  });
  return response;
}
