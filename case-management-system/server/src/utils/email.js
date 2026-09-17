const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const emailUser = process.env.EMAIL_USER;
  const emailPass = process.env.EMAIL_PASS;

  if (!emailUser || !emailPass) {
    console.warn('[EMAIL] EMAIL_USER and EMAIL_PASS not set. Emails will be logged to console only.');
    return null;
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: emailUser, pass: emailPass },
  });

  return transporter;
}

async function sendMail({ to, subject, html }) {
  const transport = getTransporter();

  if (!transport) {
    console.log(`\n========== EMAIL LOG ==========`);
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Body: ${html.replace(/<[^>]*>/g, '')}`);
    console.log(`===============================\n`);
    return { success: true, simulated: true };
  }

  try {
    await transport.sendMail({
      from: `"CaseBench" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log(`[EMAIL] Sent to ${to}: ${subject}`);
    return { success: true };
  } catch (error) {
    console.error(`[EMAIL] Failed to send to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function sendOtpEmail(to, name, otp) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #c9a96e;">CaseBench</h2>
        <p style="color: #666;">Legal Case Management System</p>
      </div>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; text-align: center;">
        <h3 style="color: #333;">Password Reset OTP</h3>
        <p style="color: #666; margin-bottom: 20px;">Hello ${name},</p>
        <p style="color: #666;">Your OTP for password reset is:</p>
        <div style="font-size: 36px; font-weight: bold; color: #c9a96e; letter-spacing: 8px; margin: 20px 0;">${otp}</div>
        <p style="color: #999; font-size: 13px;">This OTP is valid for 15 minutes.</p>
        <p style="color: #999; font-size: 13px;">If you did not request this, please ignore this email.</p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        <p>CaseBench - Legal Case Management System</p>
      </div>
    </div>
  `;
  return sendMail({ to, subject: 'CaseBench - Password Reset OTP', html });
}

async function sendPasswordResetSuccess(to, name) {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #c9a96e;">CaseBench</h2>
      </div>
      <div style="background: #f9f9f9; border-radius: 8px; padding: 30px; text-align: center;">
        <h3 style="color: #4caf50;">Password Reset Successful</h3>
        <p style="color: #666;">Hello ${name},</p>
        <p style="color: #666;">Your password has been successfully reset.</p>
        <p style="color: #666;">You can now login with your new password.</p>
      </div>
    </div>
  `;
  return sendMail({ to, subject: 'CaseBench - Password Reset Successful', html });
}

module.exports = { sendMail, sendOtpEmail, sendPasswordResetSuccess };
