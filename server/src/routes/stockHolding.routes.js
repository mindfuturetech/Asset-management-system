
const express = require("express");

const { protect } = require("../middleware/auth.middleware");

const {
  requireHouseholdPermission,
} = require("../middleware/householdAccess.middleware");

const {
  getStockHoldings,
} = require("../controllers/stockHolding.controller");

const router = express.Router();

// GET STOCK HOLDINGS
router.get(
  "/households/:householdId/stock-holdings",
  protect,
  requireHouseholdPermission("transactions:read"),
  getStockHoldings
);

module.exports = router;
