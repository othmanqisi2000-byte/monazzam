/**
 * Standalone diagnostic script — sends one test email immediately using
 * the same SMTP config as the app, bypassing the cron schedule entirely.
 * Run with: node test-email.js your-email@example.com
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

const to = process.argv[2];

if (!to) {
  console.error('Usage: node test-email.js <recipient-email>');
  process.exit(1);
}

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = process.env;

console.log('--- SMTP config loaded from .env ---');
console.log('SMTP_HOST:', SMTP_HOST || '(missing)');
console.log('SMTP_PORT:', SMTP_PORT || '(missing)');
console.log('SMTP_USER:', SMTP_USER || '(missing)');
console.log('SMTP_PASS:', SMTP_PASS ? `set (${SMTP_PASS.length} characters)` : '(missing)');
console.log('SMTP_FROM:', SMTP_FROM || '(missing, will fall back to SMTP_USER)');
console.log('-------------------------------------');

if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
  console.error('❌ One or more SMTP_* variables are missing from .env. Fix that first.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: Number(SMTP_PORT),
  secure: Number(SMTP_PORT) === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

async function main() {
  console.log('Verifying SMTP connection...');
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully.');
  } catch (err) {
    console.error('❌ SMTP verification FAILED:');
    console.error(err);
    process.exit(1);
  }

  console.log(`Sending test email to ${to}...`);
  try {
    const info = await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject: 'Kanban reminder test email',
      html: '<p>If you are reading this, SMTP is configured correctly. 🎉</p>',
    });
    console.log('✅ Email sent successfully. Message ID:', info.messageId);
  } catch (err) {
    console.error('❌ Sending FAILED:');
    console.error(err);
    process.exit(1);
  }
}

main();
