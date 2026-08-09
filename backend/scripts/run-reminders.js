require('dotenv').config();

const { checkAndSendReminders } = require('../src/jobs/reminderJob');

checkAndSendReminders()
  .then(() => {
    console.log('Reminder run completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Reminder run failed:', error);
    process.exit(1);
  });
