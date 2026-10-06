const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  getMyHousehold,
} = require("../controllers/household.controller");

const router = express.Router();

router.get(
  "/me",
  protect,
  getMyHousehold
);

module.exports = router;