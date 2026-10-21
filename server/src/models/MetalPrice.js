const mongoose = require("mongoose");

const metalPriceSchema = new mongoose.Schema(
  {
    metalType: {
      type: String,
      enum: ["GOLD", "SILVER"],
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
      required: true,
    },

    // Main price used for valuation
    pricePerGram: {
      type: Number,
      required: true,
    },

    // Gold specific
    price24K: {
      type: Number,
      default: null,
    },

    price22K: {
      type: Number,
      default: null,
    },

    price18K: {
      type: Number,
      default: null,
    },

    source: {
      type: String,
      default: "GoldAPI",
    },

    // Example: 2026-10-15
    priceDate: {
      type: String,
      required: true,
    },

    fetchedAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// One record per metal per day
metalPriceSchema.index(
  {
    metalType: 1,
    currency: 1,
    priceDate: 1,
  },
  {
    unique: true,
  }
);

module.exports = mongoose.model("MetalPrice", metalPriceSchema);