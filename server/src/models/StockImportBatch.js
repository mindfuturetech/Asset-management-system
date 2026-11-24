const mongoose = require("mongoose");

const stockImportBatchSchema = new mongoose.Schema(
  {
    householdId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Household",
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    fileSize: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Optional hash of the uploaded file for detecting repeated uploads
    fileHash: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "PENDING",
        "PROCESSING",
        "COMPLETED",
        "COMPLETED_WITH_ERRORS",
        "FAILED",
      ],
      default: "PENDING",
      required: true,
    },

    totalRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    importedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    failedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    skippedRows: {
      type: Number,
      default: 0,
      min: 0,
    },

    startedAt: {
      type: Date,
      default: null,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    failureMessage: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Household import history
stockImportBatchSchema.index({
  householdId: 1,
  createdAt: -1,
});

// Uploader's import history
stockImportBatchSchema.index({
  uploadedBy: 1,
  createdAt: -1,
});

// Prevent processing the same file twice for a household
stockImportBatchSchema.index(
  {
    householdId: 1,
    fileHash: 1,
  },
  {
    unique: true,
    partialFilterExpression: {
      fileHash: { $type: "string" },
    },
  }
);

module.exports = mongoose.model(
  "StockImportBatch",
  stockImportBatchSchema
);