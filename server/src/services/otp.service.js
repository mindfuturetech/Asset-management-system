const OtpSession = require("../models/OtpSession");
const {
  generateOtp,
  hashOtp,
  verifyOtpHash,
} = require("../utils/otp.util");

const { sendOtpEmail } = require("./email.service");
const { sendOtpSms } = require("./sms.service");

const createOtpSession = async ({
  userId = null,
  name = "",
  email,
  mobile,
  purpose,
}) => {
  // Invalidate previous OTPs for this user/contact
  await OtpSession.updateMany(
    {
      purpose,
      consumedAt: null,
      $or: [
        ...(userId ? [{ userId }] : []),
        { email },
        { mobile },
      ],
    },
    {
      $set: {
        consumedAt: new Date(),
      },
    }
  );

  const otp = generateOtp();

  const expiresAt = new Date(
    Date.now() +
      Number(process.env.OTP_EXPIRES_MINUTES || 5) * 60 * 1000
  );

  const session = await OtpSession.create({
    userId,
    name,
    email,
    mobile,
    otpHash: hashOtp(otp),
    purpose,
    expiresAt,
    maxAttempts: Number(
      process.env.OTP_MAX_ATTEMPTS || 5
    ),
  });

  try {
    await Promise.all([
      sendOtpEmail({
        email,
        otp,
        name,
      }),

    //   sendOtpSms({
    //     mobile,
    //     otp,
    //   }),
    ]);
  } catch (error) {
    await OtpSession.findByIdAndUpdate(session._id, {
      consumedAt: new Date(),
    });

    throw new Error(
      `OTP delivery failed: ${error.message}`
    );
  }

  return {
    sessionId: session._id.toString(),
    expiresAt,
  };
};

const verifyOtp = async (sessionId, otp) => {
  const session = await OtpSession.findById(sessionId);

  if (!session) {
    throw new Error("OTP session not found");
  }

  if (session.consumedAt) {
    throw new Error("OTP already used");
  }

  if (session.expiresAt <= new Date()) {
    throw new Error("OTP expired");
  }

  if (session.attempts >= session.maxAttempts) {
    throw new Error("Maximum OTP attempts exceeded");
  }

  session.attempts += 1;

  const valid = verifyOtpHash(
    otp,
    session.otpHash
  );

  if (!valid) {
    await session.save();
    throw new Error("Invalid OTP");
  }

  session.consumedAt = new Date();

  await session.save();

  return session;
};

module.exports = {
  createOtpSession,
  verifyOtp,
};