import express from 'express';
import { devUser } from '../middleware/devUser.js';
import {
  listStores,
  connectStore,
  disconnectStore,
  syncConnection,
} from '../services/storeImports.js';

const router = express.Router();
router.use(devUser);

router.get('/', async (req, res, next) => {
  try {
    res.json({ stores: await listStores(req.user) });
  } catch (err) { next(err); }
});

router.post('/connections', async (req, res, next) => {
  try {
    const conn = await connectStore(req.user, req.body || {});
    res.status(201).json(conn);
  } catch (err) { next(err); }
});

router.delete('/connections/:id', async (req, res, next) => {
  try {
    await disconnectStore(req.user, req.params.id);
    res.status(204).end();
  } catch (err) { next(err); }
});

router.post('/connections/:id/sync', async (req, res, next) => {
  try {
    const result = await syncConnection(req.user, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

export default router;
