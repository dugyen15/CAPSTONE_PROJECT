
-- ============================================================
-- CST CAFE — Database Schema
-- PostgreSQL 18 | pgAdmin 4 Query Tool
-- Based on the current CST Cafe database structure
-- ============================================================


-- ------------------------------------------------------------
-- 1. SCHEMA
-- ------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS cst_cafe;
SET search_path TO cst_cafe;


-- ------------------------------------------------------------
-- 2. ENUM TYPES
-- ------------------------------------------------------------

CREATE TYPE booking_status AS ENUM (
    'booked',
    'seated',
    'completed',
    'cancelled',
    'no_show'
);

CREATE TYPE notification_kind AS ENUM (
    'new_order',
    'order_cancelled',
    'order_delayed',
    'item_sold_out'
);

CREATE TYPE order_status AS ENUM (
    'waiting',
    'preparing',
    'ready',
    'delayed',
    'completed',
    'cancelled'
);

CREATE TYPE order_type AS ENUM (
    'dine-in',
    'takeaway'
);


-- ------------------------------------------------------------
-- 3. TABLES
-- ------------------------------------------------------------

-- 3.1 ADMINS

CREATE TABLE admins (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.2 STAFF

CREATE TABLE staff (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL,
    email      TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    avatar_url TEXT
);


-- 3.3 CUSTOMERS

CREATE TABLE customers (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    phone         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.4 CATEGORIES

CREATE TABLE categories (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    sort_order INT NOT NULL DEFAULT 0
);


-- 3.5 CAFE TABLES

CREATE TABLE cafe_tables (
    id        SERIAL PRIMARY KEY,
    label     TEXT NOT NULL UNIQUE,
    capacity  INT NOT NULL CHECK (capacity > 0),
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);


-- 3.6 SETTINGS

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);


-- 3.7 MENU ITEMS

CREATE TABLE menu_items (
    id           SERIAL PRIMARY KEY,
    category_id  INT NOT NULL
        REFERENCES categories(id) ON DELETE RESTRICT,
    name         TEXT NOT NULL,
    description  TEXT,
    price        NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    image_url    TEXT,
    prep_time    TEXT,
    is_available BOOLEAN NOT NULL DEFAULT TRUE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.8 ORDERS

CREATE TABLE orders (
    id            SERIAL PRIMARY KEY,
    order_code    TEXT NOT NULL UNIQUE,
    queue_number  INT NOT NULL,
    customer_id   INT NOT NULL
        REFERENCES customers(id) ON DELETE RESTRICT,
    table_id      INT
        REFERENCES cafe_tables(id) ON DELETE SET NULL,
    order_type    order_type NOT NULL,
    status        order_status NOT NULL DEFAULT 'waiting',
    subtotal      NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (subtotal >= 0),
    takeaway_fee  NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (takeaway_fee >= 0),
    total         NUMERIC(10,2) NOT NULL DEFAULT 0
        CHECK (total >= 0),
    is_paid       BOOLEAN NOT NULL DEFAULT FALSE,
    is_delayed    BOOLEAN NOT NULL DEFAULT FALSE,
    notes         TEXT,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    confirmed_at  TIMESTAMPTZ,
    ready_at      TIMESTAMPTZ,
    completed_at  TIMESTAMPTZ,
    cancelled_at  TIMESTAMPTZ,

    CONSTRAINT orders_table_matches_type CHECK (
        (order_type = 'dine-in' AND table_id IS NOT NULL)
        OR
        (order_type = 'takeaway' AND table_id IS NULL)
    )
);


-- 3.9 ORDER ITEMS

CREATE TABLE order_items (
    id           SERIAL PRIMARY KEY,
    order_id     INT NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,
    menu_item_id INT NOT NULL
        REFERENCES menu_items(id) ON DELETE RESTRICT,
    item_name    TEXT NOT NULL,
    unit_price   NUMERIC(10,2) NOT NULL
        CHECK (unit_price >= 0),
    qty          INT NOT NULL CHECK (qty > 0),
    line_total   NUMERIC(10,2)
        GENERATED ALWAYS AS (unit_price * qty) STORED
);


-- 3.10 BOOKINGS

CREATE TABLE bookings (
    id           SERIAL PRIMARY KEY,
    customer_id  INT NOT NULL
        REFERENCES customers(id) ON DELETE RESTRICT,
    table_id     INT NOT NULL
        REFERENCES cafe_tables(id) ON DELETE RESTRICT,
    order_id     INT
        REFERENCES orders(id) ON DELETE SET NULL,
    party_size   INT NOT NULL CHECK (party_size > 0),
    booking_time TIMESTAMPTZ NOT NULL,
    duration_min INT NOT NULL DEFAULT 60
        CHECK (duration_min > 0),
    booking_end  TIMESTAMPTZ NOT NULL,
    status       booking_status NOT NULL DEFAULT 'booked',
    notes        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT bookings_end_after_start
        CHECK (booking_end > booking_time)
);


-- 3.11 FEEDBACK

CREATE TABLE feedback (
    id         SERIAL PRIMARY KEY,
    rating     INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- 3.12 STAFF INVITATIONS

CREATE TABLE staff_invitations (
    id         SERIAL PRIMARY KEY,
    email      VARCHAR(255) NOT NULL,
    code_hash  VARCHAR(64) NOT NULL UNIQUE,
    created_by INT NOT NULL
        REFERENCES staff(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    used_at    TIMESTAMP
);


-- 3.13 STAFF NOTIFICATIONS

CREATE TABLE staff_notifications (
    id           SERIAL PRIMARY KEY,
    kind         notification_kind NOT NULL,
    title        TEXT NOT NULL,
    message      TEXT NOT NULL,
    order_id     INT
        REFERENCES orders(id) ON DELETE SET NULL,
    menu_item_id INT
        REFERENCES menu_items(id) ON DELETE SET NULL,
    read         BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 4. BOOKING OVERLAP CONSTRAINT
-- ------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE bookings
ADD CONSTRAINT bookings_no_overlap
EXCLUDE USING gist (
    table_id WITH =,
    tstzrange(booking_time, booking_end, '[)') WITH &&
)
WHERE (status IN ('booked', 'seated'));


-- ------------------------------------------------------------
-- 5. INDEXES
-- ------------------------------------------------------------

CREATE INDEX idx_bookings_customer
    ON bookings(customer_id);

CREATE INDEX idx_bookings_order
    ON bookings(order_id);

CREATE INDEX idx_bookings_table_time
    ON bookings(table_id, booking_time);

CREATE INDEX idx_feedback_created
    ON feedback(created_at DESC);

CREATE INDEX idx_menu_items_available
    ON menu_items(is_available);

CREATE INDEX idx_menu_items_category
    ON menu_items(category_id);

CREATE INDEX idx_notifications_unread
    ON staff_notifications(read, created_at DESC);

CREATE INDEX idx_order_items_menu
    ON order_items(menu_item_id);

CREATE INDEX idx_order_items_order
    ON order_items(order_id);

CREATE INDEX idx_orders_created
    ON orders(created_at DESC);

CREATE INDEX idx_orders_customer
    ON orders(customer_id);

CREATE INDEX idx_orders_status
    ON orders(status);

CREATE INDEX idx_orders_type_status
    ON orders(order_type, status);

CREATE INDEX idx_staff_invitations_email
    ON staff_invitations(email);

CREATE INDEX idx_staff_invitations_expiry
    ON staff_invitations(expires_at);

CREATE UNIQUE INDEX orders_active_queue_number
    ON orders(queue_number)
    WHERE status NOT IN ('completed', 'cancelled');


-- ------------------------------------------------------------
-- 6. FUNCTIONS AND TRIGGERS
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- Automatically update customer records

CREATE TRIGGER trg_customer_updated
BEFORE UPDATE ON customers
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Automatically update menu item records

CREATE TRIGGER trg_menu_item_updated
BEFORE UPDATE ON menu_items
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- Automatically update booking records

CREATE TRIGGER trg_booking_updated
BEFORE UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();


-- ------------------------------------------------------------
-- 7. VIEWS
-- ------------------------------------------------------------

-- 7.1 CUSTOMER ORDERS VIEW

CREATE OR REPLACE VIEW v_customer_orders AS
SELECT
    o.order_code AS id,
    o.queue_number AS "queueNumber",
    o.status,
    o.order_type AS "orderType",
    o.subtotal,
    o.takeaway_fee AS "takeawayFee",
    o.total,
    o.is_paid AS "isPaid",
    COALESCE(t.label, NULL::TEXT) AS "table",

    (
        SELECT COUNT(*)::INT
        FROM orders o2
        WHERE o2.status NOT IN ('completed', 'cancelled')
          AND o2.created_at < o.created_at
    ) AS "aheadInQueue",

    COALESCE(
        json_agg(
            json_build_object(
                'id', oi.id,
                'name', oi.item_name,
                'price', oi.unit_price,
                'qty', oi.qty
            )
            ORDER BY oi.id
        ) FILTER (WHERE oi.id IS NOT NULL),
        '[]'::JSON
    ) AS items

FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN cafe_tables t ON t.id = o.table_id
LEFT JOIN order_items oi ON oi.order_id = o.id
GROUP BY o.id, t.label;


-- 7.2 FEEDBACK VIEW

CREATE OR REPLACE VIEW v_feedback AS
SELECT
    id,
    rating,
    comment,
    to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "time"
FROM feedback
ORDER BY created_at DESC;


-- 7.3 MENU ITEMS VIEW

CREATE OR REPLACE VIEW v_menu_items AS
SELECT
    mi.id,
    mi.name,
    cat.name AS category,
    mi.price,
    mi.prep_time AS "prepTime",
    mi.is_available AS available,
    mi.description,
    mi.image_url AS image
FROM menu_items mi
JOIN categories cat ON cat.id = mi.category_id
ORDER BY cat.sort_order, mi.name;


-- 7.4 NOTIFICATIONS VIEW

CREATE OR REPLACE VIEW v_notifications AS
SELECT
    id,
    title,
    message,
    to_char(created_at, 'YYYY-MM-DD HH24:MI') AS "time",
    read
FROM staff_notifications
ORDER BY read, created_at DESC;


-- 7.5 STAFF QUEUE VIEW

CREATE OR REPLACE VIEW v_staff_queue AS
SELECT
    o.order_code AS id,
    c.name AS customer,
    COALESCE(t.label, '—'::TEXT) AS "table",
    o.order_type AS "orderType",
    COALESCE(SUM(oi.qty), 0)::INT AS items,
    to_char(o.created_at, 'HH24:MI') AS "time",

    CASE
        WHEN o.is_delayed THEN 'delayed'
        ELSE o.status::TEXT
    END AS status,

    o.is_paid AS "isPaid"

FROM orders o
JOIN customers c ON c.id = o.customer_id
LEFT JOIN cafe_tables t ON t.id = o.table_id
LEFT JOIN order_items oi ON oi.order_id = o.id

WHERE o.status NOT IN ('completed', 'cancelled')

GROUP BY o.id, c.name, t.label
ORDER BY o.created_at;


-- ------------------------------------------------------------
-- 8. COMPLETED
-- ------------------------------------------------------------

-- CST Cafe database schema successfully defined.
-- This script contains database structure and does not
-- insert customer, staff, order, or other existing records.

-- ============================================================
-- END OF CST CAFE DATABASE SCHEMA
-- ============================================================
