const {
  getLatestMetalPrice,
} = require("../services/metalPrice.service");

const getTodayPrices = async (
  req,
  res,
  next
) => {
  try {
    const gold =
      await getLatestMetalPrice(
        "GOLD"
      );

    const silver =
      await getLatestMetalPrice(
        "SILVER"
      );

    const formatPrice = (
      result
    ) => {
      if (!result.price) {
        return {
          pricePerGram: null,
          price24K: null,
          price22K: null,
          price18K: null,
          priceDate: null,
          priceStatus:
            "UNAVAILABLE",
        };
      }

      return {
        pricePerGram:
          result.price
            .pricePerGram,

        price24K:
          result.price
            .price24K,

        price22K:
          result.price
            .price22K,

        price18K:
          result.price
            .price18K,

        priceDate:
          result.price
            .priceDate,

        priceStatus:
          result.priceStatus,
      };
    };

    return res.status(200).json({
      success: true,

      data: {
        currency: "INR",

        gold:
          formatPrice(gold),

        silver:
          formatPrice(silver),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodayPrices,
};