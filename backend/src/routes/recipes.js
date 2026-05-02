import express from 'express';
import { devUser } from '../middleware/devUser.js';
import { getItem } from '../services/items.js';
import { suggestRecipe } from '../services/recipes.js';

const router = express.Router();
router.use(devUser);

// POST /api/recipes/suggest { item_id: "..." }
router.post('/suggest', async (req, res, next) => {
  try {
    const { item_id } = req.body || {};
    if (typeof item_id !== 'string' || !item_id) {
      return res.status(400).json({ error: 'item_id (string) is required' });
    }
    const item = await getItem(req.user, item_id); // throws 404 if missing
    const result = await suggestRecipe(item);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
