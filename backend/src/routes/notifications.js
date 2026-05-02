import express from 'express';
import { devUser } from '../middleware/devUser.js';
import { registerToken, sendDailyPushForUser } from '../services/notifications.js';

const router = express.Router();
router.use(devUser);

// POST /api/notifications/register-token { token, device_label? }
// The frontend calls this after expo-notifications returns a device token.
router.post('/register-token', async (req, res, next) => {
  try {
    const { token, device_label } = req.body || {};
    await registerToken(req.user, token, device_label);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/notifications/test
// Dev endpoint: trigger a push for the current user *now*, ignoring the
// 9am window and last_notified_at gate. Useful for verifying templating
// and FCM wiring end-to-end.
router.post('/test', async (req, res, next) => {
  try {
    const result = await sendDailyPushForUser(req.user, { dryRun: true });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
