import express from 'express';
import { devUser } from '../middleware/devUser.js';
import { listImports, confirmImport, rejectImport } from '../services/storeImports.js';

const router = express.Router();
router.use(devUser);

router.get('/', async (req, res, next) => {
  try {
    const status = req.query.status ? String(req.query.status) : undefined;
    res.json({ imports: await listImports(req.user, { status }) });
  } catch (err) { next(err); }
});

router.post('/:id/confirm', async (req, res, next) => {
  try {
    const result = await confirmImport(req.user, req.params.id, req.body || {});
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/:id/reject', async (req, res, next) => {
  try {
    await rejectImport(req.user, req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

export default router;
