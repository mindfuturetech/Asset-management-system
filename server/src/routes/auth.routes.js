const express = require("express");
const rateLimit = require("express-rate-limit");
const { protect } = require("../middleware/auth.middleware");

const {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  refresh,
  logout,
  getMe,
} = require("../controllers/auth.controllers");

const router =
  express.Router();

const otpLimiter =
  rateLimit({
    windowMs:
      15 * 60 * 1000,

    max: 20,

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

router.get("/me", protect, getMe);

module.exports = router;