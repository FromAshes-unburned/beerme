const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /webhooks/stripe — handle Stripe events
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    switch (event.type) {

      // Payment confirmed — activate the order
      case 'payment_intent.succeeded': {
        const pi = event.data.object;
        await pool.query(
          `UPDATE orders SET stripe_payment_status = 'paid' WHERE stripe_payment_intent_id = $1`,
          [pi.id]
        );
        console.log('Payment confirmed for order:', pi.metadata.beerme_user_id);
        break;
      }

      // Payment failed — cancel order
      case 'payment_intent.payment_failed': {
        const pi = event.data.object;
        await pool.query(
          `UPDATE orders SET status = 'cancelled', stripe_payment_status = 'failed'
           WHERE stripe_payment_intent_id = $1`,
          [pi.id]
        );
        break;
      }

      // ID verification completed via Stripe Identity
      case 'identity.verification_session.verified': {
        const session = event.data.object;
        const userId = session.metadata.beerme_user_id;
        if (!userId) break;

        // Extract date of birth from verification
        const verificationSession = await stripe.identity.verificationSessions.retrieve(
          session.id, { expand: ['verified_outputs'] }
        );

        const dob = verificationSession.verified_outputs?.dob;

        if (dob) {
          const birthDate = new Date(dob.year, dob.month - 1, dob.day);
          const age = Math.floor((Date.now() - birthDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000));

          if (age >= 21) {
            await pool.query(
              `UPDATE users SET id_verified = TRUE, id_verified_at = NOW(), date_of_birth = $1
               WHERE id = $2`,
              [birthDate.toISOString().split('T')[0], userId]
            );
            console.log(`User ${userId} verified, age ${age}`);
          } else {
            // User is under 21 — do not verify
            console.log(`User ${userId} is under 21 (age: ${age}) — not verified`);
          }
        }
        break;
      }

      // ID verification failed or canceled
      case 'identity.verification_session.requires_input':
      case 'identity.verification_session.canceled': {
        const session = event.data.object;
        const userId = session.metadata.beerme_user_id;
        if (userId) {
          console.log(`ID verification not completed for user ${userId}: ${event.type}`);
        }
        break;
      }

      default:
        break;
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

module.exports = router;
