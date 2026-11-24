
const express = require("express");

const { protect } = require("../middleware/auth.middleware");

const {
  requireHouseholdPermission,
  requirePersonScope,
} = require("../middleware/householdAccess.middleware");

const {
  createStockTransaction,
  getStockTransactions,
  getStockTransactionById,
} = require("../controllers/stockTransaction.controller");

const router = express.Router();

// CREATE BUY / SELL TRANSACTION
router.post(
  "/households/:householdId/stock-transactions",
  protect,
  requireHouseholdPermission("transactions:create"),
  requirePersonScope(),
  createStockTransaction
);

// GET HOUSEHOLD TRANSACTIONS
router.get(
  "/households/:householdId/stock-transactions",
  protect,
  requireHouseholdPermission("transactions:read"),
  getStockTransactions
);

// GET SINGLE TRANSACTION
router.get(
  "/households/:householdId/stock-transactions/:transactionId",
  protect,
  requireHouseholdPermission("transactions:read"),
  getStockTransactionById
);

module.exports = router;
