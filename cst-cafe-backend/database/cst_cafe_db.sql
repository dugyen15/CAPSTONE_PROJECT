-- ============================================================
-- CST CAFE — Final Schema
-- PostgreSQL 12+  |  pgAdmin 4 Query Tool
-- Generated through a 13-step design process
-- ============================================================

-- ------------------------------------------------------------
-- 1. SCHEMA
-- ------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS cst_cafe;
SET search_path TO cst_cafe;

-- ------------------------------------------------------------
-- 2. CLEAN SLATE (safe re-run)
-- ------------------------------------------------------------
DROP TABLE IF EXISTS staff_notifications CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS cafe_tables CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS staff CASCADE;

DROP VIEW  IF EXISTS v_customer_orders CASCADE;
DROP VIEW  IF EXISTS v_notifications CASCADE;
DROP VIEW  IF EXISTS v_feedback CASCADE;
DROP VIEW  IF EXISTS v_menu_items CASCADE;
DROP VIEW  IF EXISTS v_staff_queue CASCADE;

DROP TYPE  IF EXISTS order_status CASCADE;
DROP TYPE  IF EXISTS order_type CASCADE;
DROP TYPE  IF EXISTS booking_status CASCADE;
DROP TYPE  IF EXISTS notification_kind CASCADE;

-- ------------------------------------------------------------
-- 3. ENUM TYPES
-- ------------------------------------------------------------
CREATE TYPE order_status AS ENUM
  ('waiting','preparing','ready','delayed','completed','cancelled');

CREATE TYPE order_type AS ENUM ('dine-in','takeaway');

CREATE TYPE booking_status AS ENUM
  ('booked','seated','completed','cancelled','no_show');

CREATE TYPE notification_kind AS ENUM
  ('new_order','order_cancelled','order_delayed','item_sold_out');

-- ------------------------------------------------------------
-- 4. TABLES
-- ------------------------------------------------------------

-- 4.1 STAFF (standalone — no FKs in or out)
CREATE TABLE staff (
  id            SERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  avatar_url    TEXT
);

-- 4.2 CUSTOMERS
CREATE TABLE customers (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.3 CATEGORIES
CREATE TABLE categories (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  sort_order INT  NOT NULL DEFAULT 0
);

-- 4.4 MENU ITEMS
CREATE TABLE menu_items (
  id           SERIAL PRIMARY KEY,
  category_id  INT           NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  name         TEXT          NOT NULL,
  description  TEXT,
  price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  image_url    TEXT,
  prep_time    TEXT,
  is_available BOOLEAN       NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- 4.5 CAFE TABLES
CREATE TABLE cafe_tables (
  id        SERIAL PRIMARY KEY,
  label     TEXT    NOT NULL UNIQUE,
  capacity  INT     NOT NULL CHECK (capacity > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4.6 SETTINGS
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 4.7 ORDERS
CREATE TABLE orders (
  id               SERIAL PRIMARY KEY,
  order_code       TEXT         NOT NULL UNIQUE,
  queue_number     INT          NOT NULL,
  customer_id      INT          NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  table_id         INT          REFERENCES cafe_tables(id) ON DELETE SET NULL,
  order_type       order_type   NOT NULL,
  status           order_status NOT NULL DEFAULT 'waiting',
  subtotal         NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  takeaway_fee     NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (takeaway_fee >= 0),
  total            NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  is_paid          BOOLEAN      NOT NULL DEFAULT FALSE,
  is_delayed       BOOLEAN      NOT NULL DEFAULT FALSE,
  notes            TEXT,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  confirmed_at     TIMESTAMPTZ,
  ready_at         TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  cancelled_at     TIMESTAMPTZ,
  CONSTRAINT orders_table_matches_type CHECK (
    (order_type = 'dine-in'  AND table_id IS NOT NULL) OR
    (order_type = 'takeaway' AND table_id IS NULL)
  )
);

CREATE UNIQUE INDEX orders_active_queue_number
  ON orders(queue_number)
  WHERE status NOT IN ('completed','cancelled');

-- 4.8 ORDER ITEMS
CREATE TABLE order_items (
  id           SERIAL PRIMARY KEY,
  order_id     INT           NOT NULL REFERENCES orders(id)     ON DELETE CASCADE,
  menu_item_id INT           NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  item_name    TEXT          NOT NULL,
  unit_price   NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  qty          INT           NOT NULL CHECK (qty > 0),
  line_total   NUMERIC(10,2) GENERATED ALWAYS AS (unit_price * qty) STORED
);

-- 4.9 BOOKINGS (constraint added in section 5)
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE bookings (
  id            SERIAL PRIMARY KEY,
  customer_id   INT            NOT NULL REFERENCES customers(id)   ON DELETE RESTRICT,
  table_id      INT            NOT NULL REFERENCES cafe_tables(id) ON DELETE RESTRICT,
  order_id      INT            REFERENCES orders(id) ON DELETE SET NULL,
  party_size    INT            NOT NULL CHECK (party_size > 0),
  booking_time  TIMESTAMPTZ    NOT NULL,
  duration_min  INT            NOT NULL DEFAULT 60 CHECK (duration_min > 0),
  booking_end   TIMESTAMPTZ    NOT NULL,
  status        booking_status NOT NULL DEFAULT 'booked',
  notes         TEXT,
  created_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT bookings_end_after_start CHECK (booking_end > booking_time)
);

-- 4.10 FEEDBACK (anonymous)
CREATE TABLE feedback (
  id         SERIAL PRIMARY KEY,
  rating     INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4.11 STAFF NOTIFICATIONS
CREATE TABLE staff_notifications (
  id            SERIAL PRIMARY KEY,
  kind          notification_kind NOT NULL,
  title         TEXT        NOT NULL,
  message       TEXT        NOT NULL,
  order_id      INT REFERENCES orders(id)     ON DELETE SET NULL,
  menu_item_id  INT REFERENCES menu_items(id) ON DELETE SET NULL,
  read          BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ------------------------------------------------------------
-- 5. BOOKINGS OVERLAP CONSTRAINT
-- ------------------------------------------------------------
ALTER TABLE bookings
  ADD CONSTRAINT bookings_no_overlap
  EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(booking_time, booking_end, '[)') WITH &&
  )
  WHERE (status IN ('booked','seated'));

-- ------------------------------------------------------------
-- 6. INDEXES
-- ------------------------------------------------------------
CREATE INDEX idx_menu_items_category    ON menu_items(category_id);
CREATE INDEX idx_menu_items_available   ON menu_items(is_available);
CREATE INDEX idx_orders_customer        ON orders(customer_id);
CREATE INDEX idx_orders_status          ON orders(status);
CREATE INDEX idx_orders_created         ON orders(created_at DESC);
CREATE INDEX idx_orders_type_status     ON orders(order_type, status);
CREATE INDEX idx_order_items_order      ON order_items(order_id);
CREATE INDEX idx_order_items_menu       ON order_items(menu_item_id);
CREATE INDEX idx_bookings_customer      ON bookings(customer_id);
CREATE INDEX idx_bookings_table_time    ON bookings(table_id, booking_time);
CREATE INDEX idx_bookings_order         ON bookings(order_id);
CREATE INDEX idx_feedback_created       ON feedback(created_at DESC);
CREATE INDEX idx_notifications_unread   ON staff_notifications(read, created_at DESC);

-- ------------------------------------------------------------
-- 7. TRIGGERS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_customer_updated
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_menu_item_updated
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_booking_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ------------------------------------------------------------
-- 8. VIEWS (shapes match the frontend 1:1)
-- ------------------------------------------------------------

CREATE OR REPLACE VIEW v_staff_queue AS
SELECT
  o.order_code                                            AS id,
  c.name                                                  AS customer,
  COALESCE(t.label, '—')                                  AS "table",
  o.order_type                                            AS "orderType",
  COALESCE(SUM(oi.qty), 0)::int                           AS items,
  to_char(o.created_at, 'HH24:MI')                        AS time,
  CASE WHEN o.is_delayed THEN 'delayed' ELSE o.status::text END AS status,
  o.is_paid                                               AS "isPaid"
FROM orders o
JOIN customers c         ON c.id = o.customer_id
LEFT JOIN cafe_tables t  ON t.id = o.table_id
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.status NOT IN ('completed','cancelled')
GROUP BY o.id, c.name, t.label
ORDER BY o.created_at ASC;

CREATE OR REPLACE VIEW v_menu_items AS
SELECT
  mi.id            AS id,
  mi.name          AS name,
  cat.name         AS category,
  mi.price         AS price,
  mi.prep_time     AS "prepTime",
  mi.is_available  AS available,
  mi.description   AS description,
  mi.image_url     AS image
FROM menu_items mi
JOIN categories cat ON cat.id = mi.category_id
ORDER BY cat.sort_order, mi.name;

CREATE OR REPLACE VIEW v_feedback AS
SELECT
  id,
  rating,
  comment,
  to_char(created_at, 'YYYY-MM-DD HH24:MI') AS time
FROM feedback
ORDER BY created_at DESC;

CREATE OR REPLACE VIEW v_notifications AS
SELECT
  id,
  title,
  message,
  to_char(created_at, 'YYYY-MM-DD HH24:MI') AS time,
  read
FROM staff_notifications
ORDER BY read ASC, created_at DESC;

CREATE OR REPLACE VIEW v_customer_orders AS
SELECT
  o.order_code            AS id,
  o.queue_number          AS "queueNumber",
  o.status                AS status,
  o.order_type            AS "orderType",
  o.subtotal              AS subtotal,
  o.takeaway_fee          AS "takeawayFee",
  o.total                 AS total,
  o.is_paid               AS "isPaid",
  COALESCE(t.label, NULL) AS "table",
  (
    SELECT COUNT(*)::int
    FROM orders o2
    WHERE o2.status NOT IN ('completed','cancelled')
      AND o2.created_at < o.created_at
  )                       AS "aheadInQueue",
  COALESCE(
    json_agg(
      json_build_object(
        'id',     oi.id,
        'name',   oi.item_name,
        'price',  oi.unit_price,
        'qty',    oi.qty
      ) ORDER BY oi.id
    ) FILTER (WHERE oi.id IS NOT NULL),
    '[]'::json
  )                       AS items
FROM orders o
JOIN customers c         ON c.id = o.customer_id
LEFT JOIN cafe_tables t  ON t.id = o.table_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, t.label;

-- ------------------------------------------------------------
-- 9. SEED DATA
-- ------------------------------------------------------------

INSERT INTO settings (key, value) VALUES ('takeaway_fee', '30');

INSERT INTO categories (name, sort_order) VALUES
  ('Meals',    1),
  ('Snacks',   2),
  ('Drinks',   3),
  ('Desserts', 4);

INSERT INTO cafe_tables (label, capacity) VALUES
  ('T1', 2), ('T2', 2), ('T3', 4), ('T4', 4),
  ('T5', 6), ('T6', 6), ('Patio-1', 4), ('Patio-2', 4);

INSERT INTO staff (name, email, password_hash) VALUES
  ('Staff User',   'staff@cstcafe.test',   'placeholder_hash'),
  ('Kitchen Lead', 'kitchen@cstcafe.test', 'placeholder_hash'),
  ('Manager',      'manager@cstcafe.test', 'placeholder_hash');

INSERT INTO customers (name, email, password_hash, phone) VALUES
  ('Test Customer', 'customer@cstcafe.test', 'placeholder_hash', '17123456');

INSERT INTO menu_items (category_id, name, description, price, prep_time, is_available)
SELECT c.id, v.name, v.description, v.price, v.prep_time, v.is_available
FROM (VALUES
  ('Meals',    'Chicken Burger',    'Grilled chicken, lettuce, house sauce',    180, '12 min', TRUE),
  ('Meals',    'Veg Fried Rice',    'Wok-tossed rice with seasonal vegetables', 140, '10 min', TRUE),
  ('Snacks',   'French Fries',      'Crispy, lightly salted',                    80, '6 min',  TRUE),
  ('Snacks',   'Chicken Momo',      'Steamed dumplings, 6 pieces',              120, '10 min', TRUE),
  ('Snacks',   'Cheese Sandwich',   'Toasted sandwich with melted cheese',      100, '7 min',  FALSE),
  ('Drinks',   'Masala Tea',        'Spiced milk tea',                           50, '4 min',  TRUE),
  ('Drinks',   'Cold Coffee',       'Iced coffee with milk',                     90, '5 min',  TRUE),
  ('Desserts', 'Chocolate Brownie', 'Warm brownie, single serving',             110, '5 min',  TRUE),
  ('Desserts', 'Fruit Custard',     'Chilled custard with fresh fruit',         100, '5 min',  TRUE)
) AS v(cat_name, name, description, price, prep_time, is_available)
JOIN categories c ON c.name = v.cat_name;

INSERT INTO feedback (rating, comment, created_at) VALUES
  (5, 'Best momo on campus!',              now() - interval '2 days'),
  (4, 'Fast service, will order again.',   now() - interval '1 day'),
  (5, NULL,                                now() - interval '6 hours'),
  (3, 'Tea was a little cold today.',      now() - interval '2 hours');

INSERT INTO staff_notifications (kind, title, message, read, created_at) VALUES
  ('new_order',       'New order',       'ORD-0144 placed for Table 2 — 3 items.',          FALSE, now() - interval '2 minutes'),
  ('order_cancelled', 'Order cancelled', 'ORD-0138 was cancelled by the customer.',          FALSE, now() - interval '8 minutes'),
  ('order_delayed',   'Order delayed',   'ORD-0143 (takeaway) is running behind schedule.',  FALSE, now() - interval '15 minutes'),
  ('item_sold_out',   'Item sold out',   'Cheese Sandwich was marked sold out.',             TRUE,  now() - interval '1 hour');

-- ------------------------------------------------------------
-- 10. DONE.
-- ------------------------------------------------------------
