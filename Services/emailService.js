const nodemailer = require('nodemailer');

async function createTransporter() {
  const { EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS } = process.env;
  if (EMAIL_HOST && EMAIL_PORT && EMAIL_USER && EMAIL_PASS) {
    return nodemailer.createTransport({
      host: EMAIL_HOST,
      port: Number(EMAIL_PORT),
      secure: Number(EMAIL_PORT) === 465,
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS
      }
    });
  }

  // fallback logger (dev)
  return {
    sendMail: async (opts) => {
      console.log('--- Email not sent (no SMTP configured) ---');
      console.log('To:', opts.to);
      console.log('Subject:', opts.subject);
      console.log('HTML:', opts.html);
      return Promise.resolve();
    }
  };
}

async function sendVerificationEmail(toEmail, token, { backendUrl, frontendUrl, firstName } = {}) {
  const transporter = await createTransporter();
  const backendBase = (backendUrl || process.env.BACKEND_URL || 'http://localhost:5000').replace(/\/$/, '');
  
  const verifyUrl = `${backendBase}/api/auth/verify?token=${encodeURIComponent(token)}`;

  const html = `
    <p>Hi ${firstName || 'there'},</p>
    <p>Thanks for creating an account. Please verify your email by clicking the link below:</p>
    <p><a href="${verifyUrl}">Verify your email</a></p>
    <p>If the link doesn't work, copy and paste this into your browser:</p>
    <pre>${verifyUrl}</pre>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't request this, please ignore this email.</p>
  `;

  return transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com',
    to: toEmail,
    subject: 'Verify your email',
    html
  });
}

module.exports = { sendVerificationEmail };
