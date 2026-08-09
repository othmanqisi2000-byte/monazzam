require('dotenv').config();

const app = require('./app');
const { startReminderJob } = require('./jobs/reminderJob');
const { startRecurringJob } = require('./jobs/recurringJob');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Kanban API server running on port ${PORT}`);

  startReminderJob();
  startRecurringJob();
});

module.exports = app;
