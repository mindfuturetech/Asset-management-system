const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async ({ email, otp, name }) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Your Asset Management OTP",
    text: `Hello ${name || "User"}, your OTP is ${otp}. It is valid for ${
      process.env.OTP_EXPIRES_MINUTES || 5
    } minutes. Do not share this OTP with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Asset Management</h2>
        <p>Hello ${name || "User"},</p>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for ${
          process.env.OTP_EXPIRES_MINUTES || 5
        } minutes.</p>
        <p>Do not share this OTP with anyone.</p>
      </div>
    `,
  });
};

module.exports = {
  sendOtpEmail,
};