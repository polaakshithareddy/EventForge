// Email stub service. Logs to console instead of actually sending in development.
// Real implementation would use nodemailer with SMTP config.

export const sendEmail = async ({ to, subject, text, html }) => {
  console.log('--- EMAIL STUB ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Text: ${text}`);
  console.log('------------------');
  return true;
};
