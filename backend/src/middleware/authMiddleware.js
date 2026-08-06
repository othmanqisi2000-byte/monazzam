const prisma = require('../lib/prisma');
const { verifyToken } = require('../lib/auth');

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const payload = verifyToken(token);
  if (!payload?.sub) {
    return res.status(401).json({ error: 'Invalid or expired session.' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        reminderEmail: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'User not found.' });
    }

    req.user = user;
    return next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({ error: 'Failed to validate session.' });
  }
}

module.exports = { requireAuth };
