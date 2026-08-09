require('dotenv').config();

const app = require('./app');
const { startReminderJob } = require('./jobs/reminderJob');
const { startRecurringJob } = require('./jobs/recurringJob');

const PORT = process.env.PORT || 5000;
const shouldRunInProcessJobs = !process.env.RENDER;

app.listen(PORT, () => {
  console.log(`Kanban API server running on port ${PORT}`);

  if (shouldRunInProcessJobs) {
    startReminderJob();
    startRecurringJob();
  } else {
    console.log('Skipping in-process cron jobs on Render. Use Render cron services instead.');
  }
});

module.exports = app;
