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
} = require("../controllers/preciousMetal.controller");

const router = express.Router();

/*
 * Create Gold/Silver
 */
router.post(
  "/people/:personId/precious-metals",
  protect,
  create
);

/*
 * Get all Gold/Silver
 */
router.get(
  "/people/:personId/precious-metals",
  protect,
  getAll
);

/*
 * Get one Gold/Silver
 */
router.get(
  "/people/:personId/precious-metals/:metalId",
  protect,
  getOne
);

/*
 * Update
 */
router.put(
  "/people/:personId/precious-metals/:metalId",
  protect,
  update
);

/*
 * Delete
 */
router.delete(
  "/people/:personId/precious-metals/:metalId",
  protect,
  remove
);

module.exports = router;