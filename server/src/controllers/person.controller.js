const mongoose = require("mongoose");

const Person = require("../models/Person");
const HouseholdMember = require("../models/HouseholdMember");

const createPerson = async (
  req,
  res,
  next
) => {
  try {
    const {
      name,
      relationship,
      dateOfBirth,
    } = req.body;

    const householdId =
      req.user.householdId;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    const session =
      await mongoose.startSession();

    let person;

    try {
      await session.withTransaction(
        async () => {
          const created =
            await Person.create(
              [
                {
                  householdId,
                  name,
                  relationship:
                    relationship || "",
                  dateOfBirth:
                    dateOfBirth || null,
                },
              ],
              { session }
            );

          person = created[0];

          await HouseholdMember.create(
            [
              {
                householdId,
                personId: person._id,
                userId: null,
                role: "EDITOR",
              },
            ],
            { session }
          );
        }
      );
    } finally {
      await session.endSession();
    }

    return res.status(201).json({
      success: true,
      message: "Person added successfully",
      data: person,
    });
  } catch (error) {
    next(error);
  }
};

const getPeople = async (
  req,
  res,
  next
) => {
  try {
    const people =
      await Person.find({
        householdId:
          req.user.householdId,
        status: "ACTIVE",
      }).sort({
        createdAt: 1,
      });

    return res.status(200).json({
      success: true,
      data: people,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createPerson,
  getPeople,
};