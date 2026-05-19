const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const { authenticate } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, fullName, phone, role = 'customer' } = req.body;

  if (!email || !password || !fullName) {
    return res.status(400).json({ error: 'Email, password and name are required' });
  }
  if (!['customer', 'driver'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role for self-registration' });
  }

  try {
    // Check if user exists
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Create Stripe customer
    const stripeCustomer = await stripe.customers.create({
      email, name: fullName, phone,
      metadata: { beerme_role: role }
    });

    const result = await pool.query(
      `INSERT INTO users (email, password_hash, full_name, phone, role, stripe_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, role`,
      [email, passwordHash, fullName, phone, role, stripeCustomer.id]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.status(201).json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (!result.rows.length) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '30d' });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        idVerified: user.id_verified
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/start-id-verification
// Creates a Stripe Identity verification session
router.post('/start-id-verification', authenticate, async (req, res) => {
  if (req.user.id_verified) {
    return res.json({ status: 'already_verified' });
  }

  try {
    const session = await stripe.identity.verificationSessions.create({
      type: 'document',
      options: {
        document: {
          require_matching_selfie: true,
          require_live_capture: true,
        },
      },
      metadata: {
        beerme_user_id: req.user.id,
      },
    });

    // Save session ID for webhook lookup
    await pool.query(
      'UPDATE users SET stripe_identity_session_id = $1 WHERE id = $2',
      [session.id, req.user.id]
    );

    res.json({
      sessionId: session.id,
      clientSecret: session.client_secret,
      url: session.url,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not start ID verification' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  const { id, email, full_name, role, id_verified, phone } = req.user;
  res.json({ id, email, fullName: full_name, role, idVerified: id_verified, phone });
});

module.exports = router;
