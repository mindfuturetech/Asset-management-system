const Person = require("../models/Person");
const PreciousMetal = require("../models/PreciousMetal");
const HouseholdMember = require("../models/HouseholdMember");


const checkPersonAccess = async (
  personId,
  userId
) => {
  const person = await Person.findById(personId);

  if (!person) {
    const error = new Error("Person not found");
    error.statusCode = 404;
    throw error;
  }

  const membership =
    await HouseholdMember.findOne({
      householdId: person.householdId,
      userId,
      status: "ACTIVE",
    });

  if (!membership) {
    const error = new Error(
      "You do not have access to this person"
    );

    error.statusCode = 403;
    throw error;
  }

  if (
    membership.accessScope === "SELECTED_PEOPLE" &&
    !membership.personIds.some(
      (id) =>
        id.toString() === personId.toString()
    )
  ) {
    const error = new Error(
      "You do not have access to this person's portfolio"
    );

    error.statusCode = 403;
    throw error;
  }

  return person;
};


const validatePreciousMetalData = ({
  metalType,
  purity,
  weight,
  purchasePrice,
}) => {
  if (
    !["GOLD", "SILVER", "PLATINUM", "OTHER"].includes(
      metalType
    )
  ) {
    const error = new Error(
      "metalType must be GOLD, SILVER, PLATINUM or OTHER"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    weight === undefined ||
    weight === null ||
    weight <= 0
  ) {
    const error = new Error(
      "weight must be greater than 0"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    purchasePrice === undefined ||
    purchasePrice === null ||
    purchasePrice < 0
  ) {
    const error = new Error(
      "purchasePrice is required"
    );

    error.statusCode = 400;
    throw error;
  }

  if (
    purity !== undefined &&
    purity !== null &&
    purity < 0
  ) {
    const error = new Error(
      "purity cannot be negative"
    );

    error.statusCode = 400;
    throw error;
  }
};


const createPreciousMetal = async ({
  personId,
  userId,
  metalType,
  description,
  weight,
  weightUnit,
  purity,
  purchaseDate,
  purchasePrice,
  source,
  notes,
}) => {
  const person = await checkPersonAccess(
    personId,
    userId
  );

  validatePreciousMetalData({
    metalType,
    purity,
    weight,
    purchasePrice,
  });

  const preciousMetal =
    await PreciousMetal.create({
      personId: person._id,
      householdId: person.householdId,

      metalType,
      description,
      weight,
      weightUnit,
      purity,
      purchaseDate,
      purchasePrice,
      source,
      notes,

      createdBy: userId,
      updatedBy: userId,
    });

  return preciousMetal;
};


const getPreciousMetals = async ({
  personId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  return await PreciousMetal.find({
    personId,
  }).sort({
    purchaseDate: -1,
  });
};


const getPreciousMetalById = async ({
  personId,
  metalId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const metal =
    await PreciousMetal.findOne({
      _id: metalId,
      personId,
    });

  if (!metal) {
    const error = new Error(
      "Precious metal not found"
    );

    error.statusCode = 404;
    throw error;
  }

  return metal;
};


const updatePreciousMetal = async ({
  personId,
  metalId,
  userId,
  data,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const metal =
    await PreciousMetal.findOne({
      _id: metalId,
      personId,
    });

  if (!metal) {
    const error = new Error(
      "Precious metal not found"
    );

    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "metalType",
    "description",
    "weight",
    "weightUnit",
    "purity",
    "purchaseDate",
    "purchasePrice",
    "source",
    "notes",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      metal[field] = data[field];
    }
  }

  validatePreciousMetalData({
    metalType: metal.metalType,
    purity: metal.purity,
    weight: metal.weight,
    purchasePrice: metal.purchasePrice,
  });

  metal.updatedBy = userId;

  await metal.save();

  return metal;
};


const deletePreciousMetal = async ({
  personId,
  metalId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const metal =
    await PreciousMetal.findOneAndDelete({
      _id: metalId,
      personId,
    });

  if (!metal) {
    const error = new Error(
      "Precious metal not found"
    );

    error.statusCode = 404;
    throw error;
  }

  return metal;
};


module.exports = {
  createPreciousMetal,
  getPreciousMetals,
  getPreciousMetalById,
  updatePreciousMetal,
  deletePreciousMetal,
};