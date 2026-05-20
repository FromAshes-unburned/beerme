const express = require('express');
const { Pool } = require('pg');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// PATCH /api/drivers/online — toggle driver online status
router.patch('/online', authenticate, requireRole('driver'), async (req, res) => {
  const { isOnline } = req.body;
  try {
    await pool.query(
      `INSERT INTO driver_profiles (user_id, is_online)
       VALUES ($1, $2)
       ON CONFLICT (user_id) DO UPDATE SET is_online = $2`,
      [req.user.id, isOnline]
    );
    res.json({ isOnline });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// PATCH /api/drivers/location — update driver GPS location (called every ~10s while on delivery)
router.patch('/location', authenticate, requireRole('driver'), async (req, res) => {
  const { lat, lng, orderId } = req.body;

  try {
    await pool.query(
      'UPDATE driver_profiles SET current_lat = $1, current_lng = $2, last_location_at = NOW() WHERE user_id = $3',
      [lat, lng, req.user.id]
    );

    // Broadcast to anyone tracking this order
    if (orderId) {
      req.io.to(`order_${orderId}`).emit('driver_location', { lat, lng });
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Location update failed' });
  }
});

// GET /api/drivers/available-orders — show ready orders near driver
router.get('/available-orders', authenticate, requireRole('driver'), async (req, res) => {
  try {
    const driver = await pool.query(
      'SELECT * FROM driver_profiles WHERE user_id = $1', [req.user.id]
    );

    if (!driver.rows.length || !driver.rows[0].is_online) {
      return res.json([]);
    }

    const { current_lat: lat, current_lng: lng } = driver.rows[0];

    // Find orders that are ready and unassigned, within ~10 miles
    const result = await pool.query(`
      SELECT o.*,
        b.name as brewery_name, b.address as brewery_address, b.lat as brewery_lat, b.lng as brewery_lng,
        da.street as delivery_street, da.city as delivery_city,
        (
          6371 * acos(
            least(1.0, cos(radians($1)) * cos(radians(b.lat)) *
            cos(radians(b.lng) - radians($2)) +
            sin(radians($1)) * sin(radians(b.lat)))
          )
        ) as brewery_distance_km
      FROM orders o
      JOIN breweries b ON b.id = o.brewery_id
      LEFT JOIN delivery_addresses da ON da.id = o.delivery_address_id
      WHERE o.status = 'ready'
        AND o.driver_id IS NULL
      ORDER BY brewery_distance_km ASC
    `, [lat || 38.2527, lng || -85.7585]);  // Default to Louisville coords

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to get available orders' });
  }
});

// POST /api/drivers/accept-order/:orderId — driver accepts a delivery job
router.post('/accept-order/:orderId', authenticate, requireRole('driver'), async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Lock the order row to prevent double-acceptance
    const orderResult = await client.query(
      'SELECT * FROM orders WHERE id = $1 AND status = $2 AND driver_id IS NULL FOR UPDATE',
      [req.params.orderId, 'ready']
    );

    if (!orderResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Order no longer available' });
    }

    await client.query(
      `UPDATE orders SET driver_id = $1, status = 'driver_assigned', updated_at = NOW() WHERE id = $2`,
      [req.user.id, req.params.orderId]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, 'driver_assigned', $2)`,
      [req.params.orderId, req.user.id]
    );

    await client.query('COMMIT');

    // Notify customer
    req.io.to(`order_${req.params.orderId}`).emit('status_update', {
      orderId: req.params.orderId,
      status: 'driver_assigned',
    });

    res.json({ orderId: req.params.orderId, status: 'driver_assigned' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Failed to accept order' });
  } finally {
    client.release();
  }
});

// POST /api/drivers/verify-id/:orderId — driver scans and confirms customer ID at door
// This is the critical compliance step before beer can be handed over
router.post('/verify-id/:orderId', authenticate, requireRole('driver'), async (req, res) => {
  const { scanData, manualVerified } = req.body;
  // scanData: barcode data from ID scan
  // manualVerified: boolean — driver visually confirmed ID matches person

  if (!manualVerified) {
    return res.status(400).json({ error: 'Driver must confirm ID visually matches customer' });
  }

  try {
    const orderResult = await pool.query(
      'SELECT * FROM orders WHERE id = $1 AND driver_id = $2',
      [req.params.orderId, req.user.id]
    );

    if (!orderResult.rows.length) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const order = orderResult.rows[0];

    // Verify customer is ID-verified in our system
    const customerResult = await pool.query(
      'SELECT id_verified, date_of_birth FROM users WHERE id = $1',
      [order.customer_id]
    );

    const customer = customerResult.rows[0];
    if (!customer.id_verified) {
      // Block delivery — should not happen but safety net
      return res.status(403).json({
        error: 'Customer ID not on file. Do not deliver. Contact support.',
        action: 'do_not_deliver'
      });
    }

    // Log the compliance event
    await pool.query(
      `UPDATE orders SET id_checked_at = NOW(), id_check_passed = TRUE, driver_id_scan_data = $1 WHERE id = $2`,
      [scanData, req.params.orderId]
    );

    await pool.query(
      `INSERT INTO compliance_log (order_id, event_type, driver_id, customer_id, details)
       VALUES ($1, 'id_verified', $2, $3, $4)`,
      [req.params.orderId, req.user.id, order.customer_id,
       JSON.stringify({ scanData, manualVerified, timestamp: new Date() })]
    );

    res.json({
      verified: true,
      message: 'ID verified. You may complete the delivery.',
      orderId: req.params.orderId
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'ID verification failed' });
  }
});

// GET /api/drivers/earnings — driver earnings summary
router.get('/earnings', authenticate, requireRole('driver'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'delivered') as total_deliveries,
        SUM(delivery_fee + tip) FILTER (WHERE status = 'delivered') as total_earned,
        SUM(delivery_fee + tip) FILTER (WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '24 hours') as earned_today,
        SUM(delivery_fee + tip) FILTER (WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '7 days') as earned_this_week
      FROM orders WHERE driver_id = $1
    `, [req.user.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Earnings fetch failed' });
  }
});

module.exports = router;
