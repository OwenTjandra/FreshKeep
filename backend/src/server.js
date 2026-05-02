import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import scanRouter from './routes/scan.js';
import itemsRouter from './routes/items.js';
import usersRouter from './routes/users.js';
import recipesRouter from './routes/recipes.js';
import notificationsRouter from './routes/notifications.js';
import { startNotificationScheduler } from './services/notificationScheduler.js';

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'freshkeep-api', version: '0.1.0' });
});

app.use('/api/scan', scanRouter);
app.use('/api/items', itemsRouter);
app.use('/api/users', usersRouter);
app.use('/api/recipes', recipesRouter);
app.use('/api/notifications', notificationsRouter);

// Centralized error handler — services throw, routes call next(err), this responds.
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.code || 'internal_error',
    message: err.message || 'Something went wrong',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`FreshKeep API listening on :${PORT}`);
  startNotificationScheduler();
});
