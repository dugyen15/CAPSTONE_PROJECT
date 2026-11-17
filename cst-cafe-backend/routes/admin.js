
const express = require('express');

const { pool } = require('../db');
const { HttpError } = require('../lib/http');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// All routes in this file require an authenticated admin.
router.use(requireAuth, requireAdmin);

// ======================================
// DASHBOARD OVERVIEW
// GET /api/admin/overview
// ======================================

router.get('/overview', async (req, res) => {
  const result = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM staff) AS total_staff,

      (
        SELECT COALESCE(SUM(total), 0)
        FROM orders
        WHERE created_at::date = CURRENT_DATE
          AND is_paid = TRUE
          AND status <> 'cancelled'
      ) AS today_sales,

      (SELECT COUNT(*) FROM orders) AS total_orders,

      (SELECT COUNT(*) FROM menu_items) AS total_menu_items
  `);

  const row = result.rows[0];

  res.json({
    totalStaff: Number(row.total_staff),
    todaySales: Number(row.today_sales),
    totalOrders: Number(row.total_orders),
    totalMenuItems: Number(row.total_menu_items),
  });
});

// ======================================
// VIEW ALL STAFF
// GET /api/admin/staff
// ======================================

router.get('/staff', async (req, res) => {
  const result = await pool.query(`
    SELECT
      id,
      name,
      email,
      avatar_url,
      created_at
    FROM staff
    ORDER BY created_at DESC, id DESC
  `);

  res.json({
    staff: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      avatarUrl: row.avatar_url ?? null,
      createdAt: row.created_at,
    })),
  });
});

// ======================================
// STAFF LOGIN AND LOGOUT HISTORY
// GET /api/admin/staff-activity
// ======================================

router.get('/staff-activity', async (req, res) => {
  const result = await pool.query(`
    SELECT
      sa.id,
      sa.staff_id,
      s.name AS staff_name,
      s.email AS staff_email,
      sa.login_at,
      sa.logout_at

    FROM staff_activity sa

    INNER JOIN staff s
      ON s.id = sa.staff_id

    ORDER BY sa.login_at DESC
    LIMIT 100
  `);

  res.json({
    activities: result.rows.map((row) => ({
      id: row.id,
      staffId: row.staff_id,
      staffName: row.staff_name,
      staffEmail: row.staff_email,
      loginAt: row.login_at,
      logoutAt: row.logout_at,
    })),
  });
});

// ======================================
// DELETE STAFF ACCOUNT
// DELETE /api/admin/staff/:id
// ======================================

router.delete('/staff/:id', async (req, res) => {
  const staffId = Number(req.params.id);

  if (
    !Number.isSafeInteger(staffId) ||
    staffId <= 0
  ) {
    throw new HttpError(400, 'Invalid staff ID');
  }

  const result = await pool.query(
    `
      DELETE FROM staff
      WHERE id = $1
      RETURNING id, name, email
    `,
    [staffId]
  );

  if (result.rows.length === 0) {
    throw new HttpError(404, 'Staff account not found');
  }

  const deletedStaff = result.rows[0];

  res.json({
    message: 'Staff account deleted successfully',
    staff: {
      id: deletedStaff.id,
      name: deletedStaff.name,
      email: deletedStaff.email,
    },
  });
});

// ======================================
// SALES AND ORDER INFORMATION
// GET /api/admin/sales
// ======================================

router.get('/sales', async (req, res) => {
  const summaryResult = await pool.query(`
    SELECT
      COUNT(*) AS total_orders,

      COUNT(*) FILTER (
        WHERE is_paid = TRUE
          AND status <> 'cancelled'
      ) AS paid_orders,

      COUNT(*) FILTER (
        WHERE status = 'completed'
      ) AS completed_orders,

      COUNT(*) FILTER (
        WHERE status IN ('waiting', 'preparing', 'ready', 'delayed')
      ) AS pending_orders,

      COUNT(*) FILTER (
        WHERE status = 'cancelled'
      ) AS cancelled_orders,

      COALESCE(
        SUM(total) FILTER (
          WHERE is_paid = TRUE
            AND status <> 'cancelled'
        ),
        0
      ) AS total_sales

    FROM orders
    WHERE created_at::date = CURRENT_DATE
  `);

  const ordersResult = await pool.query(`
    SELECT
      o.id,
      o.order_code,
      o.order_type,
      o.status,
      o.total,
      o.is_paid,
      o.created_at,
      c.name AS customer_name

    FROM orders o
    LEFT JOIN customers c
      ON c.id = o.customer_id

    WHERE o.created_at::date = CURRENT_DATE

    ORDER BY o.created_at DESC
    LIMIT 50
  `);

  const summary = summaryResult.rows[0];

  res.json({
    summary: {
      totalOrders: Number(summary.total_orders),
      paidOrders: Number(summary.paid_orders),
      completedOrders: Number(summary.completed_orders),
      pendingOrders: Number(summary.pending_orders),
      cancelledOrders: Number(summary.cancelled_orders),
      totalSales: Number(summary.total_sales),
    },

    orders: ordersResult.rows.map((row) => ({
      id: row.id,
      orderCode: row.order_code,
      orderType: row.order_type,
      status: row.status,
      total: Number(row.total),
      isPaid: row.is_paid,
      createdAt: row.created_at,
      customerName: row.customer_name,
    })),
  });
});

module.exports = router;
