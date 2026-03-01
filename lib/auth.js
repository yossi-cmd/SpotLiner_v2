import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "";

/**
 * Parse Authorization: Bearer <token> or query ?token= from request
 * @param {Request} request
 * @returns {{ userId: number, userRole: string } | null }
 */
export function getAuthFromRequest(request) {
  const url = new URL(request.url);
  const qToken = url.searchParams.get("token");
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : qToken || null;
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { userId: decoded.userId, userRole: decoded.role };
  } catch {
    return null;
  }
}

/**
 * Require auth; returns 401 if not authenticated.
 * @param {Request} request
 * @returns {Promise<{ userId: number, userRole: string }>}
 */
export async function requireAuth(request) {
  const auth = getAuthFromRequest(request);
  if (!auth) {
    throw { status: 401, message: "Authentication required" };
  }
  return auth;
}

/**
 * Optional auth; returns null if no/invalid token.
 * @param {Request} request
 * @returns {{ userId: number, userRole: string } | null}
 */
export function optionalAuth(request) {
  return getAuthFromRequest(request);
}

/**
 * Require one of the given roles.
 * @param {Request} request
 * @param {string[]} allowedRoles
 * @returns {Promise<{ userId: number, userRole: string }>}
 */
export async function requireRole(request, allowedRoles) {
  const auth = await requireAuth(request);
  if (!allowedRoles.includes(auth.userRole)) {
    throw { status: 403, message: "Insufficient permissions" };
  }
  return auth;
}

export function signToken(payload, expiresIn = "24h") {
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}
