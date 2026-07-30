const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { todayCode, todayDateStr } = require('../lib/recurrence');

/**
 * Finds recurring tasks whose configured days include today, and that
 * haven't already been reactivated today (tracked via lastRecurredOn), then:
 *   - moves them back to TODO
 *   - sets today's dueDate (today's date + recurringTime)
 *   - re-arms the 30-min/5-min/due email reminders
 *
 * Runs every 5 minutes so a server restart or brief downtime around
 * midnight still catches the day's occurrence.
 */
async function checkAndActivateRecurringTasks() {
  const today = todayCode();
  const todayStr = todayDateStr();

  let candidates;
  try {
    candidates = await prisma.task.findMany({
      where: {
        isRecurring: true,
        recurringDays: { has: today },
        lastRecurredOn: { not: todayStr },
      },
    });
  } catch (error) {
    console.error('Recurring job: failed to fetch candidate tasks:', error);
    return;
  }

  for (const task of candidates) {
    try {
      const timeStr = task.recurringTime || '00:00';
      const dueDate = new Date(`${todayStr}T${timeStr}:00`);

      await prisma.task.update({
        where: { id: task.id },
        data: {
          status: 'TODO',
          dueDate,
          lastRecurredOn: todayStr,
          reminder30Sent: false,
          reminder5Sent: false,
          reminderDueSent: false,
        },
      });
      console.log(`Reactivated recurring task ${task.id} for ${todayStr}`);
    } catch (error) {
      console.error(`Recurring job: failed to reactivate task ${task.id}:`, error);
    }
  }
}

function startRecurringJob() {
  cron.schedule('*/5 * * * *', () => {
    checkAndActivateRecurringTasks().catch((err) =>
      console.error('Recurring job: unexpected failure:', err)
    );
  });
  console.log('🔁 Recurring task job scheduled (runs every 5 minutes).');
}

module.exports = { startRecurringJob, checkAndActivateRecurringTasks };
