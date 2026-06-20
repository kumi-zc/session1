const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { JWT_SECRET, auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/register - new users start as PENDING
router.post('/register', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const prisma = req.app.get('prisma');
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { username, password: hashed, status: 'PENDING' },
      select: { id: true, username: true, role: true, status: true },
    });

    res.json({
      user,
      message: 'Registration successful. Please wait for admin approval.',
      pending: true,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (user.status === 'PENDING') {
      return res.status(403).json({ error: 'Account pending approval. Please wait for admin to approve.' });
    }
    if (user.status === 'REJECTED') {
      return res.status(403).json({ error: 'Account has been rejected. Please contact admin.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: { id: user.id, username: user.username, role: user.role },
      token,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get('/me', auth, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, role: true, status: true },
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/change-password - change own password
router.put('/change-password', auth, async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password - request password reset
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { username } = req.body;
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }

    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: 'If the account exists, a reset code has been generated.' });
    }

    // Generate 6-digit reset code
    const resetCode = crypto.randomInt(100000, 999999).toString();
    const resetExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    await prisma.user.update({
      where: { id: user.id },
      data: { password: resetCode + '_reset' }, // Temporary marker
    });

    // In production, send via email/SMS. For now, return it directly.
    res.json({
      message: 'Reset code generated',
      resetCode,
      username: user.username,
      expiresIn: '15 minutes',
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password - reset password with code
router.post('/reset-password', async (req, res, next) => {
  try {
    const { username, resetCode, newPassword } = req.body;
    if (!username || !resetCode || !newPassword) {
      return res.status(400).json({ error: 'Username, reset code, and new password are required' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters' });
    }

    const prisma = req.app.get('prisma');
    const user = await prisma.user.findUnique({ where: { username } });
    if (!user || user.password !== resetCode + '_reset') {
      return res.status(400).json({ error: 'Invalid reset code' });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed },
    });

    res.json({ message: 'Password reset successful' });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/users - list all users (admin only)
router.get('/users', auth, adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/users/:id/approve - approve user
router.put('/users/:id/approve', auth, adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { status: 'APPROVED' },
    });
    res.json({ message: 'User approved' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/users/:id/reject - reject user
router.put('/users/:id/reject', auth, adminOnly, async (req, res, next) => {
  try {
    const prisma = req.app.get('prisma');
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { status: 'REJECTED' },
    });
    res.json({ message: 'User rejected' });
  } catch (err) {
    next(err);
  }
});

// PUT /api/auth/users/:id/role - change user role
router.put('/users/:id/role', auth, adminOnly, async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['ADMIN', 'COUNTER'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const prisma = req.app.get('prisma');
    await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { role },
    });
    res.json({ message: 'Role updated' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
