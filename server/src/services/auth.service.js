const User = require("../models/User");
const Household = require("../models/Household");
const Person = require("../models/Person");
const HouseholdMember = require("../models/HouseholdMember");
const RefreshToken = require("../models/RefreshToken");

const {
  createOtpSession,
  verifyOtp,
} = require("./otp.service");

const {
  generateAccessToken,
  generateRefreshToken,
  hashToken,
} = require("../utils/token.util");

const normalizeEmail = (email) => {
  return email.trim().toLowerCase();
};

const normalizeMobile = (mobile) => {
  return mobile.trim();
};

const validateMobile = (mobile) => {
  return /^\+[1-9]\d{7,14}$/.test(mobile);
};

/*
---------------------------------------------------
REGISTER - REQUEST OTP
---------------------------------------------------
*/
const requestRegisterOtp = async ({
  name,
  email,
  mobile,
}) => {
  if (!name || !email || !mobile) {
    throw new Error(
      "Name, email and mobile are required"
    );
  }

  email = normalizeEmail(email);
  mobile = normalizeMobile(mobile);

  if (!validateMobile(mobile)) {
    throw new Error(
      "Mobile must be in international format. Example: +919876543210"
    );
  }

  const existingUser = await User.findOne({
    $or: [
      { email },
      { mobile },
    ],
  });

  if (existingUser) {
    throw new Error(
      "An account already exists with this email or mobile"
    );
  }

  const otpSession = await createOtpSession({
    name,
    email,
    mobile,
    purpose: "REGISTER",
  });

  return otpSession;
};

/*
---------------------------------------------------
LOGIN - REQUEST OTP
---------------------------------------------------
*/
const requestLoginOtp = async ({
  login,
}) => {
  if (!login) {
    throw new Error(
      "Email or mobile is required"
    );
  }

  login = login.trim();

  const isEmail = login.includes("@");

  const user = await User.findOne(
    isEmail
      ? {
          email:
            normalizeEmail(login),
        }
      : {
          mobile:
            normalizeMobile(login),
        }
  );

  if (!user) {
    throw new Error(
      "Account not found"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new Error(
      "Account is not active"
    );
  }

  const otpSession = await createOtpSession({
    userId: user._id,
    name: user.name,
    email: user.email,
    mobile: user.mobile,
    purpose: "LOGIN",
  });

  return otpSession;
};

/*
---------------------------------------------------
CREATE TOKENS
---------------------------------------------------
*/
const createLoginTokens = async ({
  user,
  householdId,
}) => {
  const accessToken =
    generateAccessToken({
      userId: user._id,
      householdId,
    });

  const refreshToken =
    generateRefreshToken({
      userId: user._id,
    });

  const refreshTokenHash =
    hashToken(refreshToken);

  const expiresAt = new Date();

  expiresAt.setDate(
    expiresAt.getDate() + 30
  );

  await RefreshToken.create({
    userId: user._id,
    tokenHash: refreshTokenHash,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
};

/*
---------------------------------------------------
REGISTER - VERIFY OTP
---------------------------------------------------
*/
const verifyRegisterOtp = async ({
  sessionId,
  otp,
}) => {
  const otpSession =
    await verifyOtp(
      sessionId,
      otp
    );

  if (
    otpSession.purpose !==
    "REGISTER"
  ) {
    throw new Error(
      "Invalid registration OTP"
    );
  }

  const existingUser =
    await User.findOne({
      $or: [
        {
          email:
            otpSession.email,
        },
        {
          mobile:
            otpSession.mobile,
        },
      ],
    });

  if (existingUser) {
    throw new Error(
      "Account already exists"
    );
  }

  /*
  NOTE:
  MongoDB transaction works with
  MongoDB Atlas because Atlas uses
  replica sets.
  */

  const dbSession =
    await User.startSession();

  try {
    let result;

    await dbSession.withTransaction(
      async () => {
        /*
        1. CREATE USER
        */
        const createdUsers =
          await User.create(
            [
              {
                name:
                  otpSession.name,

                email:
                  otpSession.email,

                mobile:
                  otpSession.mobile,

                emailVerified: true,

                mobileVerified: true,

                status: "ACTIVE",
              },
            ],
            {
              session:
                dbSession,
            }
          );

        const user =
          createdUsers[0];

        /*
        2. CREATE HOUSEHOLD
        */
        const createdHouseholds =
          await Household.create(
            [
              {
                name:
                  `${user.name}'s Family`,

                baseCurrency: "INR",

                createdBy:
                  user._id,
              },
            ],
            {
              session:
                dbSession,
            }
          );

        const household =
          createdHouseholds[0];

        /*
        3. CREATE PERSON
        */
        const createdPeople =
          await Person.create(
            [
              {
                householdId:
                  household._id,

                name:
                  user.name,

                relationship:
                  "SELF",

                linkedUserId:
                  user._id,

                status: "ACTIVE",
              },
            ],
            {
              session:
                dbSession,
            }
          );

        const person =
          createdPeople[0];

        /*
        4. CREATE OWNER MEMBERSHIP
        */
        await HouseholdMember.create(
          [
            {
              householdId:
                household._id,

              personId:
                person._id,

              userId:
                user._id,

              role: "OWNER",
            },
          ],
          {
            session:
              dbSession,
          }
        );

        /*
        5. SET DEFAULT HOUSEHOLD
        */
        user.defaultHouseholdId =
          household._id;

        await user.save({
          session:
            dbSession,
        });

        result = {
          user,
          household,
          person,
        };
      }
    );

    /*
    Generate login tokens
    after successful registration.
    */
    const tokens =
      await createLoginTokens({
        user: result.user,
        householdId:
          result.household._id,
      });

    return {
      ...result,
      ...tokens,
    };
  } finally {
    await dbSession.endSession();
  }
};

/*
---------------------------------------------------
LOGIN - VERIFY OTP
---------------------------------------------------
*/
const verifyLoginOtp = async ({
  sessionId,
  otp,
}) => {
  const otpSession =
    await verifyOtp(
      sessionId,
      otp
    );

  if (
    otpSession.purpose !==
    "LOGIN"
  ) {
    throw new Error(
      "Invalid login OTP"
    );
  }

  const user =
    await User.findById(
      otpSession.userId
    );

  if (!user) {
    throw new Error(
      "User not found"
    );
  }

  if (user.status !== "ACTIVE") {
    throw new Error(
      "Account is not active"
    );
  }

  user.lastLoginAt =
    new Date();

  await user.save();

  const tokens =
    await createLoginTokens({
      user,
      householdId:
        user.defaultHouseholdId,
    });

  return {
    user,
    householdId:
      user.defaultHouseholdId,
    ...tokens,
  };
};

/*
---------------------------------------------------
REFRESH TOKEN
---------------------------------------------------
*/
const jwt = require("jsonwebtoken");

const refreshAccessToken =
  async (refreshToken) => {
    if (!refreshToken) {
      throw new Error(
        "Refresh token missing"
      );
    }

    let decoded;

    try {
      decoded =
        jwt.verify(
          refreshToken,
          process.env
            .JWT_REFRESH_SECRET
        );
    } catch (error) {
      throw new Error(
        "Invalid refresh token"
      );
    }

    if (
      decoded.type !==
      "refresh"
    ) {
      throw new Error(
        "Invalid token type"
      );
    }

    const storedToken =
      await RefreshToken.findOne({
        tokenHash:
          hashToken(
            refreshToken
          ),

        userId:
          decoded.sub,

        revokedAt: null,
      });

    if (!storedToken) {
      throw new Error(
        "Refresh token revoked or invalid"
      );
    }

    if (
      storedToken.expiresAt <=
      new Date()
    ) {
      throw new Error(
        "Refresh token expired"
      );
    }

    /*
    Token rotation
    */
    storedToken.revokedAt =
      new Date();

    await storedToken.save();

    const user =
      await User.findById(
        decoded.sub
      );

    if (
      !user ||
      user.status !==
        "ACTIVE"
    ) {
      throw new Error(
        "User is not active"
      );
    }

    const tokens =
      await createLoginTokens({
        user,
        householdId:
          user.defaultHouseholdId,
      });

    return tokens;
  };

/*
---------------------------------------------------
LOGOUT
---------------------------------------------------
*/
const logout =
  async (refreshToken) => {
    if (!refreshToken) {
      return;
    }

    await RefreshToken.findOneAndUpdate(
      {
        tokenHash:
          hashToken(
            refreshToken
          ),
      },
      {
        $set: {
          revokedAt:
            new Date(),
        },
      }
    );
  };

module.exports = {
  requestRegisterOtp,
  requestLoginOtp,
  verifyRegisterOtp,
  verifyLoginOtp,
  refreshAccessToken,
  logout,
};