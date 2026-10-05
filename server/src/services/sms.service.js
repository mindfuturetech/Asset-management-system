const twilio = require("twilio");

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const sendOtpSms = async ({ mobile, otp }) => {
  await client.messages.create({
    body: `Your Asset Management OTP is ${otp}. Valid for ${
      process.env.OTP_EXPIRES_MINUTES || 5
    } minutes. Do not share it.`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: mobile,
  });
};

module.exports = {
  sendOtpSms,
};