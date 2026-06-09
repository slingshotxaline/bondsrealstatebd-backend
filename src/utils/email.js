const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD,
    },
  });

const sendEmail = async ({ to, subject, html }) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: `"${process.env.FROM_NAME}" <${process.env.FROM_EMAIL}>`,
    to,
    subject,
    html,
  });
};

// Templates
const emailTemplates = {
  propertyApproved: (ownerName, propertyTitle) => ({
    subject: 'Your Property has been Approved – BONDS Real Estate',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px">
        <h2 style="color:#004835">BONDS Real Estate</h2>
        <p>Dear <strong>${ownerName}</strong>,</p>
        <p>Great news! Your property listing <strong>"${propertyTitle}"</strong> has been <span style="color:#16a34a">approved</span> and is now live.</p>
        <p>Thank you for choosing BONDS Real Estate.</p>
      </div>
    `,
  }),

  propertyRejected: (ownerName, propertyTitle, reason) => ({
    subject: 'Property Listing Update – BONDS Real Estate',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px">
        <h2 style="color:#004835">BONDS Real Estate</h2>
        <p>Dear <strong>${ownerName}</strong>,</p>
        <p>Unfortunately, your property listing <strong>"${propertyTitle}"</strong> has been <span style="color:#dc2626">rejected</span>.</p>
        <p><strong>Reason:</strong> ${reason || 'Does not meet our listing guidelines.'}</p>
        <p>Please review and resubmit. Contact us if you have any questions.</p>
      </div>
    `,
  }),

  welcomeUser: (name) => ({
    subject: 'Welcome to BONDS Real Estate',
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:auto;padding:24px;border:1px solid #e5e5e5;border-radius:8px">
        <h2 style="color:#004835">Welcome, ${name}!</h2>
        <p>Your account has been created successfully at BONDS Real Estate.</p>
        <p>You can now browse properties, submit listings, and more.</p>
      </div>
    `,
  }),
};

module.exports = { sendEmail, emailTemplates };
