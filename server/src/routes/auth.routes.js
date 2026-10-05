const express = require("express");
const rateLimit = require("express-rate-limit");

const {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  refresh,
  logout,
} = require("../controllers/auth.controllers");

const router =
  express.Router();

const otpLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 10,

    message: {
      success: false,

      message:
        "Too many OTP requests. Please try again later.",
    },
  });

/*
===================================================
REGISTER
===================================================
*/

router.post(
  "/register/request-otp",
  otpLimiter,
  registerRequestOtp
);

router.post(
  "/register/verify-otp",
  otpLimiter,
  registerVerifyOtp
);

/*
===================================================
LOGIN
===================================================
*/

router.post(
  "/login/request-otp",
  otpLimiter,
  loginRequestOtp
);

router.post(
  "/login/verify-otp",
  otpLimiter,
  loginVerifyOtp
);

/*
===================================================
TOKEN
===================================================
*/

router.post(
  "/refresh",
  refresh
);

router.post(
  "/logout",
  logout
);

module.exports = router;