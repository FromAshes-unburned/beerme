// Run with: node src/models/migrate.js
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        phone TEXT,
        role TEXT NOT NULL CHECK (role IN ('customer', 'driver', 'brewery_admin', 'platform_admin')),
        -- ID verification
        id_verified BOOLEAN DEFAULT FALSE,
        id_verified_at TIMESTAMPTZ,
        stripe_identity_session_id TEXT,
        date_of_birth DATE,
        -- Stripe customer ID for payments
        stripe_customer_id TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS breweries (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        slug TEXT UNIQUE NOT NULL,
        description TEXT,
        address TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        lat DECIMAL(9,6),
        lng DECIMAL(9,6),
        phone TEXT,
        email TEXT,
        logo_url TEXT,
        -- KY ABC license info
        abc_license_number TEXT,
        abc_license_expires DATE,
        delivery_enabled BOOLEAN DEFAULT FALSE,
        min_order_amount DECIMAL(10,2) DEFAULT 12.00,
        delivery_fee DECIMAL(10,2) DEFAULT 4.00,
        -- Operating hours stored as JSON: {"mon": {"open": "11:00", "close": "22:00"}, ...}
        hours JSONB,
        stripe_account_id TEXT,
        owner_user_id UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        brewery_id UUID REFERENCES breweries(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        description TEXT,
        style TEXT,
        abv DECIMAL(4,2),
        ibu INTEGER,
        size_oz INTEGER,
        container_type TEXT CHECK (container_type IN ('crowler', 'growler', 'can_4pack', 'can_6pack', 'bottle', 'case')),
        price DECIMAL(10,2) NOT NULL,
        image_url TEXT,
        available BOOLEAN DEFAULT TRUE,
        sort_order INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS delivery_addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        label TEXT DEFAULT 'Home',
        street TEXT NOT NULL,
        city TEXT NOT NULL,
        state TEXT NOT NULL,
        zip TEXT NOT NULL,
        lat DECIMAL(9,6),
        lng DECIMAL(9,6),
        is_default BOOLEAN DEFAULT FALSE
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number SERIAL,
        customer_id UUID REFERENCES users(id),
        brewery_id UUID REFERENCES breweries(id),
        driver_id UUID REFERENCES users(id),
        delivery_address_id UUID REFERENCES delivery_addresses(id),
        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN (
            'pending',        -- placed, awaiting brewery acceptance
            'accepted',       -- brewery confirmed
            'preparing',      -- brewery is packing
            'ready',          -- ready for driver pickup
            'driver_assigned',
            'en_route',       -- driver picked up, en route to customer
            'delivered',      -- ID checked, beer handed over
            'cancelled',
            'failed_id'       -- customer failed ID check, returned
          )),
        -- Financials
        subtotal DECIMAL(10,2) NOT NULL,
        delivery_fee DECIMAL(10,2) NOT NULL,
        service_fee DECIMAL(10,2) NOT NULL,
        tip DECIMAL(10,2) DEFAULT 0,
        total DECIMAL(10,2) NOT NULL,
        -- Stripe
        stripe_payment_intent_id TEXT,
        stripe_payment_status TEXT,
        -- Compliance
        id_checked_at TIMESTAMPTZ,
        id_check_passed BOOLEAN,
        driver_id_scan_data TEXT,
        -- Timing
        estimated_pickup_at TIMESTAMPTZ,
        estimated_delivery_at TIMESTAMPTZ,
        picked_up_at TIMESTAMPTZ,
        delivered_at TIMESTAMPTZ,
        -- Notes
        customer_notes TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
        menu_item_id UUID REFERENCES menu_items(id),
        name TEXT NOT NULL,
        quantity INTEGER NOT NULL,
        unit_price DECIMAL(10,2) NOT NULL,
        subtotal DECIMAL(10,2) NOT NULL
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS driver_profiles (
        user_id UUID PRIMARY KEY REFERENCES users(id),
        vehicle_make TEXT,
        vehicle_model TEXT,
        vehicle_year INTEGER,
        license_plate TEXT,
        drivers_license_number TEXT,
        alcohol_delivery_certified BOOLEAN DEFAULT FALSE,
        certified_at TIMESTAMPTZ,
        -- Earnings
        total_deliveries INTEGER DEFAULT 0,
        total_earnings DECIMAL(10,2) DEFAULT 0,
        rating DECIMAL(3,2),
        -- Availability
        is_online BOOLEAN DEFAULT FALSE,
        current_lat DECIMAL(9,6),
        current_lng DECIMAL(9,6),
        last_location_at TIMESTAMPTZ,
        stripe_connect_account_id TEXT
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        status TEXT NOT NULL,
        changed_by UUID REFERENCES users(id),
        note TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS compliance_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id UUID REFERENCES orders(id),
        event_type TEXT NOT NULL,
        driver_id UUID REFERENCES users(id),
        customer_id UUID REFERENCES users(id),
        details JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `);

    // Indexes for performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_brewery ON orders(brewery_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_driver ON orders(driver_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_menu_items_brewery ON menu_items(brewery_id);`);

    await client.query('COMMIT');
    console.log('Migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', err);
    throw err;
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
