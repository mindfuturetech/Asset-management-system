const Person = require("../models/Person");
const PreciousMetal = require("../models/PreciousMetal");
const HouseholdMember = require("../models/HouseholdMember");

const {
  getLatestMetalPrice,
  getPricePerGramForPurity,
} = require("./metalPrice.service");

/**
 * Check whether user can access this person.
 */
const checkPersonAccess = async (
  personId,
  userId
) => {
  console.log(`Checking access for user ${userId} to person ${personId}`);
  const person = await Person.findById(
    personId
  );

  if (!person) {
    const error = new Error(
      "Person not found"
    );

    error.statusCode = 404;

    throw error;
  }

  const membership =
    await HouseholdMember.findOne({
      householdId: person.householdId,
      userId,
      status: "ACTIVE",
    });

  if (!membership) {
    const error = new Error(
      "You do not have access to this person"
    );

    error.statusCode = 403;

    throw error;
  }

  if (
    membership.accessScope ===
      "SELECTED_PEOPLE" &&
    !membership.personIds.some(
      (id) =>
        id.toString() ===
        personId.toString()
    )
  ) {
    const error = new Error(
      "You do not have access to this person's portfolio"
    );

    error.statusCode = 403;

    throw error;
  }

  return person;
};

/**
 * Validate Gold/Silver data.
 */
const validatePreciousMetalData = ({
  metalType,
  purity,
  weight,
  purchasePrice,
}) => {
  if (
    !["GOLD", "SILVER"].includes(
      metalType
    )
  ) {
    const error = new Error(
      "metalType must be GOLD or SILVER"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!weight || weight <= 0) {
    const error = new Error(
      "weight must be greater than 0"
    );

    error.statusCode = 400;

    throw error;
  }

  if (
    purchasePrice === undefined ||
    purchasePrice < 0
  ) {
    const error = new Error(
      "purchasePrice is required"
    );

    error.statusCode = 400;

    throw error;
  }

  if (!purity || purity <= 0) {
    const error = new Error(
      "purity is required"
    );

    error.statusCode = 400;

    throw error;
  }

  /*
   * Gold purity
   */
  if (metalType === "GOLD") {
    if (![24, 22, 18].includes(purity)) {
      const error = new Error(
        "Gold purity must be 24, 22 or 18 karat"
      );

      error.statusCode = 400;

      throw error;
    }
  }

  /*
   * Silver purity
   *
   * Example:
   * 999
   * 925
   * 900
   */
  if (metalType === "SILVER") {
    if (
      purity < 1 ||
      purity > 1000
    ) {
      const error = new Error(
        "Silver purity must be between 1 and 1000"
      );

      error.statusCode = 400;

      throw error;
    }
  }
};

/**
 * Convert weight into grams.
 */
const convertToGrams = (
  weight,
  weightUnit
) => {
  if (weightUnit === "KILOGRAM") {
    return weight * 1000;
  }

  return weight;
};

/**
 * Calculate valuation.
 */
const calculateValuation = ({
  metal,
  price,
  priceStatus,
}) => {
  /*
   * No price available.
   */
  if (!price) {
    return {
      priceUsedPerGram: null,
      priceDate: null,
      priceStatus: "UNAVAILABLE",
      estimatedCurrentValue: null,
      estimatedProfit: null,
      estimatedProfitPercent: null,
      message:
        "Metal price is currently unavailable. Portfolio valuation will be calculated when a price becomes available.",
    };
  }

  const pricePerGram =
    getPricePerGramForPurity(
      metal.metalType,
      price,
      metal.purity
    );

  /*
   * Price exists but purity is unsupported.
   */
  if (!pricePerGram) {
    return {
      priceUsedPerGram: null,
      priceDate: price.priceDate,
      priceStatus,
      estimatedCurrentValue: null,
      estimatedProfit: null,
      estimatedProfitPercent: null,
      message:
        "Price is available, but valuation cannot be calculated for this purity.",
    };
  }

  const weightInGrams =
    convertToGrams(
      metal.weight,
      metal.weightUnit
    );

  const estimatedCurrentValue =
    weightInGrams *
    pricePerGram;

  const estimatedProfit =
    estimatedCurrentValue -
    metal.purchasePrice;

  const estimatedProfitPercent =
    metal.purchasePrice > 0
      ? (estimatedProfit /
          metal.purchasePrice) *
        100
      : null;

  return {
    priceUsedPerGram:
      Number(pricePerGram.toFixed(2)),

    priceDate:
      price.priceDate,

    priceStatus,

    estimatedCurrentValue:
      Number(
        estimatedCurrentValue.toFixed(2)
      ),

    estimatedProfit:
      Number(
        estimatedProfit.toFixed(2)
      ),

    estimatedProfitPercent:
      estimatedProfitPercent !== null
        ? Number(
            estimatedProfitPercent.toFixed(
              2
            )
          )
        : null,

    message:
      priceStatus === "FALLBACK"
        ? "Today's price is unavailable. Valuation is based on the latest available price."
        : "Valuation is based on today's available price.",
  };
};

/**
 * CREATE PRECIOUS METAL
 */
const createPreciousMetal = async ({
  personId,
  userId,
  metalType,
  description,
  weight,
  weightUnit,
  purity,
  purchaseDate,
  purchasePrice,
  source,
  notes,
}) => {
  /*
   * Check person + permission.
   */
  const person =
    await checkPersonAccess(
      personId,
      userId
    );

  /*
   * Validate input.
   */
  validatePreciousMetalData({
    metalType,
    purity,
    weight,
    purchasePrice,
  });

  /*
   * Save asset.
   *
   * We DO NOT fail asset creation
   * if today's price is unavailable.
   */
  const preciousMetal =
    await PreciousMetal.create({
      personId,
      householdId:
        person.householdId,

      metalType,
      description,
      weight,
      weightUnit,
      purity,
      purchaseDate,
      purchasePrice,
      source,
      notes,

      createdBy: userId,
      updatedBy: userId,
    });

  /*
   * Get price AFTER saving asset.
   *
   * If price API fails:
   * fallback is attempted.
   *
   * If no price exists:
   * asset is still successfully created.
   */
  const priceResult =
    await getLatestMetalPrice(
      metalType
    );

  const valuation =
    calculateValuation({
      metal: preciousMetal,
      price: priceResult.price,
      priceStatus:
        priceResult.priceStatus,
    });

  return {
    preciousMetal,
    valuation,
  };
};

/**
 * GET ALL PRECIOUS METALS FOR PERSON
 */
const getPreciousMetals = async ({
  personId,
  userId,
}) => {
  /*
   * Check access.
   */
  await checkPersonAccess(
    personId,
    userId
  );

  /*
   * Get assets.
   */
  const metals =
    await PreciousMetal.find({
      personId,
    }).sort({
      purchaseDate: -1,
    });

  /*
   * Price cache.
   *
   * Only fetch/check once per metal type
   * for this request.
   */
  const priceCache = {};

  const result = [];

  for (const metal of metals) {
    if (!priceCache[metal.metalType]) {
      priceCache[metal.metalType] =
        await getLatestMetalPrice(
          metal.metalType
        );
    }

    const priceResult =
      priceCache[metal.metalType];

    const valuation =
      calculateValuation({
        metal,
        price: priceResult.price,
        priceStatus:
          priceResult.priceStatus,
      });

    result.push({
      ...metal.toObject(),
      valuation,
    });
  }

  return result;
};

/**
 * GET SINGLE PRECIOUS METAL
 */
const getPreciousMetalById =
  async ({
    personId,
    metalId,
    userId,
  }) => {
    await checkPersonAccess(
      personId,
      userId
    );

    const metal =
      await PreciousMetal.findOne({
        _id: metalId,
        personId,
      });

    if (!metal) {
      const error = new Error(
        "Precious metal not found"
      );

      error.statusCode = 404;

      throw error;
    }

    const priceResult =
      await getLatestMetalPrice(
        metal.metalType
      );

    const valuation =
      calculateValuation({
        metal,
        price: priceResult.price,
        priceStatus:
          priceResult.priceStatus,
      });

    return {
      ...metal.toObject(),
      valuation,
    };
  };

/**
 * UPDATE PRECIOUS METAL
 */
const updatePreciousMetal =
  async ({
    personId,
    metalId,
    userId,
    data,
  }) => {
    await checkPersonAccess(
      personId,
      userId
    );

    const metal =
      await PreciousMetal.findOne({
        _id: metalId,
        personId,
      });

    if (!metal) {
      const error = new Error(
        "Precious metal not found"
      );

      error.statusCode = 404;

      throw error;
    }

    /*
     * Update allowed fields.
     */
    const allowedFields = [
      "metalType",
      "description",
      "weight",
      "weightUnit",
      "purity",
      "purchaseDate",
      "purchasePrice",
      "source",
      "notes",
    ];

    for (const field of allowedFields) {
      if (
        data[field] !== undefined
      ) {
        metal[field] =
          data[field];
      }
    }

    /*
     * Validate final document.
     */
    validatePreciousMetalData({
      metalType:
        metal.metalType,

      purity:
        metal.purity,

      weight:
        metal.weight,

      purchasePrice:
        metal.purchasePrice,
    });

    metal.updatedBy = userId;

    await metal.save();

    const priceResult =
      await getLatestMetalPrice(
        metal.metalType
      );

    const valuation =
      calculateValuation({
        metal,
        price: priceResult.price,
        priceStatus:
          priceResult.priceStatus,
      });

    return {
      ...metal.toObject(),
      valuation,
    };
  };

/**
 * DELETE PRECIOUS METAL
 */
const deletePreciousMetal =
  async ({
    personId,
    metalId,
    userId,
  }) => {
    await checkPersonAccess(
      personId,
      userId
    );

    const metal =
      await PreciousMetal.findOneAndDelete({
        _id: metalId,
        personId,
      });

    if (!metal) {
      const error = new Error(
        "Precious metal not found"
      );

      error.statusCode = 404;

      throw error;
    }

    return metal;
  };

module.exports = {
  createPreciousMetal,
  getPreciousMetals,
  getPreciousMetalById,
  updatePreciousMetal,
  deletePreciousMetal,
};