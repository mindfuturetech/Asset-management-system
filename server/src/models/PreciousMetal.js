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
      enum: ["GOLD", "SILVER"],
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

    /*
      GOLD:
        24 = 24K
        22 = 22K
        18 = 18K

      SILVER:
        999 = 999 purity
        925 = 925 purity
    */
    purity: {
      type: Number,
      required: true,
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
      enum: [
        "PURCHASED",
        "GIFT",
        "INHERITED",
        "OTHER",
      ],
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