const Household = require("../models/Household");
const HouseholdMember = require("../models/HouseholdMember");

const getMyHousehold = async (
  req,
  res,
  next
) => {
  try {
    const household =
      await Household.findById(
        req.user.householdId
      );

    if (!household) {
      return res.status(404).json({
        success: false,
        message: "Household not found",
      });
    }

    const members =
      await HouseholdMember.find({
        householdId: household._id,
      })
        .populate("personId")
        .populate(
          "userId",
          "name email mobile status"
        );

    return res.status(200).json({
      success: true,
      data: {
        household,
        members,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyHousehold,
};