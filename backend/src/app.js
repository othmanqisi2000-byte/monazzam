require('dotenv').config();

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const workspaceRoutes = require('./routes/workspaceRoutes');
const {
  checkAndActivateRecurringTasks,
} = require('./jobs/recurringJob');
const { checkAndSendReminders } = require('./jobs/reminderJob');

const app = express();

const allowedOrigins = Array.from(
  new Set(
    [
      'http://localhost:5173',
      'https://monazzam-bmur.vercel.app',
      process.env.CLIENT_ORIGIN,
    ].filter(Boolean)
  )
);

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  })
);

app.use(express.json());

app.use((req, res, next) => {
  const start = Date.now();

  res.on('finish', () => {
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} - ${
        Date.now() - start
      }ms`
    );
  });

  next();
});

function isAuthorizedCronRequest(req) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }

  return req.headers.authorization === `Bearer ${cronSecret}`;
}

async function runCronJob(res, label, job) {
  try {
    await job();
    return res.status(200).json({
      ok: true,
      job: label,
    });
  } catch (error) {
    console.error(`${label} cron failed:`, error);
    return res.status(500).json({
      ok: false,
      error: `${label} cron failed.`,
    });
  }
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/api/internal/cron/reminders', async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized cron request.' });
  }

  return runCronJob(res, 'reminders', checkAndSendReminders);
});

app.get('/api/internal/cron/recurring', async (req, res) => {
  if (!isAuthorizedCronRequest(req)) {
    return res.status(401).json({ error: 'Unauthorized cron request.' });
  }

  return runCronJob(res, 'recurring', checkAndActivateRecurringTasks);
});

app.use('/api/auth', authRoutes);
app.use('/api/workspaces', workspaceRoutes);
app.use('/api/tasks', taskRoutes);

app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found.`,
  });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

module.exports = app;
