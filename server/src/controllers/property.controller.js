const {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
} = require("../services/property.service");


const create = async (req, res, next) => {
  try {
    const result = await createProperty({
      personId: req.params.personId,
      userId: req.user.id,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Property added successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await getProperties({
      personId: req.params.personId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const getOne = async (req, res, next) => {
  try {
    const result = await getPropertyById({
      personId: req.params.personId,
      propertyId: req.params.propertyId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const result = await updateProperty({
      personId: req.params.personId,
      propertyId: req.params.propertyId,
      userId: req.user.id,
      data: req.body,
    });

    return res.status(200).json({
      success: true,
      message: "Property updated successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const remove = async (req, res, next) => {
  try {
    await deleteProperty({
      personId: req.params.personId,
      propertyId: req.params.propertyId,
      userId: req.user.id,
    });

    return res.status(200).json({
      success: true,
      message: "Property deleted successfully",
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