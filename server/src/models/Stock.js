
const mongoose = require("mongoose");

const stockSchema = new mongoose.Schema(
  {
    isin: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,  
    },

    companyName: {
      type: String,
      required: true,
      trim: true,
    },

    exchanges: {
      nse: {
        listed: {
          type: Boolean,
          default: false,
        },
        symbol: {
          type: String,
          default: null,
          trim: true,
        },
        series: {
          type: String,
          default: null,
          trim: true,
        },
        listingDate: {
          type: String,
          default: null,
        },
        paidUpValue: {
          type: String,
          default: null,
        },
        faceValue: {
          type: String,
          default: null,
        },
      },

      bse: {
        listed: {
          type: Boolean,
          default: false,
        },
        securityCode: {
          type: String,
          default: null,
          trim: true,
        },
        securityId: {
          type: String,
          default: null,
          trim: true,
        },
        securityName: {
          type: String,
          default: null,
          trim: true,
        },
        group: {
          type: String,
          default: null,
          trim: true,
        },
        faceValue: {
          type: String,
          default: null,
        },
      },
    },

    classification: {
      macroEconomicSector: {
        type: String,
        default: null,
      },
      sector: {
        type: String,
        default: null,
      },
      industry: {
        type: String,
        default: null,
      },
      basicIndustry: {
        type: String,
        default: null,
      },
      source: {
        type: String,
        default: null,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
      status: {
        type: String,
        enum: ["CLASSIFIED", "UNCLASSIFIED", "REVIEW_REQUIRED"],
        default: "UNCLASSIFIED",
      },
    },

    status: {
      type: String,
      enum: ["ACTIVE", "INACTIVE"],
      default: "ACTIVE",
    },

    lastMasterImportAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "stocks",
  }
);

// Additional search indexes
stockSchema.index({ companyName: 1 });
stockSchema.index({ "exchanges.nse.symbol": 1 });
stockSchema.index({ "exchanges.bse.securityId": 1 });
stockSchema.index({ "exchanges.bse.securityCode": 1 });
stockSchema.index({ "classification.sector": 1 });
stockSchema.index({ "classification.industry": 1 });

module.exports = mongoose.model("Stock", stockSchema);
