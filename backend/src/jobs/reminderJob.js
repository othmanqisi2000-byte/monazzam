const cron = require('node-cron');
const prisma = require('../lib/prisma');
const { sendReminderEmail } = require('../lib/mailer');

const THIRTY_MIN_MS = 30 * 60 * 1000;
const FIVE_MIN_MS = 5 * 60 * 1000;
const WINDOW_MS = 60 * 1000;

/**
 * Checks all TODO tasks with a due date, then resolves the destination email
 * dynamically: user reminder email first, otherwise the account email.
 */
async function checkAndSendReminders() {
  const now = Date.now();

  let candidates;
  try {
    candidates = await prisma.task.findMany({
      where: {
        status: 'TODO',
        dueDate: { not: null },
        userId: { not: null },
        OR: [{ reminder30Sent: false }, { reminder5Sent: false }, { reminderDueSent: false }],
      },
      include: {
        user: {
          select: {
            email: true,
            reminderEmail: true,
          },
        },
      },
    });
  } catch (error) {
    console.error('Reminder job: failed to fetch candidate tasks:', error);
    return;
  }

  for (const task of candidates) {
    const dueTime = new Date(task.dueDate).getTime();
    const msRemaining = dueTime - now;
    const recipientEmail = task.user?.reminderEmail || task.user?.email || task.reminderEmail || null;

    try {
      if (!task.reminder30Sent && Math.abs(msRemaining - THIRTY_MIN_MS) <= WINDOW_MS) {
        await sendReminderEmail(task, '30_MIN', 30, recipientEmail);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminder30Sent: true },
        });
        console.log(`Sent 30-min reminder for task ${task.id}`);
      } else if (!task.reminder5Sent && Math.abs(msRemaining - FIVE_MIN_MS) <= WINDOW_MS) {
        await sendReminderEmail(task, '5_MIN', 5, recipientEmail);
        await prisma.task.update({
          where: { id: task.id },
          data: { reminder5Sent: true },
        });
        console.log(`Sent 5-min reminder for task ${task.id}`);
      } else if (!task.reminderDueSent && Math.abs(msRemaining) <= WINDOW_MS) {
        await sendReminderEmail(task, 'DUE', 0, recipientEmail);
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

function startReminderJob() {
  cron.schedule('* * * * *', () => {
    checkAndSendReminders().catch((err) =>
      console.error('Reminder job: unexpected failure:', err)
    );
  });
  console.log('Reminder job scheduled (runs every minute).');
}

module.exports = { startReminderJob, checkAndSendReminders };
