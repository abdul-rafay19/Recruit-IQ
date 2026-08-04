// RecruitIQ — Gmail SMTP sender (replaces Resend)
// Requires: 2-Step Verification enabled on the Google Account, then an
// App Password generated at myaccount.google.com/apppasswords.
import nodemailer from 'nodemailer';

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.YOUR_EMAIL,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });
  }
  return transporter;
}

export async function sendEmail({ to, subject, html, text, attachments }) {
  const info = await getTransporter().sendMail({
    from: `"${process.env.YOUR_NAME}" <${process.env.YOUR_EMAIL}>`,
    to,
    subject,
    html,
    text,
    ...(attachments ? { attachments: attachments.map(a => ({ filename: a.filename, path: a.path })) } : {})
  });
  // Keep the same { id } shape the rest of the pipeline expects.
  return { id: info.messageId };
}
