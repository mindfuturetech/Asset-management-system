const mongoose = require("mongoose");

const stockTransactionSchema = new mongoose.Schema(
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
      index: true,
    },

    stockId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Stock",
      required: true,
      index: true,
    },

    transactionType: {
      type: String,
      enum: ["BUY", "SELL"],
      required: true,
    },

    quantity: {
      type: Number,
      required: true,
      min: 0.000001,
    },

    pricePerShare: {
      type: Number,
      required: true,
      min: 0.01,
    },

    transactionDate: {
      type: Date,
      required: true,
    },

    exchange: {
      type: String,
      enum: ["NSE", "BSE"],
      required: true,
    },

    grossAmount: { type: Number, required: true, min: 0 },
    brokerage: { type: Number, default: 0, min: 0 },
    otherCharges: { type: Number, default: 0, min: 0 },
    totalCharges: { type: Number, default: 0, min: 0 },
    netAmount: { type: Number, required: true, min: 0 },

    source: {
      type: String,
      enum: ["MANUAL", "EXCEL_IMPORT"],
      default: "MANUAL",
      required: true,
    },

    importBatchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockImportBatch",
      default: null,
    },

    // Broker's actual trade reference
    tradeId: {
      type: String,
      trim: true,
      required: true,
    },

    idempotencyKey: {
      type: String,
      trim: true,
      default: null,
    },

    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: "",
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["ACTIVE", "REVERSED"],
      default: "ACTIVE",
      required: true,
    },

    reversedAt: { type: Date, default: null },
    reversedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reversalReason: { type: String, default: null },
    reversalTransactionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockTransaction",
      default: null,
    },
  },
  { timestamps: true }
);

stockTransactionSchema.index({
  householdId: 1,
  personId: 1,
  transactionDate: -1,
});

stockTransactionSchema.index({
  householdId: 1,
  stockId: 1,
  transactionDate: -1,
});

stockTransactionSchema.index({ importBatchId: 1 });

stockTransactionSchema.index(
  { householdId: 1, tradeId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      tradeId: { $type: "string" },
    },
  }
);

stockTransactionSchema.index(
  { householdId: 1, idempotencyKey: 1 },
  {
    unique: true,
    partialFilterExpression: {
      idempotencyKey: { $type: "string" },
    },
  }
);

module.exports = mongoose.model(
  "StockTransaction",
  stockTransactionSchema
);