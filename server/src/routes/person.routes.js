const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  requireHouseholdPermission,
  requirePersonScope,
} = require("../middleware/householdAccess.middleware");

const {
  createFamilyPerson,
  getFamilyPeople,
} = require("../controllers/person.controller");

const router = express.Router();

router.use(protect);

// router.post(
//   "/",
//   createPerson
// );
router.post(
  "/:householdId/people",
  protect,
  requireHouseholdPermission("people:create"),
  createFamilyPerson
);

// router.get(
//   "/",
//   getPeople
// );

// Get family members
router.get(
  "/:householdId/people",
  protect,
  requireHouseholdPermission("people:read"),
  getFamilyPeople
);

module.exports = router;