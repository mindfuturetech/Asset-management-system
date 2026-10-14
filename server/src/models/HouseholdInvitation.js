const mongoose = require("mongoose");

const householdInvitationSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    recipientEmail: {
      type: String,
      default: "",
      lowercase: true,
      trim: true,
    },

    recipientMobile: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: [
        "ADMIN",
        "ASSET_MANAGER",
        "EDITOR",
        "VIEWER",
      ],
      required: true,
    },

    accessScope: {
      type: String,
      enum: ["ALL_PEOPLE", "SELECTED_PEOPLE"],
      required: true,
    },

    personIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Person",
      },
    ],

    // Present only when the invitation also links a Person
    // such as Father to his new login.
    linkPersonId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      default: null,
    },

    tokenHash: {
      type: String,
      required: true,
      unique: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "ACCEPTED", "REVOKED"],
      default: "PENDING",
    },

    invitedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    acceptedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    acceptedAt: {
      type: Date,
      default: null,
    },

    expiresAt: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

householdInvitationSchema.path("recipientEmail").validate(
  function (value) {
    return Boolean(value || this.recipientMobile);
  },
  "At least one recipient email or mobile number is required."
);

householdInvitationSchema.index(
  { expiresAt: 1 },
  { expireAfterSeconds: 0 }
);

module.exports = mongoose.model(
  "HouseholdInvitation",
  householdInvitationSchema
);