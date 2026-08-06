const prisma = require('../lib/prisma');
const { hashPassword, signToken, verifyPassword } = require('../lib/auth');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    reminderEmail: user.reminderEmail,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function issueAuthResponse(user) {
  return {
    token: signToken({ sub: user.id, email: user.email }),
    user: sanitizeUser(user),
  };
}

async function register(req, res) {
  try {
    const { firstName, lastName, email, password, confirmPassword } = req.body;

    if (!firstName?.trim() || !lastName?.trim()) {
      return res.status(400).json({ error: 'First and last name are required.' });
    }
    if (!email?.trim() || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return res.status(400).json({ error: 'A valid email address is required.' });
    }
    if (!password || password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          name: `${firstName.trim()} ${lastName.trim()}`,
          email: normalizedEmail,
          passwordHash: hashPassword(password),
        },
      });

      const workspace = await tx.workspace.create({
        data: {
          name: `${firstName.trim()}'s Workspace`,
          ownerId: createdUser.id,
        },
      });

      await tx.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: createdUser.id,
          role: 'OWNER',
        },
      });

      return createdUser;
    });

    return res.status(201).json(issueAuthResponse(user));
  } catch (error) {
    console.error('Register error:', error);
    return res.status(500).json({ error: 'Failed to create account.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email?.trim() || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    return res.status(200).json(issueAuthResponse(user));
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Failed to log in.' });
  }
}

function me(req, res) {
  return res.status(200).json({ user: req.user });
}

async function updateProfile(req, res) {
  try {
    const { reminderEmail, name } = req.body;

    if (name !== undefined && !String(name).trim()) {
      return res.status(400).json({ error: 'Name cannot be empty.' });
    }
    if (
      reminderEmail !== undefined &&
      reminderEmail !== null &&
      String(reminderEmail).trim() !== '' &&
      !EMAIL_REGEX.test(String(reminderEmail).trim().toLowerCase())
    ) {
      return res.status(400).json({ error: 'Enter a valid reminder email address.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: {
        ...(name !== undefined ? { name: String(name).trim() } : {}),
        ...(reminderEmail !== undefined
          ? { reminderEmail: String(reminderEmail).trim() ? String(reminderEmail).trim().toLowerCase() : null }
          : {}),
      },
    });

    return res.status(200).json({ user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
}

module.exports = {
  login,
  me,
  register,
  updateProfile,
};
