const express = require("express");

const {
  protect,
} = require("../middleware/auth.middleware");

const {
  create,
  getAll,
  getOne,
  update,
  remove,
} = require("../controllers/property.controller");

const router = express.Router();

router.post(
  "/people/:personId/properties",
  protect,
  create
);

router.get(
  "/people/:personId/properties",
  protect,
  getAll
);

router.get(
  "/people/:personId/properties/:propertyId",
  protect,
  getOne
);

router.put(
  "/people/:personId/properties/:propertyId",
  protect,
  update
);

router.delete(
  "/people/:personId/properties/:propertyId",
  protect,
  remove
);

module.exports = router;