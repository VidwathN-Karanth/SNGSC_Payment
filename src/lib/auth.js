import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-tournament-chess-jwt-token-key-12345';

export function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (e) {
    return null;
  }
}

/**
 * Extracts and verifies the admin session token from request cookies
 * @param {import('next/server').NextRequest} req
 */
export function getAdminFromRequest(req) {
  const token = req.cookies.get('admin_token')?.value;
  if (!token) {
    return null;
  }
  return verifyToken(token);
}
