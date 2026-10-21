const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  getTodayPrices,
} = require("../controllers/metalPrice.controller");

const router = express.Router();

router.get(
  "/metal-prices/today",
  protect,
  getTodayPrices
);

module.exports = router;