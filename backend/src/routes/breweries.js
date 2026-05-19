const express = require('express');
const { Pool } = require('pg');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// GET /api/breweries — list all breweries that have delivery enabled
router.get('/', async (req, res) => {
  const { lat, lng, city } = req.query;

  try {
    let query = `
      SELECT b.*,
        COUNT(CASE WHEN o.created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_orders
      FROM breweries b
      LEFT JOIN orders o ON o.brewery_id = b.id
      WHERE b.delivery_enabled = TRUE
    `;
    const params = [];

    if (city) {
      params.push(city);
      query += ` AND LOWER(b.city) = LOWER($${params.length})`;
    }

    // Distance ordering if coords provided
    if (lat && lng) {
      query += `
        GROUP BY b.id
        ORDER BY (
          6371 * acos(
            cos(radians($${params.length + 1})) * cos(radians(b.lat)) *
            cos(radians(b.lng) - radians($${params.length + 2})) +
            sin(radians($${params.length + 1})) * sin(radians(b.lat))
          )
        ) ASC
      `;
      params.push(lat, lng);
    } else {
      query += ' GROUP BY b.id ORDER BY b.name ASC';
    }

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to list breweries' });
  }
});

// GET /api/breweries/:id — single brewery with menu
router.get('/:id', async (req, res) => {
  try {
    const breweryResult = await pool.query('SELECT * FROM breweries WHERE id = $1', [req.params.id]);
    if (!breweryResult.rows.length) return res.status(404).json({ error: 'Not found' });

    const menuResult = await pool.query(
      `SELECT * FROM menu_items WHERE brewery_id = $1 AND available = TRUE ORDER BY sort_order, name`,
      [req.params.id]
    );

    res.json({ ...breweryResult.rows[0], menu: menuResult.rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get brewery' });
  }
});

// --- Brewery admin routes (require brewery_admin role) ---

// GET /api/breweries/:id/orders — current orders for this brewery
router.get('/:id/orders', authenticate, requireRole('brewery_admin', 'platform_admin'), async (req, res) => {
  const { status } = req.query;

  try {
    let query = `
      SELECT o.*,
        u.full_name as customer_name, u.phone as customer_phone,
        json_agg(json_build_object(
          'name', oi.name, 'quantity', oi.quantity, 'subtotal', oi.subtotal
        )) as items
      FROM orders o
      JOIN users u ON u.id = o.customer_id
      JOIN order_items oi ON oi.order_id = o.id
      WHERE o.brewery_id = $1
    `;
    const params = [req.params.id];

    if (status) {
      params.push(status);
      query += ` AND o.status = $${params.length}`;
    }

    query += ' GROUP BY o.id, u.full_name, u.phone ORDER BY o.created_at DESC';

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to get orders' });
  }
});

// POST /api/breweries/:id/menu — add menu item
router.post('/:id/menu', authenticate, requireRole('brewery_admin', 'platform_admin'), async (req, res) => {
  const { name, description, style, abv, ibu, sizeOz, containerType, price } = req.body;

  if (!name || !price || !containerType) {
    return res.status(400).json({ error: 'Name, price, and container type required' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO menu_items (brewery_id, name, description, style, abv, ibu, size_oz, container_type, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [req.params.id, name, description, style, abv, ibu, sizeOz, containerType, price]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

// PATCH /api/breweries/:id/menu/:itemId — update menu item (toggle availability, change price)
router.patch('/:id/menu/:itemId', authenticate, requireRole('brewery_admin', 'platform_admin'), async (req, res) => {
  const { available, price, name } = req.body;
  const updates = [];
  const params = [];

  if (available !== undefined) { params.push(available); updates.push(`available = $${params.length}`); }
  if (price !== undefined) { params.push(price); updates.push(`price = $${params.length}`); }
  if (name !== undefined) { params.push(name); updates.push(`name = $${params.length}`); }

  if (!updates.length) return res.status(400).json({ error: 'Nothing to update' });

  params.push(req.params.itemId, req.params.id);
  try {
    const result = await pool.query(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = $${params.length - 1} AND brewery_id = $${params.length} RETURNING *`,
      params
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Item not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Update failed' });
  }
});

// GET /api/breweries/:id/analytics — revenue + order stats
router.get('/:id/analytics', authenticate, requireRole('brewery_admin', 'platform_admin'), async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        COUNT(*) FILTER (WHERE status = 'delivered') as total_completed,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as orders_this_week,
        SUM(subtotal) FILTER (WHERE status = 'delivered') as total_revenue,
        AVG(subtotal) FILTER (WHERE status = 'delivered') as avg_order_value,
        COUNT(*) FILTER (WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '24 hours') as orders_today,
        SUM(subtotal) FILTER (WHERE status = 'delivered' AND created_at > NOW() - INTERVAL '24 hours') as revenue_today
      FROM orders WHERE brewery_id = $1
    `, [req.params.id]);

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Analytics failed' });
  }
});

module.exports = router;
