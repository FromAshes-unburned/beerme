const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Pool } = require('pg');
const { authenticate, requireRole, requireIdVerified } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// POST /api/orders — place an order (customer only, must be ID verified)
router.post('/', authenticate, requireRole('customer'), requireIdVerified, async (req, res) => {
  const { breweryId, items, deliveryAddressId, tip = 0, notes } = req.body;

  if (!items || !items.length) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify brewery exists and delivery is enabled
    const breweryResult = await client.query(
      'SELECT * FROM breweries WHERE id = $1 AND delivery_enabled = TRUE',
      [breweryId]
    );
    if (!breweryResult.rows.length) {
      return res.status(404).json({ error: 'Brewery not found or not accepting delivery' });
    }
    const brewery = breweryResult.rows[0];

    // Fetch and price each item
    let subtotal = 0;
    const pricedItems = [];
    for (const item of items) {
      const menuResult = await client.query(
        'SELECT * FROM menu_items WHERE id = $1 AND brewery_id = $2 AND available = TRUE',
        [item.menuItemId, breweryId]
      );
      if (!menuResult.rows.length) {
        throw new Error(`Item ${item.menuItemId} not available`);
      }
      const menuItem = menuResult.rows[0];
      const lineTotal = menuItem.price * item.quantity;
      subtotal += lineTotal;
      pricedItems.push({ menuItem, quantity: item.quantity, lineTotal });
    }

    // Enforce minimum order
    if (subtotal < brewery.min_order_amount) {
      return res.status(400).json({
        error: `Minimum order is $${brewery.min_order_amount}`,
        minimum: brewery.min_order_amount
      });
    }

    const deliveryFee = brewery.delivery_fee;
    const serviceFee = parseFloat((subtotal * 0.12).toFixed(2));  // 12% platform fee
    const total = subtotal + deliveryFee + serviceFee + parseFloat(tip);

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),  // cents
      currency: 'usd',
      customer: req.user.stripe_customer_id,
      metadata: {
        beerme_user_id: req.user.id,
        beerme_brewery_id: breweryId,
      },
      transfer_data: {
        destination: brewery.stripe_account_id,
        amount: Math.round((subtotal - serviceFee) * 100),
      },
    });

    // Create order record
    const orderResult = await client.query(
      `INSERT INTO orders
        (customer_id, brewery_id, delivery_address_id, status,
         subtotal, delivery_fee, service_fee, tip, total,
         stripe_payment_intent_id, customer_notes)
       VALUES ($1, $2, $3, 'pending', $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [req.user.id, breweryId, deliveryAddressId,
       subtotal, deliveryFee, serviceFee, tip, total,
       paymentIntent.id, notes]
    );
    const order = orderResult.rows[0];

    // Insert order items
    for (const { menuItem, quantity, lineTotal } of pricedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, menu_item_id, name, quantity, unit_price, subtotal)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [order.id, menuItem.id, menuItem.name, quantity, menuItem.price, lineTotal]
      );
    }

    // Log status
    await client.query(
      `INSERT INTO order_status_history (order_id, status, changed_by) VALUES ($1, 'pending', $2)`,
      [order.id, req.user.id]
    );

    await client.query('COMMIT');

    // Notify brewery in real-time
    req.io.to(`brewery_${breweryId}`).emit('new_order', {
      orderId: order.id,
      orderNumber: order.order_number,
      total: order.total,
    });

    res.status(201).json({
      orderId: order.id,
      orderNumber: order.order_number,
      clientSecret: paymentIntent.client_secret,
      total: order.total,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: err.message || 'Order failed' });
  } finally {
    client.release();
  }
});

// GET /api/orders/:id — get order details
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT o.*,
         json_agg(
           json_build_object(
             'id', oi.id, 'name', oi.name, 'quantity', oi.quantity,
             'unitPrice', oi.unit_price, 'subtotal', oi.subtotal
           )
         ) as items,
         b.name as brewery_name, b.address as brewery_address,
         da.street, da.city, da.state, da.zip
       FROM orders o
       JOIN order_items oi ON oi.order_id = o.id
       JOIN breweries b ON b.id = o.brewery_id
       JOIN delivery_addresses da ON da.id = o.delivery_address_id
       WHERE o.id = $1
       GROUP BY o.id, b.name, b.address, da.street, da.city, da.state, da.zip`,
      [req.params.id]
    );

    if (!result.rows.length) return res.status(404).json({ error: 'Order not found' });

    const order = result.rows[0];

    // Only allow customer, their brewery, assigned driver, or admin
    const allowed =
      order.customer_id === req.user.id ||
      order.driver_id === req.user.id ||
      req.user.role === 'platform_admin';

    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get order' });
  }
});

// PATCH /api/orders/:id/status — update order status
router.patch('/:id/status', authenticate, async (req, res) => {
  const { status, note } = req.body;

  // Allowed transitions by role
  const allowedTransitions = {
    brewery_admin: ['accepted', 'preparing', 'ready', 'cancelled'],
    driver: ['driver_assigned', 'en_route', 'delivered', 'failed_id'],
    platform_admin: ['pending', 'accepted', 'preparing', 'ready', 'driver_assigned', 'en_route', 'delivered', 'cancelled', 'failed_id'],
  };

  const permitted = allowedTransitions[req.user.role] || [];
  if (!permitted.includes(status)) {
    return res.status(403).json({ error: `Your role cannot set status: ${status}` });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const orderResult = await client.query('SELECT * FROM orders WHERE id = $1', [req.params.id]);
    if (!orderResult.rows.length) return res.status(404).json({ error: 'Order not found' });

    const updates = { status, updated_at: 'NOW()' };

    // Record timestamps for key events
    if (status === 'en_route') updates.picked_up_at = 'NOW()';
    if (status === 'delivered') {
      updates.delivered_at = 'NOW()';
      updates.id_check_passed = true;
      updates.id_checked_at = 'NOW()';
    }
    if (status === 'failed_id') {
      updates.id_check_passed = false;
      updates.id_checked_at = 'NOW()';
    }

    await client.query(
      `UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2`,
      [status, req.params.id]
    );

    await client.query(
      `INSERT INTO order_status_history (order_id, status, changed_by, note) VALUES ($1, $2, $3, $4)`,
      [req.params.id, status, req.user.id, note]
    );

    // Log compliance events
    if (['delivered', 'failed_id'].includes(status)) {
      await client.query(
        `INSERT INTO compliance_log (order_id, event_type, driver_id, customer_id, details)
         VALUES ($1, $2, $3, $4, $5)`,
        [req.params.id, status, req.user.id,
         orderResult.rows[0].customer_id,
         JSON.stringify({ note, timestamp: new Date() })]
      );
    }

    await client.query('COMMIT');

    // Broadcast status update to all parties tracking this order
    req.io.to(`order_${req.params.id}`).emit('status_update', { orderId: req.params.id, status });

    res.json({ orderId: req.params.id, status });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ error: 'Status update failed' });
  } finally {
    client.release();
  }
});

// GET /api/orders — list orders for current user
router.get('/', authenticate, async (req, res) => {
  let query, params;

  if (req.user.role === 'customer') {
    query = `SELECT o.*, b.name as brewery_name FROM orders o
             JOIN breweries b ON b.id = o.brewery_id
             WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 20`;
    params = [req.user.id];
  } else if (req.user.role === 'driver') {
    query = `SELECT o.*, b.name as brewery_name FROM orders o
             JOIN breweries b ON b.id = o.brewery_id
             WHERE o.driver_id = $1 OR (o.status = 'ready' AND o.driver_id IS NULL)
             ORDER BY o.created_at DESC LIMIT 20`;
    params = [req.user.id];
  } else {
    return res.status(403).json({ error: 'Use brewery-specific order endpoint' });
  }

  try {
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to list orders' });
  }
});

module.exports = router;
