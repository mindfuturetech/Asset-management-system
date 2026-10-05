const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const householdRoutes = require("./routes/household.routes");
const personRoutes = require("./routes/person.routes");

const {
  errorHandler,
} = require("./middleware/error.middleware");

const app = express();

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get(
  "/api/v1/health",
  (req, res) => {
    res.json({
      success: true,
      message:
        "Asset Management API is running",
    });
  }
);

app.use(
  "/api/v1/auth",
  authRoutes
);

app.use(
  "/api/v1/households",
  householdRoutes
);

app.use(
  "/api/v1/people",
  personRoutes
);

app.use(errorHandler);

module.exports = app;