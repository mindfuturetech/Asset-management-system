const express = require("express");

const { protect } = require("../middleware/auth.middleware");

const {
  acceptInvitation,
} = require("../controllers/householdInvitation.controller");

const router = express.Router();

router.post(
  "/accept",
  protect,
  acceptInvitation
);

module.exports = router;