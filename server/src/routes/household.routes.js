const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  getMyHousehold,
  getMyHouseholdAccess,
} = require("../controllers/household.controller");

const router = express.Router();

router.get(
  "/me",
  protect,
  getMyHousehold
);

// Get all households accessible to the logged-in user
router.get("/my-access", protect, getMyHouseholdAccess);


module.exports = router;