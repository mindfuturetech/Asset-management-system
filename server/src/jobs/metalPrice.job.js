const cron = require("node-cron");

const {
  saveTodayMetalPrice,
} = require("../services/metalPrice.service");

const startMetalPriceJob = () => {
  cron.schedule(
    // "0 9 * * *",
    "30 16 * * *",
    async () => {
      console.log(
        "Daily metal price job started"
      );

      /*
       * GOLD
       */
      try {
        await saveTodayMetalPrice(
          "GOLD"
        );

        console.log(
          "Gold price saved successfully"
        );
      } catch (error) {
        console.error(
          "Gold price update failed:",
          error.message
        );
      }

      /*
       * SILVER
       */
      try {
        await saveTodayMetalPrice(
          "SILVER"
        );

        console.log(
          "Silver price saved successfully"
        );
      } catch (error) {
        console.error(
          "Silver price update failed:",
          error.message
        );
      }

      console.log(
        "Daily metal price job completed"
      );
    },
    {
      timezone: "Asia/Kolkata",
    }
  );

  console.log(
    "Metal price scheduler started"
  );
};

module.exports =
  startMetalPriceJob;