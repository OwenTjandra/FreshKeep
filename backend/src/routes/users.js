import express from 'express';
import { devUser } from '../middleware/devUser.js';
import { getMe, updateMe } from '../services/users.js';

const router = express.Router();
router.use(devUser);

router.get('/me', async (req, res, next) => {
  try {
    const me = await getMe(req.user);
    res.json(me);
  } catch (err) {
    next(err);
  }
});

router.patch('/me', async (req, res, next) => {
  try {
    const me = await updateMe(req.user, req.body || {});
    res.json(me);
  } catch (err) {
    next(err);
  }
});

export default router;
