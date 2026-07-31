const nodemailer = require('nodemailer');
const env = require('../config/env.config');

let cachedTransporter = null;

/**
 * Lazily builds (and caches) the nodemailer transporter.
 * If SMTP credentials are not configured, falls back to nodemailer's
 * JSON transport so the app still runs end-to-end in local development —
 * emails are logged to the console instead of actually being sent.
 */
const getTransporter = () => {
  if (cachedTransporter) return cachedTransporter;

  if (env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS) {
    cachedTransporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
    });
  } else {
    // Dev fallback: no real SMTP configured — capture the message as JSON instead.
    cachedTransporter = nodemailer.createTransport({ jsonTransport: true });
  }

  return cachedTransporter;
};

/**
 * Sends an email. In development without SMTP configured, logs the message
 * content to the console instead of delivering it, so OTP/reset flows remain
 * fully testable without a real mail provider.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
const sendEmail = async ({ to, subject, html, text }) => {
  const transporter = getTransporter();

  const info = await transporter.sendMail({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
    text: text || html.replace(/<[^>]+>/g, ' '),
  });

  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    // eslint-disable-next-line no-console
    console.log(`\n[DEV EMAIL] To: ${to} | Subject: ${subject}\n${info.message}\n`);
  }

  return info;
};

module.exports = { sendEmail };
