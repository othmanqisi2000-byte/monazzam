/**
 * Standalone diagnostic script that sends one test email immediately using
 * Gmail API OAuth2 refresh-token flow.
 * Run with: node test-email.js your-email@example.com
 */
require('dotenv').config();

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GMAIL_SEND_URL = 'https://gmail.googleapis.com/gmail/v1/users/me/messages/send';
const to = process.argv[2];

if (!to) {
  console.error('Usage: node test-email.js <recipient-email>');
  process.exit(1);
}

const {
  GMAIL_CLIENT_ID,
  GMAIL_CLIENT_SECRET,
  GMAIL_REFRESH_TOKEN,
  GMAIL_SENDER_EMAIL,
} = process.env;

console.log('--- Gmail API config loaded from .env ---');
console.log('GMAIL_CLIENT_ID:', GMAIL_CLIENT_ID ? 'set' : '(missing)');
console.log('GMAIL_CLIENT_SECRET:', GMAIL_CLIENT_SECRET ? 'set' : '(missing)');
console.log('GMAIL_REFRESH_TOKEN:', GMAIL_REFRESH_TOKEN ? 'set' : '(missing)');
console.log('GMAIL_SENDER_EMAIL:', GMAIL_SENDER_EMAIL || '(missing)');
console.log('-----------------------------------------');

if (!GMAIL_CLIENT_ID || !GMAIL_CLIENT_SECRET || !GMAIL_REFRESH_TOKEN || !GMAIL_SENDER_EMAIL) {
  console.error('One or more Gmail API variables are missing from .env. Fix that first.');
  process.exit(1);
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
      client_id: GMAIL_CLIENT_ID,
      client_secret: GMAIL_CLIENT_SECRET,
      refresh_token: GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Google OAuth token request failed (${response.status}): ${bodyText}`);
  }

  return JSON.parse(bodyText).access_token;
}

async function main() {
  try {
    const accessToken = await getAccessToken();
    const html = '<p>If you are reading this, Gmail API is configured correctly.</p>';
    const mimeMessage = [
      `From: ${GMAIL_SENDER_EMAIL}`,
      `To: ${to}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset="UTF-8"',
      'Subject: Kanban reminder test email',
      '',
      html,
    ].join('\r\n');

    const response = await fetch(GMAIL_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'User-Agent': 'monazzan-kanban-app-test',
      },
      body: JSON.stringify({
        raw: toBase64Url(mimeMessage),
      }),
    });

    const bodyText = await response.text();
    if (!response.ok) {
      throw new Error(`Gmail API send failed (${response.status}): ${bodyText}`);
    }

    console.log('Email sent successfully. Response:', bodyText);
  } catch (error) {
    console.error('Sending FAILED:');
    console.error(error);
    process.exit(1);
  }
}

main();
