const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendReminderEmail } = require('../lib/mailer');

const THIRTY_MIN_MS = 30 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;
// Small tolerance window so a reminder isn't missed if the cron tick lands
// a few seconds before/after the exact threshold.
const WINDOW_MS = 60 * 1000;

/**
 * Checks all TODO tasks with a due date + reminder email set, and sends the
 * appropriate reminder (30 min before / 5 min before / at due time) exactly
 * once per threshold, tracked via the reminder*Sent flags.
 */
async function checkAndSendReminders() {
  const now = Date.now();

  let candidates;
  try {
    candidates = await prisma.task.findMany({
      where: {
        status: 'TODO',
        dueDate: { not: null },
        reminderEmail: { not: null },
        OR: [{ reminder30Sent: false }, { reminder5Sent: false }, { reminderDueSent: false }],
      },
    });
  } catch (error) {
    console.error('Reminder job: failed to fetch candidate tasks:', error);
    return;
  }

  for (const task of candidates) {
    const dueTime = new Date(task.dueDate).getTime();
    const msRemaining = dueTime - now;

    try {
      if (
        !task.reminder30Sent &&
        Math.abs(msRemaining - THIRTY_MIN_MS) <= WINDOW_MS
      ) {
        await sendReminderEmail(task, '30_MIN', 30);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminder30Sent: true },
        });
        console.log(`Sent 30-min reminder for task ${task.id}`);
      } else if (
        !task.reminder5Sent &&
        Math.abs(msRemaining - FIVE_MIN_MS) <= WINDOW_MS
      ) {
        await sendReminderEmail(task, '5_MIN', 5);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminder5Sent: true },
        });
        console.log(`Sent 5-min reminder for task ${task.id}`);
      } else if (!task.reminderDueSent && Math.abs(msRemaining) <= WINDOW_MS) {
        await sendReminderEmail(task, 'DUE', 0);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminderDueSent: true },
        });
        console.log(`Sent due-time reminder for task ${task.id}`);
      }
    } catch (error) {
      console.error(`Reminder job: failed to process task ${task.id}:`, error);
    }
  }
}

/**
 * Starts the cron schedule. Runs every minute.
 */
function startReminderJob() {
  cron.schedule('* * * * *', () => {
    checkAndSendReminders().catch((err) =>
      console.error('Reminder job: unexpected failure:', err)
    );
  });
  console.log('📧 Reminder job scheduled (runs every minute).');
}

module.exports = { startReminderJob, checkAndSendReminders };
