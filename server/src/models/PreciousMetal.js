const mongoose = require("mongoose");

const preciousMetalSchema = new mongoose.Schema(
  {
    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
      index: true,
    },

    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    metalType: {
      type: String,
      enum: ["GOLD", "SILVER", "PLATINUM", "OTHER"],
      required: true,
    },

    description: {
      type: String,
      trim: true,
    },

    weight: {
      type: Number,
      required: true,
      min: 0,
    },

    weightUnit: {
      type: String,
      enum: ["GRAM", "KILOGRAM"],
      default: "GRAM",
    },

    purity: {
      type: Number,
      min: 0,
    },

    purchaseDate: {
      type: Date,
      required: true,
    },

    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    source: {
      type: String,
      enum: ["PURCHASED", "GIFT", "INHERITED", "OTHER"],
      default: "PURCHASED",
    },

    notes: {
      type: String,
      trim: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

preciousMetalSchema.index({
  householdId: 1,
  personId: 1,
});

module.exports = mongoose.model(
  "PreciousMetal",
  preciousMetalSchema
);