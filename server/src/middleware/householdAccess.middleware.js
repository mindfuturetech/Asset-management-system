const mongoose = require("mongoose");
const HouseholdMember = require("../models/HouseholdMember");
const Person = require("../models/Person");

const ROLE_PERMISSIONS = {
  OWNER: ["*"],

  ADMIN: [
    "household:read",
    "people:read",
    "people:create",
    "people:update",
    "people:delete",
    "portfolios:read",
    "portfolios:create",
    "portfolios:update",
    "portfolios:delete",
    "accounts:read",
    "accounts:create",
    "accounts:update",
    "assets:read",
    "assets:create",
    "assets:update",
    "transactions:read",
    "transactions:create",
    "transactions:update",
    "transactions:reverse",
    "imports:create",
    "reports:read",
    "reports:export",
    "members:invite",
    "members:manage",
  ],

  ASSET_MANAGER: [
    "household:read",
    "people:read",
    "portfolios:read",
    "portfolios:create",
    "portfolios:update",
    "accounts:read",
    "accounts:create",
    "accounts:update",
    "assets:read",
    "transactions:read",
    "transactions:create",
    "transactions:update",
    "transactions:reverse",
    "imports:create",
    "reports:read",
    "reports:export",
  ],

  EDITOR: [
    "household:read",
    "people:read",
    "portfolios:read",
    "accounts:read",
    "assets:read",
    "transactions:read",
    "transactions:create",
    "transactions:update",
    "reports:read",
  ],

  VIEWER: [
    "household:read",
    "people:read",
    "portfolios:read",
    "accounts:read",
    "assets:read",
    "transactions:read",
    "reports:read",
  ],
};

const hasPermission = (role, permission) => {
  const permissions = ROLE_PERMISSIONS[role] || [];

  return (
    permissions.includes("*") ||
    permissions.includes(permission)
  );
};

// Check that the login belongs to this household
// and has the requested permission.
const requireHouseholdPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const { householdId } = req.params;

      if (!mongoose.isValidObjectId(householdId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid household ID",
        });
      }

      const membership = await HouseholdMember.findOne({
        householdId,
        userId: req.user.id,
        status: "ACTIVE",
      });

      if (!membership) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this household",
        });
      }

      if (!hasPermission(membership.role, permission)) {
        return res.status(403).json({
          success: false,
          message: "You do not have permission to perform this action",
        });
      }

      req.householdAccess = membership;

      next();
    } catch (error) {
      next(error);
    }
  };
};

// Use on routes that operate on one specific Person.
const requirePersonScope = () => {
  return async (req, res, next) => {
    try {
      const personId =
        req.params.personId ||
        req.body.personId ||
        req.query.personId;

      if (!mongoose.isValidObjectId(personId)) {
        return res.status(400).json({
          success: false,
          message: "Valid personId is required",
        });
      }

      const person = await Person.findOne({
        _id: personId,
        householdId: req.params.householdId,
        status: "ACTIVE",
      });

      if (!person) {
        return res.status(404).json({
          success: false,
          message: "Person not found in this household",
        });
      }

      const membership = req.householdAccess;

      if (
        membership.accessScope === "SELECTED_PEOPLE" &&
        !membership.personIds.some(
          (id) => id.toString() === person._id.toString()
        )
      ) {
        return res.status(403).json({
          success: false,
          message: "You do not have access to this person's data",
        });
      }

      req.person = person;

      next();
    } catch (error) {
      next(error);
    }
  };
};

module.exports = {
  ROLE_PERMISSIONS,
  hasPermission,
  requireHouseholdPermission,
  requirePersonScope,
};