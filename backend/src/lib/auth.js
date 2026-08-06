const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + padding, 'base64');
}

function getAuthSecret() {
  return process.env.AUTH_SECRET || 'change-this-dev-secret';
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${HASH_PREFIX}:${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash) return false;
  const [prefix, salt, originalHash] = storedHash.split(':');
  if (prefix !== HASH_PREFIX || !salt || !originalHash) return false;

  const candidateHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(candidateHash, 'hex'), Buffer.from(originalHash, 'hex'));
}

function signToken(payload) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: issuedAt,
    exp: issuedAt + TOKEN_TTL_SECONDS,
  };

  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedBody = toBase64Url(JSON.stringify(body));
  const signature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  return `${encodedHeader}.${encodedBody}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedBody, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getAuthSecret())
    .update(`${encodedHeader}.${encodedBody}`)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');

  const providedSignature = Buffer.from(signature);
  const computedSignature = Buffer.from(expectedSignature);
  if (
    providedSignature.length !== computedSignature.length ||
    !crypto.timingSafeEqual(providedSignature, computedSignature)
  ) {
    return null;
  }

  try {
    const payload = JSON.parse(fromBase64Url(encodedBody).toString('utf8'));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch (error) {
    return null;
  }
}

module.exports = {
  hashPassword,
  signToken,
  verifyPassword,
  verifyToken,
};
