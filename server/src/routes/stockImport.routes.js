const express = require("express");
const multer = require("multer");

const { protect } = require("../middleware/auth.middleware");
const { requireHouseholdPermission } = require("../middleware/householdAccess.middleware");

const {
  previewStockImport,
  importStockTransactions,
  getStockImports,
  getStockImportById,
} = require("../controllers/stockImport.controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (req, file, callback) => {
    const path = require("path");
    const extension = path.extname(file.originalname).toLowerCase();

    if (![".xlsx", ".xls"].includes(extension)) {
      return callback(new Error("Only .xlsx and .xls Excel files are allowed"));
    }

    callback(null, true);
  },
});

router.post(
  "/households/:householdId/stock-imports/preview",
  protect,
  requireHouseholdPermission("imports:create"),
  upload.single("file"),
  previewStockImport
);

router.post(
  "/households/:householdId/stock-imports",
  protect,
  requireHouseholdPermission("imports:create"),
  upload.single("file"),
  importStockTransactions
);

router.get(
  "/households/:householdId/stock-imports",
  protect,
  requireHouseholdPermission("transactions:read"),
  getStockImports
);

router.get(
  "/households/:householdId/stock-imports/:batchId",
  protect,
  requireHouseholdPermission("transactions:read"),
  getStockImportById
);

module.exports = router;