import express from 'express';
import { devUser } from '../middleware/devUser.js';
import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  markOpened,
} from '../services/items.js';

const router = express.Router();
router.use(devUser);

// GET /api/items?status=active&location=fridge&opened=false
router.get('/', async (req, res, next) => {
  try {
    const filters = {};
    if (req.query.status !== undefined) filters.status = String(req.query.status);
    if (req.query.location !== undefined) filters.location = String(req.query.location);
    if (req.query.opened !== undefined) {
      filters.opened = req.query.opened === 'true';
    }
    const items = await listItems(req.user, filters);
    res.json({ items });
  } catch (err) {
    next(err);
  }
});

// POST /api/items
router.post('/', async (req, res, next) => {
  try {
    const item = await createItem(req.user, req.body || {});
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/items/:id/open  — must be defined before PATCH /:id
router.patch('/:id/open', async (req, res, next) => {
  try {
    const item = await markOpened(req.user, req.params.id);
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/items/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const item = await updateItem(req.user, req.params.id, req.body || {});
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/items/:id
router.delete('/:id', async (req, res, next) => {
  try {
    await deleteItem(req.user, req.params.id);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

export default router;
