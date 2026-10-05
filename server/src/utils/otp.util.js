const crypto = require("crypto");

const generateOtp = () => {
  return crypto.randomInt(100000, 1000000).toString();
};

const hashOtp = (otp) => {
  return crypto
    .createHmac("sha256", process.env.OTP_HASH_SECRET)
    .update(otp)
    .digest("hex");
};

const verifyOtpHash = (otp, storedHash) => {
  const incomingHash = hashOtp(otp);

  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  if (incomingBuffer.length !== storedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(incomingBuffer, storedBuffer);
};

module.exports = {
  generateOtp,
  hashOtp,
  verifyOtpHash,
};