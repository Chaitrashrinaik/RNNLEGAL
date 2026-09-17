const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT, 10) || 587,
      secure: process.env.EMAIL_PORT === '465',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendEmail = async (options) => {
  try {
    const mailOptions = {
      from: `"Case Management System" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html || options.text,
      text: options.text,
      attachments: options.attachments || [],
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`Email sent: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

const sendHearingReminder = async (recipientEmail, recipientName, caseDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1a237e; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Hearing Reminder</h1>
      </div>
      <div style="padding: 20px; background-color: #f5f5f5;">
        <p>Dear ${recipientName},</p>
        <p>This is a reminder about an upcoming hearing:</p>
        <div style="background-color: white; padding: 15px; border-radius: 5px; border-left: 4px solid #1a237e;">
          <p><strong>Case:</strong> ${caseDetails.caseNumber} - ${caseDetails.caseTitle}</p>
          <p><strong>Date:</strong> ${caseDetails.hearingDate}</p>
          <p><strong>Court:</strong> ${caseDetails.courtName || caseDetails.court}</p>
          <p><strong>Judge:</strong> ${caseDetails.judgeName || 'TBD'}</p>
        </div>
        <p style="margin-top: 15px;">Please ensure all necessary documents are prepared.</p>
        <p>Best regards,<br>Case Management System</p>
      </div>
      <div style="background-color: #e0e0e0; padding: 10px; text-align: center; font-size: 12px;">
        <p>This is an automated reminder. Please do not reply to this email.</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: `Hearing Reminder: ${caseDetails.caseNumber} on ${caseDetails.hearingDate}`,
    html,
  });
};

const sendInvoiceEmail = async (recipientEmail, recipientName, invoiceDetails) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #1565c0; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Invoice</h1>
      </div>
      <div style="padding: 20px; background-color: #f5f5f5;">
        <p>Dear ${recipientName},</p>
        <p>Please find the details of your invoice below:</p>
        <div style="background-color: white; padding: 15px; border-radius: 5px;">
          <p><strong>Invoice Number:</strong> ${invoiceDetails.invoiceNumber}</p>
          <p><strong>Amount:</strong> ₹${invoiceDetails.total.toLocaleString('en-IN')}</p>
          <p><strong>Due Date:</strong> ${invoiceDetails.dueDate}</p>
          <p><strong>Status:</strong> ${invoiceDetails.status.toUpperCase()}</p>
        </div>
        <p style="margin-top: 15px;">Please make the payment before the due date.</p>
        <p>Best regards,<br>Case Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: `Invoice ${invoiceDetails.invoiceNumber} - ₹${invoiceDetails.total.toLocaleString('en-IN')}`,
    html,
  });
};

const sendWelcomeEmail = async (recipientEmail, recipientName, tempPassword) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2e7d32; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Welcome to Case Management System</h1>
      </div>
      <div style="padding: 20px; background-color: #f5f5f5;">
        <p>Dear ${recipientName},</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background-color: white; padding: 15px; border-radius: 5px;">
          <p><strong>Email:</strong> ${recipientEmail}</p>
          <p><strong>Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #c62828;"><strong>Important:</strong> Please change your password after first login.</p>
        <p>Best regards,<br>Case Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: 'Welcome to Case Management System - Your Account Details',
    html,
  });
};

const sendPasswordResetEmail = async (recipientEmail, recipientName, resetToken) => {
  const resetUrl = `${process.env.CLIENT_PORTAL_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #c62828; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">Password Reset Request</h1>
      </div>
      <div style="padding: 20px; background-color: #f5f5f5;">
        <p>Dear ${recipientName},</p>
        <p>You have requested a password reset. Click the button below to reset your password:</p>
        <div style="text-align: center; margin: 20px 0;">
          <a href="${resetUrl}" style="background-color: #c62828; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
        </div>
        <p style="color: #666;">This link will expire in 1 hour.</p>
        <p>If you did not request this, please ignore this email.</p>
        <p>Best regards,<br>Case Management System</p>
      </div>
    </div>
  `;

  return sendEmail({
    to: recipientEmail,
    subject: 'Password Reset Request - Case Management System',
    html,
  });
};

module.exports = {
  sendEmail,
  sendHearingReminder,
  sendInvoiceEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
};
