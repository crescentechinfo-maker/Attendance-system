const nodemailer = require('nodemailer');

const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('Email not configured — skipping email send');
    return;
  }

  const transporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || `Attendance System <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email send error:', error);
    // Don't throw — email failures shouldn't break the main flow
  }
};

const emailTemplates = {
  leaveApproved: (employeeName, leaveType, startDate, endDate) => ({
    subject: 'Leave Request Approved',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10b981;">Leave Request Approved ✓</h2>
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>Your leave request has been <strong style="color: #10b981;">approved</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>From:</strong> ${startDate}</p>
          <p><strong>To:</strong> ${endDate}</p>
        </div>
        <p>Please ensure your work is properly handed over before your leave.</p>
        <p>Best regards,<br>HR Department</p>
      </div>
    `,
  }),

  leaveRejected: (employeeName, leaveType, startDate, endDate, reason) => ({
    subject: 'Leave Request Rejected',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ef4444;">Leave Request Rejected</h2>
        <p>Dear <strong>${employeeName}</strong>,</p>
        <p>Your leave request has been <strong style="color: #ef4444;">rejected</strong>.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>From:</strong> ${startDate}</p>
          <p><strong>To:</strong> ${endDate}</p>
          ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        <p>Please contact HR for more information.</p>
        <p>Best regards,<br>HR Department</p>
      </div>
    `,
  }),

  leaveApplication: (adminName, employeeName, leaveType, startDate, endDate, reason) => ({
    subject: `New Leave Request from ${employeeName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">New Leave Request</h2>
        <p>Dear <strong>${adminName}</strong>,</p>
        <p><strong>${employeeName}</strong> has submitted a leave request that requires your approval.</p>
        <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
          <p><strong>Employee:</strong> ${employeeName}</p>
          <p><strong>Leave Type:</strong> ${leaveType}</p>
          <p><strong>From:</strong> ${startDate}</p>
          <p><strong>To:</strong> ${endDate}</p>
          <p><strong>Reason:</strong> ${reason}</p>
        </div>
        <p>Please login to the system to approve or reject this request.</p>
        <p>Best regards,<br>Attendance System</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
