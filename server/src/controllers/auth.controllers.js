const authService = require("../services/auth.service");

const cookieOptions = {
  httpOnly: true,

  secure:
    process.env.COOKIE_SECURE ===
    "true",

  sameSite:
    process.env.COOKIE_SAMESITE ||
    "lax",

  path: "/api/v1/auth",
};

/*
---------------------------------------------------
REGISTER - REQUEST OTP
---------------------------------------------------
*/
const registerRequestOtp =
  async (req, res, next) => {
    try {
      const {
        name,
        email,
        mobile,
      } = req.body;

      const result =
        await authService.requestRegisterOtp(
          {
            name,
            email,
            mobile,
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Registration OTP sent to email and mobile",

        data: {
          sessionId:
            result.sessionId,

          expiresAt:
            result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
---------------------------------------------------
REGISTER - VERIFY OTP
---------------------------------------------------
*/
const registerVerifyOtp =
  async (req, res, next) => {
    try {
      const {
        sessionId,
        otp,
      } = req.body;

      if (
        !sessionId ||
        !otp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "sessionId and OTP are required",
        });
      }

      const result =
        await authService.verifyRegisterOtp(
          {
            sessionId,
            otp,
          }
        );

      /*
      Store refresh token in
      HTTP-only cookie
      */
      res.cookie(
        "refreshToken",
        result.refreshToken,
        cookieOptions
      );

      return res.status(201).json({
        success: true,

        message:
          "Registration successful",

        data: {
          user: result.user,

          household:
            result.household,

          person:
            result.person,

          accessToken:
            result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
---------------------------------------------------
LOGIN - REQUEST OTP
---------------------------------------------------
*/
const loginRequestOtp =
  async (req, res, next) => {
    try {
      const {
        login,
      } = req.body;

      const result =
        await authService.requestLoginOtp(
          {
            login,
          }
        );

      return res.status(200).json({
        success: true,

        message:
          "Login OTP sent to email and mobile",

        data: {
          sessionId:
            result.sessionId,

          expiresAt:
            result.expiresAt,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
---------------------------------------------------
LOGIN - VERIFY OTP
---------------------------------------------------
*/
const loginVerifyOtp =
  async (req, res, next) => {
    try {
      const {
        sessionId,
        otp,
      } = req.body;

      if (
        !sessionId ||
        !otp
      ) {
        return res.status(400).json({
          success: false,
          message:
            "sessionId and OTP are required",
        });
      }

      const result =
        await authService.verifyLoginOtp(
          {
            sessionId,
            otp,
          }
        );

      res.cookie(
        "refreshToken",
        result.refreshToken,
        cookieOptions
      );

      return res.status(200).json({
        success: true,

        message:
          "Login successful",

        data: {
          user: result.user,

          householdId:
            result.householdId,

          accessToken:
            result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  };

/*
---------------------------------------------------
REFRESH
---------------------------------------------------
*/
const refresh =
  async (req, res, next) => {
    try {
      const refreshToken =
        req.cookies.refreshToken;

      const result =
        await authService.refreshAccessToken(
          refreshToken
        );

      res.cookie(
        "refreshToken",
        result.refreshToken,
        cookieOptions
      );

      return res.status(200).json({
        success: true,

        accessToken:
          result.accessToken,
      });
    } catch (error) {
      next(error);
    }
  };

/*
---------------------------------------------------
LOGOUT
---------------------------------------------------
*/
const logout =
  async (req, res, next) => {
    try {
      const refreshToken =
        req.cookies.refreshToken;

      await authService.logout(
        refreshToken
      );

      res.clearCookie(
        "refreshToken",
        cookieOptions
      );

      return res.status(200).json({
        success: true,
        message:
          "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  };
  

module.exports = {
  registerRequestOtp,
  registerVerifyOtp,
  loginRequestOtp,
  loginVerifyOtp,
  refresh,
  logout,
};