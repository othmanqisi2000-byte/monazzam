require('dotenv').config();

const { checkAndActivateRecurringTasks } = require('../src/jobs/recurringJob');

checkAndActivateRecurringTasks()
  .then(() => {
    console.log('Recurring task run completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Recurring task run failed:', error);
    process.exit(1);
  });
