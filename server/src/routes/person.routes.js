const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  createPerson,
  getPeople,
} = require("../controllers/person.controller");

const router = express.Router();

router.use(protect);

router.post(
  "/",
  createPerson
);

router.get(
  "/",
  getPeople
);

module.exports = router;