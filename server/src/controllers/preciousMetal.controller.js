const {
  createPreciousMetal,
  getPreciousMetals,
  getPreciousMetalById,
  updatePreciousMetal,
  deletePreciousMetal,
} = require("../services/preciousMetal.service");

/**
 * POST /people/:personId/precious-metals
 */
const create = async (req, res, next) => {
  try {
    const result =
      await createPreciousMetal({
        personId:
          req.params.personId,

        userId:
          req.user.id,

        ...req.body,
      });

    return res.status(201).json({
      success: true,
      message:
        "Precious metal added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /people/:personId/precious-metals
 */
const getAll = async (req, res, next) => {
  try {
    const result =
      await getPreciousMetals({
        personId:
          req.params.personId,

        userId:
          req.user.id,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /people/:personId/precious-metals/:metalId
 */
const getOne = async (req, res, next) => {
  try {
    const result =
      await getPreciousMetalById({
        personId:
          req.params.personId,

        metalId:
          req.params.metalId,

        userId:
          req.user.id,
      });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /people/:personId/precious-metals/:metalId
 */
const update = async (req, res, next) => {
  try {
    const result =
      await updatePreciousMetal({
        personId:
          req.params.personId,

        metalId:
          req.params.metalId,

        userId:
          req.user.id,

        data: req.body,
      });

    return res.status(200).json({
      success: true,
      message:
        "Precious metal updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /people/:personId/precious-metals/:metalId
 */
const remove = async (req, res, next) => {
  try {
    await deletePreciousMetal({
      personId:
        req.params.personId,

      metalId:
        req.params.metalId,

      userId:
        req.user.id,
    });

    return res.status(200).json({
      success: true,
      message:
        "Precious metal deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  create,
  getAll,
  getOne,
  update,
  remove,
};