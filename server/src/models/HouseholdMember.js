const mongoose = require("mongoose");

const householdMemberSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    role: {
      type: String,
      enum: [
        "OWNER",
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
      default: "ALL_PEOPLE",
      required: true,
    },

    // Used only when accessScope = SELECTED_PEOPLE.
    personIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Person",
      },
    ],

    status: {
      type: String,
      enum: ["ACTIVE", "SUSPENDED"],
      default: "ACTIVE",
    },

    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true }
);

// Dhruv can have one membership in Sumit Family
// and a separate membership in Amol Family.
householdMemberSchema.index(
  { householdId: 1, userId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "HouseholdMember",
  householdMemberSchema
);