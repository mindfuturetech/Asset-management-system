const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const generateAccessToken = ({ userId, householdId }) => {
  return jwt.sign(
    {
      sub: userId.toString(),
      householdId: householdId?.toString() || null,
      type: "access",
    },
    process.env.JWT_ACCESS_SECRET,
    {
      expiresIn: process.env.ACCESS_TOKEN_EXPIRES || "15m",
    }
  );
};

const generateRefreshToken = ({ userId }) => {
  return jwt.sign(
    {
      sub: userId.toString(),
      type: "refresh",
    },
    process.env.JWT_REFRESH_SECRET,
    {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRES || "30d",
      jwtid: crypto.randomUUID(),
    }
  );
};

const hashToken = (token) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
};