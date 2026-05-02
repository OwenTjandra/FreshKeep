import express from 'express';
import { scanBarcode } from '../services/scan.js';

const router = express.Router();

// POST /api/scan { barcode: "0000000000000" }
router.post('/', async (req, res, next) => {
  try {
    const { barcode } = req.body || {};
    if (typeof barcode !== 'string' || !barcode.trim()) {
      return res.status(400).json({ error: 'barcode (non-empty string) is required' });
    }
    const result = await scanBarcode(barcode.trim());
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
