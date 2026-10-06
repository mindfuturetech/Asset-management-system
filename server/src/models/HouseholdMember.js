const mongoose = require("mongoose");

const householdMemberSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    role: {
      type: String,
      enum: ["OWNER", "ADMIN", "EDITOR", "VIEWER"],
      default: "VIEWER",
    },
  },
  {
    timestamps: true,
  }
);

householdMemberSchema.index(
  { householdId: 1, personId: 1 },
  { unique: true }
);

module.exports = mongoose.model(
  "HouseholdMember",
  householdMemberSchema
);