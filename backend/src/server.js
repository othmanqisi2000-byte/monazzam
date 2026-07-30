require('dotenv').config();

const express = require('express');
const cors = require('cors');
const taskRoutes = require('./routes/taskRoutes');
const prisma = require('./lib/prisma');
const { startReminderJob } = require('./jobs/reminderJob');
const { startRecurringJob } = require('./jobs/recurringJob');

const app = express();

const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'https://monazzam-bmur.vercel.app'
];

app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  })
);

// --- Middleware ---
app.use(
  cors({
    origin: CLIENT_ORIGIN,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  })
);

app.use(express.json());

// --- Request logging ---
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

// --- Routes ---
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.use('/api/tasks', taskRoutes);

// --- 404 handler ---
app.use((req, res) => {
  res.status(404).json({
    error: `Route ${req.originalUrl} not found.`,
  });
});

// --- Centralized error handler ---
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error.',
  });
});

// --- Start Server (Render / Production / Local) ---
app.listen(PORT, () => {
  console.log(`🚀 Kanban API server running on port ${PORT}`);

  startReminderJob();
  startRecurringJob();
});

// Export app (if needed)
module.exports = app;