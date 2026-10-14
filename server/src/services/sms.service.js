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

const sendHouseholdInvitationSms = async ({
  mobile,
  householdName,
  inviteUrl,
}) => {
  await client.messages.create({
    to: mobile,
    from: process.env.TWILIO_PHONE_NUMBER,

    body:
      `You have been invited to ${householdName}. ` +
      `Accept the invitation: ${inviteUrl}`,
  });
};

module.exports = {
  sendOtpSms,
  sendHouseholdInvitationSms,
};

module.exports = {
  sendOtpSms,
  sendHouseholdInvitationSms,
};