const mongoose = require("mongoose");

const personSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    relationship: {
      type: String,
      default: "",
      trim: true,
    },

    dateOfBirth: {
      type: Date,
      default: null,
    },

    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },
  },
  {
    timestamps: true,
  }
);

personSchema.index(
  { householdId: 1, linkedUserId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      linkedUserId: { $type: "objectId" },
    },
  }
);

module.exports = mongoose.model("Person", personSchema);