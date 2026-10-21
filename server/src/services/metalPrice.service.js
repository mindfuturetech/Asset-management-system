const axios = require("axios");
const MetalPrice = require("../models/MetalPrice");

const GOLD_API_BASE_URL = "https://www.goldapi.io/api/price";

/**
 * Get today's date in Indian timezone.
 *
 * Example:
 * 2026-10-15
 */
const getTodayDate = () => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
  }).format(new Date());
};

/**
 * Fetch price from GoldAPI.
 */
const fetchMetalPriceFromAPI = async (metalType) => {
  const symbol =
    metalType === "GOLD"
      ? "XAU"
      : "XAG";

  const response = await axios.get(
    `${GOLD_API_BASE_URL}/${symbol}/INR`,
    {
      headers: {
        "x-access-token": process.env.GOLD_API_KEY,
        "Content-Type": "application/json",
      },
      timeout: 10000,
    }
  );

  return response.data;
};

/**
 * Convert GoldAPI response into our MongoDB structure.
 */
const formatAPIPrice = (metalType, apiData) => {
  if (!apiData) {
    throw new Error("Invalid metal price API response");
  }

  const pricePerGram = Number(
    apiData?.price_per_unit?.gram
  );

  if (
    !Number.isFinite(pricePerGram) ||
    pricePerGram <= 0
  ) {
    throw new Error(
      `Invalid ${metalType} price received from GoldAPI`
    );
  }

  if (metalType === "GOLD") {
    return {
      pricePerGram,

      price24K:
        Number(apiData?.melt_price_per_gram?.["24k"]) ||
        pricePerGram,

      price22K:
        Number(apiData?.melt_price_per_gram?.["22k"]) ||
        null,

      price18K:
        Number(apiData?.melt_price_per_gram?.["18k"]) ||
        null,
    };
  }

  return {
    pricePerGram,
    price24K: null,
    price22K: null,
    price18K: null,
  };
};

/**
 * Save today's price.
 *
 * IMPORTANT:
 * If API fails, this function throws.
 * It does NOT overwrite the previous day's price.
 */
const saveTodayMetalPrice = async (metalType) => {
  const today = getTodayDate();

  const apiData = await fetchMetalPriceFromAPI(
    metalType
  );

  const formattedPrice = formatAPIPrice(
    metalType,
    apiData
  );

  const price = await MetalPrice.findOneAndUpdate(
    {
      metalType,
      currency: "INR",
      priceDate: today,
    },
    {
      $set: {
        ...formattedPrice,
        source: "GoldAPI",
        fetchedAt: new Date(),
      },
      $setOnInsert: {
        metalType,
        currency: "INR",
        priceDate: today,
      },
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
    }
  );

  return price;
};

/**
 * Get today's saved price.
 *
 * If it doesn't exist, fetch from GoldAPI and save it.
 *
 * This function does NOT fallback.
 */
const getTodayMetalPrice = async (metalType) => {
  const today = getTodayDate();

  const existingPrice = await MetalPrice.findOne({
    metalType,
    currency: "INR",
    priceDate: today,
  });

  if (existingPrice) {
    return existingPrice;
  }

  return await saveTodayMetalPrice(metalType);
};

/**
 * =====================================================
 * MAIN PRICE FUNCTION
 * =====================================================
 *
 * Logic:
 *
 * 1. Today's MongoDB price
 * 2. Today's GoldAPI price
 * 3. Latest previous MongoDB price
 * 4. No price
 */
const getLatestMetalPrice = async (metalType) => {
  const today = getTodayDate();

  /*
   * STEP 1
   * Check today's saved price.
   */
  const todayPrice = await MetalPrice.findOne({
    metalType,
    currency: "INR",
    priceDate: today,
  });

  if (todayPrice) {
    return {
      price: todayPrice,
      priceStatus: "TODAY",
    };
  }

  /*
   * STEP 2
   * Today's price does not exist.
   *
   * Try GoldAPI.
   */
  try {
    const newPrice = await saveTodayMetalPrice(
      metalType
    );

    return {
      price: newPrice,
      priceStatus: "TODAY",
    };
  } catch (error) {
    console.error(
      `Today's ${metalType} price unavailable:`,
      error.message
    );
  }

  /*
   * STEP 3
   *
   * GoldAPI failed.
   *
   * Find latest price before today.
   */
  const previousPrice = await MetalPrice.findOne({
    metalType,
    currency: "INR",
    priceDate: {
      $lt: today,
    },
  }).sort({
    priceDate: -1,
  });

  if (previousPrice) {
    return {
      price: previousPrice,
      priceStatus: "FALLBACK",
    };
  }

  /*
   * STEP 4
   *
   * No price exists anywhere.
   */
  return {
    price: null,
    priceStatus: "UNAVAILABLE",
  };
};

/**
 * Get price used for a particular purity.
 */
const getPricePerGramForPurity = (
  metalType,
  price,
  purity
) => {
  if (!price) {
    return null;
  }

  if (metalType === "GOLD") {
    if (purity === 24) {
      return price.price24K;
    }

    if (purity === 22) {
      return price.price22K;
    }

    if (purity === 18) {
      return price.price18K;
    }

    return null;
  }

  /*
   * Silver
   *
   * pricePerGram is assumed to be pure/spot price.
   *
   * Example:
   * 999 silver:
   *  price × 999 / 1000
   *
   * 925 silver:
   *  price × 925 / 1000
   */
  if (metalType === "SILVER") {
    return (
      price.pricePerGram *
      (purity / 1000)
    );
  }

  return null;
};

module.exports = {
  getTodayDate,
  fetchMetalPriceFromAPI,
  saveTodayMetalPrice,
  getTodayMetalPrice,
  getLatestMetalPrice,
  getPricePerGramForPurity,
};