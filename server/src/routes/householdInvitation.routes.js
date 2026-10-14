const express = require("express");

const { protect } = require("../middleware/auth.middleware");

const {
  requireHouseholdPermission,
} = require("../middleware/householdAccess.middleware");

const {
  createInvitation,
} = require("../controllers/householdInvitation.controller");

const router = express.Router();

router.post(
  "/:householdId/invitations",
  protect,
  requireHouseholdPermission("members:invite"),
  createInvitation
);

module.exports = router;