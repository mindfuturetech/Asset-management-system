const mongoose = require("mongoose");

const stockImportErrorSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StockImportBatch",
      required: true,
      index: true,
    },

    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
    },

    // Actual Excel row number (including header row)
    excelRow: {
      type: Number,
      required: true,
      min: 2,
    },

    // Original values supplied in Excel
    rowData: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },

    // Store raw values as strings so invalid IDs do not cause casting errors
    rawPersonId: {
      type: String,
      default: null,
    },

    rawStockName: {
      type: String,
      default: null,
    },

    rawISIN: {
      type: String,
      default: null,
    },

    errors: [
      {
        code: {
          type: String,
          enum: [
            "REQUIRED_FIELD_MISSING",
            "PERSON_NOT_FOUND",
            "PERSON_ACCESS_DENIED",
            "STOCK_NOT_FOUND",
            "INVALID_TRANSACTION_TYPE",
            "INVALID_QUANTITY",
            "INVALID_PRICE",
            "INVALID_TRANSACTION_DATE",
            "INVALID_EXCHANGE",
            "DUPLICATE_TRANSACTION",
            "INSUFFICIENT_HOLDINGS",
            "INVALID_ROW",
          ],
          required: true,
        },

        field: {
          type: String,
          default: null,
        },

        message: {
          type: String,
          required: true,
        },
      },
    ],

    // Whether this failed row has been corrected and reprocessed
    resolved: {
      type: Boolean,
      default: false,
    },

    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Avoid storing the same failed Excel row twice in a batch
stockImportErrorSchema.index(
  {
    batchId: 1,
    excelRow: 1,
  },
  {
    unique: true,
  }
);

// Retrieve errors for one batch
stockImportErrorSchema.index({
  batchId: 1,
  excelRow: 1,
});

module.exports = mongoose.model(
  "StockImportError",
  stockImportErrorSchema
);