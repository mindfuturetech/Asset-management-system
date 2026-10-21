const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const authRoutes = require("./routes/auth.routes");
const householdRoutes = require("./routes/household.routes");
const personRoutes = require("./routes/person.routes");
const householdInvitationRoutes = require("./routes/householdInvitation.routes");
const invitationRoutes = require("./routes/invitation.routes");
const preciousMetalRoutes = require("./routes/preciousMetal.routes");
const metalPriceRoutes = require("./routes/metalPrice.routes");
const startMetalPriceJob = require("./jobs/metalPrice.job");

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

app.use(
  "/api/v1/households",
  householdInvitationRoutes
);

app.use(
  "/api/v1/invitations",
  invitationRoutes
);

app.use(
  "/api/v1",
  preciousMetalRoutes
);

app.use(
  "/api/v1",
  metalPriceRoutes
);
// /*
//  * Start daily price scheduler
//  */
// startMetalPriceJob()

// -----------------------------------------------------------------------------
// Mobile deep-link redirect page
// GET /open-app?token=abc  → HTML that redirects to
//                            assetmanager://accept-invitation?token=abc
// -----------------------------------------------------------------------------
app.get("/open-app", (req, res) => {
  const token = (req.query.token || "").toString();
  if (!token) return res.status(400).send("Missing token");

  const scheme = process.env.MOBILE_DEEPLINK_SCHEME || "assetmanager";
  const deepLink = `${scheme}://accept-invitation?token=${token}`;

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Opening Asset Manager…</title>
    <meta http-equiv="refresh" content="0; url=${deepLink}" />
    <style>
      body { font-family: system-ui, sans-serif; padding: 60px 24px;
             text-align: center; background: #F7F9FC; color: #0F172A; }
      h2 { margin-bottom: 8px; }
      p { color: #64748B; }
      a { display: inline-block; margin-top: 20px; background: #2A5CFF;
          color: #fff; text-decoration: none; padding: 14px 22px;
          border-radius: 10px; font-weight: 600; }
    </style>
  </head>
  <body>
    <h2>Opening Asset Manager…</h2>
    <p>If nothing happens, tap below.</p>
    <a href="${deepLink}">Open in the app</a>
    <script>
      setTimeout(function () { window.location.href = "${deepLink}"; }, 50);
    </script>
  </body>
</html>`);
});

// -----------------------------------------------------------------------------
// Web app redirect
// GET /open-web?token=abc  → 302 to <WEB_APP_URL>/accept-invitation?token=abc
// -----------------------------------------------------------------------------
app.get("/open-web", (req, res) => {
  const token = (req.query.token || "").toString();
  if (!token) return res.status(400).send("Missing token");

  const webBase = (process.env.FRONTEND_URL || "http://localhost:5173")
    .replace(/\/+$/, "");
  const webUrl = `${webBase}/accept-invitation?token=${token}`;

  res.redirect(302, webUrl);
});

app.use(errorHandler);

module.exports = app;