const Person = require("../models/Person");
const Property = require("../models/Property");
const HouseholdMember = require("../models/HouseholdMember");

const checkPersonAccess = async (personId, userId) => {
  const person = await Person.findById(personId);

  if (!person) {
    const error = new Error("Person not found");
    error.statusCode = 404;
    throw error;
  }

  const membership = await HouseholdMember.findOne({
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
      (id) => id.toString() === personId.toString()
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

const validatePropertyData = ({
  propertyType,
  purchasePrice,
  area,
  bhk,
}) => {
  if (
    !["FLAT", "LAND", "HOUSE"].includes(propertyType)
  ) {
    const error = new Error(
      "propertyType must be FLAT, LAND or HOUSE"
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
    area === undefined ||
    area === null ||
    area <= 0
  ) {
    const error = new Error(
      "area must be greater than 0"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    propertyType === "FLAT" &&
    (bhk === undefined || bhk === null)
  ) {
    const error = new Error(
      "BHK is required for a flat"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    bhk !== undefined &&
    bhk !== null &&
    bhk <= 0
  ) {
    const error = new Error(
      "BHK must be greater than 0"
    );
    error.statusCode = 400;
    throw error;
  }

  if (
    propertyType === "LAND" &&
    bhk !== undefined &&
    bhk !== null
  ) {
    const error = new Error(
      "BHK should not be provided for land"
    );
    error.statusCode = 400;
    throw error;
  }
};

const createProperty = async ({
  personId,
  userId,
  propertyType,
  title,
  purchasePrice,
  area,
  areaUnit,
  bhk,
  purchaseDate,
  address,
  city,
  state,
  pincode,
  description,
  notes,
}) => {
  const person = await checkPersonAccess(
    personId,
    userId
  );

  validatePropertyData({
    propertyType,
    purchasePrice,
    area,
    bhk,
  });

  const property = await Property.create({
    personId: person._id,
    householdId: person.householdId,

    propertyType,
    title,
    purchasePrice,
    area,
    areaUnit,
    bhk,
    purchaseDate,

    address,
    city,
    state,
    pincode,

    description,
    notes,

    createdBy: userId,
    updatedBy: userId,
  });

  return property;
};

const getProperties = async ({
  personId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  return Property.find({
    personId,
  }).sort({
    purchaseDate: -1,
  });
};

const getPropertyById = async ({
  personId,
  propertyId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const property = await Property.findOne({
    _id: propertyId,
    personId,
  });

  if (!property) {
    const error = new Error(
      "Property not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return property;
};

const updateProperty = async ({
  personId,
  propertyId,
  userId,
  data,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const property = await Property.findOne({
    _id: propertyId,
    personId,
  });

  if (!property) {
    const error = new Error(
      "Property not found"
    );
    error.statusCode = 404;
    throw error;
  }

  const allowedFields = [
    "propertyType",
    "title",
    "purchasePrice",
    "area",
    "areaUnit",
    "bhk",
    "purchaseDate",
    "address",
    "city",
    "state",
    "pincode",
    "description",
    "notes",
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      property[field] = data[field];
    }
  }

  validatePropertyData({
    propertyType: property.propertyType,
    purchasePrice: property.purchasePrice,
    area: property.area,
    bhk: property.bhk,
  });

  property.updatedBy = userId;

  await property.save();

  return property;
};

const deleteProperty = async ({
  personId,
  propertyId,
  userId,
}) => {
  await checkPersonAccess(
    personId,
    userId
  );

  const property =
    await Property.findOneAndDelete({
      _id: propertyId,
      personId,
    });

  if (!property) {
    const error = new Error(
      "Property not found"
    );
    error.statusCode = 404;
    throw error;
  }

  return property;
};

module.exports = {
  createProperty,
  getProperties,
  getPropertyById,
  updateProperty,
  deleteProperty,
};