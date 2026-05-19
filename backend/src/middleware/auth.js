const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Verify JWT and attach user to request
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.slice(7);
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);
    if (!result.rows.length) return res.status(401).json({ error: 'User not found' });
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Require specific role
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'Insufficient permissions' });
  }
  next();
};

// Require ID verification for ordering (critical for alcohol compliance)
const requireIdVerified = (req, res, next) => {
  if (!req.user.id_verified) {
    return res.status(403).json({
      error: 'ID verification required',
      code: 'ID_NOT_VERIFIED',
      message: 'You must verify your age before placing an order.'
    });
  }
  next();
};

module.exports = { authenticate, requireRole, requireIdVerified };
