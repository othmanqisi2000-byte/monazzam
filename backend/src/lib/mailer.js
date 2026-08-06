const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';

function isEmailProviderConfigured() {
  return Boolean(
    process.env.GMAIL_CLIENT_ID &&
      process.env.GMAIL_CLIENT_SECRET &&
      process.env.GMAIL_REFRESH_TOKEN &&
      process.env.GMAIL_SENDER_EMAIL
  );
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

function toBase64Url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function getAccessToken() {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Google OAuth token request failed (${response.status}): ${bodyText}`);
  }

  const body = JSON.parse(bodyText);
  if (!body.access_token) {
    throw new Error('Google OAuth token response did not include an access token.');
  }

  return body.access_token;
}

function buildMimeMessage({ from, to, subject, html }) {
  return [
    `From: ${from}`,
    `To: ${to}`,
    'MIME-Version: 1.0',
    'Content-Type: text/html; charset="UTF-8"',
    `Subject: ${subject}`,
    '',
    html,
  ].join('\r\n');
}

/**
 * Sends a reminder email using Gmail API with OAuth2 refresh token flow.
 * Assumption: the sender granted offline access and supplied a refresh token.
 */
async function sendReminderEmail(task, stage, minutesRemaining, recipientEmail) {
  if (!isEmailProviderConfigured()) {
    console.warn('Gmail API not configured - skipping reminder email for task', task.id);
    return;
  }

  if (!recipientEmail) {
    console.warn('No recipient email resolved - skipping reminder email for task', task.id);
    return;
  }

  const stageLabel = {
    '30_MIN': '30 minutes',
    '5_MIN': '5 minutes',
    DUE: 'now',
  }[stage];

  const subject =
    stage === 'DUE'
      ? `"${task.title}" starts now`
      : `Reminder: "${task.title}" starts in ${stageLabel}`;

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

  const accessToken = await getAccessToken();
  const mimeMessage = buildMimeMessage({
    from: process.env.GMAIL_SENDER_EMAIL,
    to: recipientEmail,
    subject,
    html,
  });

  const response = await fetch(GMAIL_SEND_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'User-Agent': 'monazzan-kanban-app',
    },
    body: JSON.stringify({
      raw: toBase64Url(mimeMessage),
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Gmail API send failed (${response.status}): ${bodyText}`);
  }

  return JSON.parse(bodyText);
}

module.exports = { sendReminderEmail, isEmailProviderConfigured };
