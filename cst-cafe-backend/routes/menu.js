const express = require('express');
const pool = require('../db');
const { requireAuth, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// GET /api/menu  (optional: ?category=Drinks)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let result;

    if (category) {
      result = await pool.query(
        'SELECT * FROM menu_items WHERE available = TRUE AND category = $1 ORDER BY id',
        [category]
      );
    } else {
      result = await pool.query(
        'SELECT * FROM menu_items WHERE available = TRUE ORDER BY id'
      );
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM menu_items WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/menu  (admin only)
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category, image_url } = req.body;

    if (!name || price === undefined || Number(price) < 0) {
      return res.status(400).json({ error: 'Name and a valid price are required' });
    }

    const result = await pool.query(
      `INSERT INTO menu_items (name, description, price, category, image_url)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, description || null, price, category || null, image_url || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/menu/:id  (admin only)
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description, price, category, image_url, available } = req.body;

    const result = await pool.query(
      `UPDATE menu_items SET
         name = COALESCE($1, name),
         description = COALESCE($2, description),
         price = COALESCE($3, price),
         category = COALESCE($4, category),
         image_url = COALESCE($5, image_url),
         available = COALESCE($6, available)
       WHERE id = $7 RETURNING *`,
      [name, description, price, category, image_url, available, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/menu/:id  (admin only)
// Hides the item instead of deleting it, so old orders that contain it stay intact
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE menu_items SET available = FALSE WHERE id = $1 RETURNING id',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Menu item not found' });
    }

    res.json({ message: 'Menu item removed from the menu' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;