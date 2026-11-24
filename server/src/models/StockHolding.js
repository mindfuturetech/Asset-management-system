const mongoose = require("mongoose");

const stockHoldingSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    personId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Person",
      required: true,
    },

    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
    },

    // Total shares purchased
    totalBuyQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total shares sold
    totalSellQuantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Current available shares
    quantity: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total gross BUY value
    totalBuyValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total charges paid on BUY transactions
    totalBuyCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total gross SELL value
    totalSellValue: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Total charges paid on SELL transactions
    totalSellCharges: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Remaining cost basis of currently held shares.
    // Includes the allocated BUY charges.
    investedAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Remaining cost basis / current quantity
    averageBuyPrice: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Realized profit/loss after SELL charges
    realizedProfitLoss: {
      type: Number,
      default: 0,
    },

    lastTransactionAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// One holding per household + person + stock
stockHoldingSchema.index(
  {
    householdId: 1,
    personId: 1,
    stockId: 1,
  },
  {
    unique: true,
  }
);

// Household portfolio queries
stockHoldingSchema.index({
  householdId: 1,
  quantity: -1,
});

// Person portfolio queries
stockHoldingSchema.index({
  householdId: 1,
  personId: 1,
  quantity: -1,
});

// Company-wise family holdings
stockHoldingSchema.index({
  householdId: 1,
  stockId: 1,
});

module.exports = mongoose.model("StockHolding", stockHoldingSchema);