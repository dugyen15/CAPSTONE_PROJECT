const express = require('express');
const { pool, tx } = require('../db');
const { HttpError, parseId, str, pick } = require('../lib/http');
const { requireAuth, requireStaff } = require('../middleware/auth');

const router = express.Router();

// Same field names as the frontend's mock-data.js, so wiring it up is a drop-in swap.
const ITEM_SELECT = `
  SELECT mi.id, mi.name, cat.name AS category, mi.category_id AS "categoryId",
         mi.price, mi.prep_time AS "prepTime", mi.is_available AS available,
         mi.description, mi.image_url AS image
  FROM menu_items mi
  JOIN categories cat ON cat.id = mi.category_id`;

function cleanName(value) {
  const name = str(value);
  if (!name || name.length > 100) throw new HttpError(400, 'Name must be 1 to 100 characters');
  return name;
}

function cleanPrice(value) {
  const price = Number(value);
  if (value === '' || value === null || !Number.isFinite(price) || price < 0 || price > 100000) {
    throw new HttpError(400, 'Price must be a number from 0 to 100000');
  }
  return Math.round(price * 100) / 100;
}

function cleanOptionalText(value, label, max) {
  const text = str(value);
  if (text.length > max) throw new HttpError(400, `${label} is too long`);
  return text || null;
}

async function resolveCategoryId(db, body) {
  const id = pick(body, 'categoryId', 'category_id');
  if (id !== undefined) {
    const categoryId = parseId(id, 'categoryId');
    const found = await db.query('SELECT id FROM categories WHERE id = $1', [categoryId]);
    if (found.rows.length === 0) throw new HttpError(400, 'Unknown category');
    return categoryId;
  }
  const name = str(body.category);
  if (!name) throw new HttpError(400, 'A category is required');
  const found = await db.query('SELECT id FROM categories WHERE lower(name) = lower($1)', [name]);
  if (found.rows.length === 0) throw new HttpError(400, `Unknown category "${name}"`);
  return found.rows[0].id;
}

// GET /api/menu/categories
router.get('/categories', async (req, res) => {
  const result = await pool.query('SELECT id, name FROM categories ORDER BY sort_order, name');
  res.json(result.rows);
});

// GET /api/menu            (optional: ?category=Meals)
// Sold-out items are included with available: false, so the app can show "Sold out".
router.get('/', async (req, res) => {
  const category = str(req.query.category);
  let result;
  if (category && category.toLowerCase() !== 'all') {
    result = await pool.query(
      `${ITEM_SELECT} WHERE lower(cat.name) = lower($1) ORDER BY cat.sort_order, mi.name`,
      [category]
    );
  } else {
    result = await pool.query(`${ITEM_SELECT} ORDER BY cat.sort_order, mi.name`);
  }
  res.json(result.rows);
});

// GET /api/menu/:id
router.get('/:id', async (req, res) => {
  const id = parseId(req.params.id);
  const result = await pool.query(`${ITEM_SELECT} WHERE mi.id = $1`, [id]);
  if (result.rows.length === 0) throw new HttpError(404, 'Menu item not found');
  res.json(result.rows[0]);
});

// POST /api/menu   (staff only)
// Body: { name, price, category | categoryId, description?, prepTime?, image?, available? }
router.post('/', requireAuth, requireStaff, async (req, res) => {
  const body = req.body ?? {};
  const name = cleanName(body.name);
  const price = cleanPrice(body.price);
  const categoryId = await resolveCategoryId(pool, body);
  const description = cleanOptionalText(body.description, 'Description', 1000);
  const prepTime = cleanOptionalText(body.prepTime ?? body.prep_time, 'Prep time', 30);
  const image = cleanOptionalText(pick(body, 'image', 'imageUrl', 'image_url'), 'Image URL', 2000);
  const available = body.available === undefined ? true : body.available === true;

  const inserted = await pool.query(
    `INSERT INTO menu_items (category_id, name, description, price, image_url, prep_time, is_available)
     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
    [categoryId, name, description, price, image, prepTime, available]
  );
  const result = await pool.query(`${ITEM_SELECT} WHERE mi.id = $1`, [inserted.rows[0].id]);
  res.status(201).json(result.rows[0]);
});

// PUT /api/menu/:id   (staff only) - send only the fields you want to change
router.put('/:id', requireAuth, requireStaff, async (req, res) => {
  const id = parseId(req.params.id);
  const body = req.body ?? {};

  const item = await tx(async (client) => {
    const current = await client.query('SELECT name, is_available FROM menu_items WHERE id = $1 FOR UPDATE', [id]);
    if (current.rows.length === 0) throw new HttpError(404, 'Menu item not found');

    const sets = [];
    const params = [];
    const set = (column, value) => {
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    };

    if (body.name !== undefined) set('name', cleanName(body.name));
    if (body.price !== undefined) set('price', cleanPrice(body.price));
    if (body.description !== undefined) set('description', cleanOptionalText(body.description, 'Description', 1000));
    const prep = body.prepTime ?? body.prep_time;
    if (prep !== undefined) set('prep_time', cleanOptionalText(prep, 'Prep time', 30));
    const image = pick(body, 'image', 'imageUrl', 'image_url');
    if (image !== undefined) set('image_url', cleanOptionalText(image, 'Image URL', 2000));
    if (body.available !== undefined) {
      if (typeof body.available !== 'boolean') throw new HttpError(400, 'available must be true or false');
      set('is_available', body.available);
    }
    if (body.category !== undefined || body.categoryId !== undefined || body.category_id !== undefined) {
      set('category_id', await resolveCategoryId(client, body));
    }
    if (sets.length === 0) throw new HttpError(400, 'Nothing to update');

    params.push(id);
    await client.query(`UPDATE menu_items SET ${sets.join(', ')} WHERE id = $${params.length}`, params);

    // Tell staff when an item has just been marked sold out
    if (current.rows[0].is_available && body.available === false) {
      await client.query(
        `INSERT INTO staff_notifications (kind, title, message, menu_item_id)
         VALUES ('item_sold_out', 'Item sold out', $1, $2)`,
        [`${current.rows[0].name} was marked sold out.`, id]
      );
    }

    const updated = await client.query(`${ITEM_SELECT} WHERE mi.id = $1`, [id]);
    return updated.rows[0];
  });

  res.json(item);
});

// DELETE /api/menu/:id   (staff only)
// Items that were never ordered are deleted. Items that appear in past orders are
// hidden instead (marked unavailable), so old orders keep their history.
router.delete('/:id', requireAuth, requireStaff, async (req, res) => {
  const id = parseId(req.params.id);
  try {
    const result = await pool.query('DELETE FROM menu_items WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) throw new HttpError(404, 'Menu item not found');
    res.json({ removed: true, hidden: false });
  } catch (err) {
    if (err.code !== '23503') throw err;
    await pool.query('UPDATE menu_items SET is_available = FALSE WHERE id = $1', [id]);
    res.json({
      removed: false,
      hidden: true,
      message: 'This item is in past orders, so it was marked unavailable instead of deleted.',
    });
  }
});

module.exports = router;
