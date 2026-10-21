const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendOtpEmail = async ({ email, otp, name }) => {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: "Your Asset Management OTP",
    text: `Hello ${name || "User"}, your OTP is ${otp}. It is valid for ${
      process.env.OTP_EXPIRES_MINUTES || 5
    } minutes. Do not share this OTP with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif;">
        <h2>Asset Management</h2>
        <p>Hello ${name || "User"},</p>
        <p>Your OTP is:</p>
        <h1>${otp}</h1>
        <p>This OTP is valid for ${
          process.env.OTP_EXPIRES_MINUTES || 5
        } minutes.</p>
        <p>Do not share this OTP with anyone.</p>
      </div>
    `,
  });
};

/**
 * Sends the household invitation email.
 *
 * Both links are included:
 *  - inviteDeepLink → opens the mobile app directly
 *  - inviteWebUrl   → fallback (works in a browser, e.g. when the
 *                     user is on desktop or the app isn't installed)
 */
// const sendHouseholdInvitationEmail = async ({
//   email,
//   householdName,
//   inviterName,
//   inviteDeepLink,
//   inviteWebUrl,
// }) => {
//   // Plain text version
//   const textLines = [
//     `${inviterName} invited you to access ${householdName}.`,
//     "",
//     "Open in the Asset Manager app:",
//     inviteDeepLink,
//     "",
//   ];

//   if (inviteWebUrl) {
//     textLines.push("Or open in your browser:", inviteWebUrl, "");
//   }

//   textLines.push(
//     "This invitation expires in 7 days.",
//     "If you were not expecting this invitation, ignore this message."
//   );

//   // HTML version
//   const html = `
//     <div style="font-family: Arial, sans-serif; line-height: 1.5;">
//       <h2>${householdName}</h2>
//       <p>${inviterName} invited you to access <b>${householdName}</b>.</p>

//       <p style="margin-top: 22px;">
//         <a href="${inviteDeepLink}"
//            style="background:#2A5CFF;color:#ffffff;padding:12px 20px;
//                   text-decoration:none;border-radius:8px;display:inline-block;">
//           Open in Asset Manager
//         </a>
//       </p>

//       ${
//         inviteWebUrl
//           ? `
//         <p style="font-size:13px;color:#666;margin-top:18px;">
//           Or open this link in your browser:<br/>
//           <a href="${inviteWebUrl}">${inviteWebUrl}</a>
//         </p>
//       `
//           : ""
//       }

//       <p style="font-size:12px;color:#888;margin-top:24px;">
//         This invitation expires in 7 days.<br/>
//         If you were not expecting this invitation, ignore this message.
//       </p>
//     </div>
//   `;

//   await transporter.sendMail({
//     from: process.env.MAIL_FROM,
//     to: email,
//     subject: `Invitation to ${householdName}`,
//     text: textLines.join("\n"),
//     html,
//   });
// };

//new code
const sendHouseholdInvitationEmail = async ({
  email,
  householdName,
  inviterName,
  appLink,
  webLink,
  inviteToken,
}) => {
  const text = [
    `${inviterName} invited you to access ${householdName}.`,
    "",
    "On a phone? Open in the app:",
    appLink,
    "",
    "On a computer? Open in your browser:",
    webLink,
    "",
    "You can also paste this code inside the app under",
    "'Access → Redeem invitation':",
    inviteToken,
    "",
    "This invitation expires in 7 days.",
    "If you were not expecting this invitation, ignore this message.",
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5;
                max-width: 520px; margin: 0 auto; color: #0F172A;">
      <h2 style="margin-bottom: 6px;">${householdName}</h2>
      <p style="color: #64748B; margin-top: 0;">
        ${inviterName} invited you to access <b>${householdName}</b>.
      </p>

      <p style="margin-top: 24px;">
        <a href="${appLink}"
           style="display:inline-block;background:#2A5CFF;color:#fff;
                  text-decoration:none;padding:12px 20px;
                  border-radius:10px;font-weight:600;margin-right:8px;">
          📱 Open in the app
        </a>
        <a href="${webLink}"
           style="display:inline-block;background:#F1F5F9;color:#0F172A;
                  text-decoration:none;padding:12px 20px;
                  border-radius:10px;font-weight:600;">
          🌐 Open in browser
        </a>
      </p>

      <p style="font-size:13px; color:#64748B; margin-top:22px;">
        On a phone, use <b>Open in the app</b>. On a computer, use <b>Open in browser</b>.
      </p>

      <hr style="border:none; border-top:1px solid #E4E9F2; margin: 24px 0;" />

      <p style="font-size:13px; color:#64748B;">
        <b>Alternative:</b> paste this code inside the app under
        <i>Access → Redeem invitation</i>:
      </p>
      <pre style="background:#F7F9FC; border:1px solid #E4E9F2;
                  padding:12px; border-radius:8px; font-family:monospace;
                  word-break:break-all; white-space:pre-wrap;
                  font-size:12px; margin-top:6px;">${inviteToken}</pre>

      <p style="font-size:12px; color:#94A3B8; margin-top:24px;">
        This invitation expires in 7 days.<br/>
        If you were not expecting this invitation, ignore this message.
      </p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to: email,
    subject: `Invitation to ${householdName}`,
    text,
    html,
  });
};

module.exports = {
  sendOtpEmail,
  sendHouseholdInvitationEmail,
};