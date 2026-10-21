const Household = require("../models/Household");
const HouseholdMember = require("../models/HouseholdMember");

const getMyHousehold = async (req, res, next) => {
  try {
    // Use the household from the URL when supplied.
    // Fall back to the token's householdId for your existing route.
    const householdId =
      req.params.householdId || req.user.householdId;

    if (!householdId) {
      return res.status(400).json({
        success: false,
        message: "Household ID is required",
      });
    }

    const household = await Household.findById(householdId);

    if (!household) {
      return res.status(404).json({
        success: false,
        message: "Household not found",
      });
    }

    // Verify that the logged-in user has access to this household.
    const currentMembership = await HouseholdMember.findOne({
      householdId: household._id,
      userId: req.user.id,
      status: "ACTIVE",
    });

    if (!currentMembership) {
      return res.status(403).json({
        success: false,
        message: "You do not have access to this household",
      });
    }

    // Get all active members of this household.
    const members = await HouseholdMember.find({
      householdId: household._id,
      status: "ACTIVE",
    })
      .populate("personIds", "name relationship linkedUserId status")
      .populate("userId", "name email mobile status")
      .populate("grantedBy", "name email");

    return res.status(200).json({
      success: true,
      data: {
        household,
        members,
        currentUserRole: currentMembership.role,
        accessScope: currentMembership.accessScope,
      },
    });
  } catch (error) {
    next(error);
  }
};

// New API: GET /api/v1/households/my-access
const getMyHouseholdAccess = async (req, res, next) => {
  try {
    // Find every active household membership of the logged-in user.
    const memberships = await HouseholdMember.find({
      userId: req.user.id,
      status: "ACTIVE",
    })
      .populate("householdId", "name")
      .populate("personIds", "name relationship status")
      .sort({ createdAt: -1 });

    // Remove memberships whose household no longer exists.
    const validMemberships = memberships.filter(
      (membership) => membership.householdId
    );

    const households = validMemberships.map((membership) => ({
      householdId: membership.householdId._id,
      householdName: membership.householdId.name,
      role: membership.role,
      accessScope: membership.accessScope,

      // Empty people array does not mean no access when
      // accessScope is ALL_PEOPLE.
      people:
        membership.accessScope === "ALL_PEOPLE"
          ? []
          : membership.personIds.map((person) => ({
              personId: person._id,
              name: person.name,
              relationship: person.relationship,
            })),

      status: membership.status,
    }));

    return res.status(200).json({
      success: true,
      count: households.length,
      data: households,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyHousehold,
  getMyHouseholdAccess,
};
