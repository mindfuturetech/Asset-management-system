const mongoose = require("mongoose");
const Person = require("../models/Person");

const createFamilyPerson = async (req, res, next) => {
  try {
    const { name, relationship, dateOfBirth } = req.body;
    const { householdId } = req.params;

    if (!name?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Person name is required",
      });
    }

    const person = await Person.create({
      householdId,
      name: name.trim(),
      relationship: relationship || "",
      dateOfBirth: dateOfBirth || null,
      linkedUserId: null,
      createdBy: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: "Family member profile created",
      data: person,
    });
  } catch (error) {
    next(error);
  }
};

const getFamilyPeople = async (req, res, next) => {
  try {
    const filter = {
      householdId: req.params.householdId,
      status: "ACTIVE",
    };

    

    // Users with limited access see only assigned people.
    if (req.householdAccess.accessScope === "SELECTED_PEOPLE") {
      filter._id = {
        $in: req.householdAccess.personIds,
      };
    }

    const people = await Person.find(filter)
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      data: people,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFamilyPerson,
  getFamilyPeople,
};