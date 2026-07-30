const nodemailer = require('nodemailer');

let transporter = null;

/**
 * Lazily creates a singleton SMTP transporter from env vars.
 * Returns null (instead of throwing) if SMTP isn't configured, so the app
 * can still run without email reminders configured.
 */
function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465, // true for port 465, false for 587/25
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    // Force IPv4: on some Windows/router setups Node prefers IPv6 for the
    // initial connection, which hangs against Gmail and times out even
    // though a plain IPv4 TCP test succeeds.
    family: 4,
  });

  return transporter;
}

function formatDateTime(date) {
  return date.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Sends a reminder email for a task approaching its due date.
 * @param {object} task - Task record (must include title, description, dueDate, reminderEmail)
 * @param {'30_MIN' | '5_MIN' | 'DUE'} stage - Which reminder threshold triggered this email
 * @param {number} minutesRemaining - Minutes left until the task is due (0 at due time)
 */
async function sendReminderEmail(task, stage, minutesRemaining) {
  const t = getTransporter();
  if (!t) {
    console.warn('SMTP not configured — skipping reminder email for task', task.id);
    return;
  }

  const stageLabel = {
    '30_MIN': '30 minutes',
    '5_MIN': '5 minutes',
    DUE: 'now',
  }[stage];

  const subject =
    stage === 'DUE'
      ? `⏰ "${task.title}" starts now`
      : `⏰ Reminder: "${task.title}" starts in ${stageLabel}`;

  const dueDateLabel = formatDateTime(new Date(task.dueDate));
  const remainingLabel =
    stage === 'DUE' ? 'Starting now' : `${minutesRemaining} minute(s) remaining`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
      <h2 style="color: #4f46e5;">${subject}</h2>
      <p style="color: #334155;">You have a task scheduled to start soon:</p>
      <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Task</td>
          <td style="padding: 8px 0; color: #0f172a; font-weight: bold;">${task.title}</td>
        </tr>
        ${
          task.description
            ? `<tr>
                <td style="padding: 8px 0; color: #64748b; font-size: 13px; vertical-align: top;">Description</td>
                <td style="padding: 8px 0; color: #334155;">${task.description}</td>
              </tr>`
            : ''
        }
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Due at</td>
          <td style="padding: 8px 0; color: #0f172a;">${dueDateLabel}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; color: #64748b; font-size: 13px;">Time remaining</td>
          <td style="padding: 8px 0; color: #dc2626; font-weight: bold;">${remainingLabel}</td>
        </tr>
      </table>
      <p style="color: #94a3b8; font-size: 12px;">This task is still in the "To Do" column.</p>
    </div>
  `;

  await t.sendMail({
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: task.reminderEmail,
    subject,
    html,
  });
}

module.exports = { sendReminderEmail, getTransporter };
