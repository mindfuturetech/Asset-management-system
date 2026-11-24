const mongoose = require("mongoose");

const propertySchema = new mongoose.Schema(
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

    propertyType: {
      type: String,
      enum: ["FLAT", "LAND", "HOUSE"],
      required: true,
    },

    title: {
      type: String,
      trim: true,
    },

    purchasePrice: {
      type: Number,
      required: true,
      min: 0,
    },

    area: {
      type: Number,
      required: true,
      min: 0,
    },

    areaUnit: {
      type: String,
      enum: ["SQ_FT"],
      default: "SQ_FT",
    },

    bhk: {
      type: Number,
      min: 1,
      default: null,
    },

    purchaseDate: {
      type: Date,
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    city: {
      type: String,
      trim: true,
    },

    state: {
      type: String,
      trim: true,
    },

    pincode: {
      type: String,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
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

propertySchema.index({
  householdId: 1,
  personId: 1,
});

module.exports = mongoose.model("Property", propertySchema);