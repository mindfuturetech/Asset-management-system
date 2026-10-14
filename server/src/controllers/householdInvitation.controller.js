const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/User");
const Person = require("../models/Person");
const Household = require("../models/Household");
const HouseholdMember = require("../models/HouseholdMember");
const HouseholdInvitation = require("../models/HouseholdInvitation");
const {
  sendHouseholdInvitationEmail,
} = require("../services/email.service");

const {
  sendHouseholdInvitationSms,
} = require("../services/sms.service");

const normalizeEmail = (email = "") =>
    email.trim().toLowerCase();

const normalizeMobile = (mobile = "") =>
    mobile.trim();

const hashInvitationToken = (token) =>
    crypto.createHash("sha256").update(token).digest("hex");

const createInvitation = async (req, res, next) => {
    try {
        const { householdId } = req.params;

        let {
            recipientEmail = "",
            recipientMobile = "",
            role,
            accessScope,
            personIds = [],
            linkPersonId = null,
        } = req.body;

        recipientEmail = normalizeEmail(recipientEmail);
        recipientMobile = normalizeMobile(recipientMobile);

        if (!recipientEmail && !recipientMobile) {
            return res.status(400).json({
                success: false,
                message: "Recipient email or mobile is required",
            });
        }

        const allowedRoles = [
            "ADMIN",
            "ASSET_MANAGER",
            "EDITOR",
            "VIEWER",
        ];

        if (!allowedRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: "Invalid invitation role",
            });
        }

        // An ADMIN cannot appoint another ADMIN.
        if (
            req.householdAccess.role === "ADMIN" &&
            !["ASSET_MANAGER", "EDITOR", "VIEWER"].includes(role)
        ) {
            return res.status(403).json({
                success: false,
                message: "You cannot grant this role",
            });
        }

        if (!["ALL_PEOPLE", "SELECTED_PEOPLE"].includes(accessScope)) {
            return res.status(400).json({
                success: false,
                message: "Invalid access scope",
            });
        }

        if (linkPersonId) {
            if (
                accessScope !== "SELECTED_PEOPLE" ||
                personIds.length !== 1 ||
                personIds[0].toString() !== linkPersonId.toString()
            ) {
                return res.status(400).json({
                    success: false,
                    message:
                        "A profile-linking invitation must target exactly the linked person",
                });
            }
        }

        if (accessScope === "ALL_PEOPLE") {
            personIds = [];
            linkPersonId = null;
        } else {
            if (!personIds.length) {
                return res.status(400).json({
                    success: false,
                    message: "Select at least one person",
                });
            }

            const validPeople = await Person.countDocuments({
                _id: { $in: personIds },
                householdId,
                status: "ACTIVE",
            });

            if (validPeople !== new Set(personIds.map(String)).size) {
                return res.status(400).json({
                    success: false,
                    message: "One or more selected people are invalid",
                });
            }

            if (linkPersonId) {
                const person = await Person.findOne({
                    _id: linkPersonId,
                    householdId,
                });

                if (!person) {
                    return res.status(404).json({
                        success: false,
                        message: "Person to link was not found",
                    });
                }

                if (person.linkedUserId) {
                    return res.status(409).json({
                        success: false,
                        message: "This person is already linked to a login",
                    });
                }
            }
        }

        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = hashInvitationToken(rawToken);

        const invitation = await HouseholdInvitation.create({
            householdId,
            recipientEmail,
            recipientMobile,
            role,
            accessScope,
            personIds,
            linkPersonId,
            tokenHash,
            invitedBy: req.user.id,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        const inviteUrl =
            `${process.env.FRONTEND_URL}/accept-invitation?token=${rawToken}`;

        // Send invitation notifications only when enabled in .env
        if (process.env.SEND_REAL_INVITES === "true") {
            const household = await Household.findById(householdId);

            const inviter = await User.findById(req.user.id)
                .select("name");

            if (!household || !inviter) {
                invitation.status = "REVOKED";
                await invitation.save();

                throw new Error("Household or inviter not found");
            }

            try {
                const deliveries = [];

                // Send invitation to email
                if (recipientEmail) {
                    deliveries.push(
                        sendHouseholdInvitationEmail({
                            email: recipientEmail,
                            householdName: household.name,
                            inviterName: inviter.name,
                            inviteUrl,
                        })
                    );
                }

                // // Send invitation to mobile through SMS
                // if (recipientMobile) {
                //     deliveries.push(
                //         sendHouseholdInvitationSms({
                //             mobile: recipientMobile,
                //             householdName: household.name,
                //             inviteUrl,
                //         })
                //     );
                // }

                await Promise.all(deliveries);

            } catch (error) {
                invitation.status = "REVOKED";
                await invitation.save();

                throw error;
            }
        }

        const response = {
            invitationId: invitation._id,
            status: invitation.status,
            expiresAt: invitation.expiresAt,
        };

        // Expose the invitation URL only for local development.
        if (
            process.env.NODE_ENV !== "production" &&
            process.env.SEND_REAL_INVITES !== "true"
        ) {
            response.devInviteUrl = inviteUrl;
        }

        return res.status(201).json({
            success: true,
            message: "Invitation created",
            data: response,
        });
    } catch (error) {
        next(error);
    }
};


const acceptInvitation = async (req, res, next) => {
    const dbSession = await mongoose.startSession();

    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: "Invitation token is required",
            });
        }

        const user = await User.findById(req.user.id);

        if (!user || user.status !== "ACTIVE") {
            return res.status(401).json({
                success: false,
                message: "Active login required",
            });
        }

        const tokenHash = hashInvitationToken(token);

        const invitation = await HouseholdInvitation.findOne({
            tokenHash,
            status: "PENDING",
            expiresAt: { $gt: new Date() },
        });

        if (!invitation) {
            return res.status(400).json({
                success: false,
                message: "Invitation is invalid, expired or already used",
            });
        }

        // Every contact specified in the invitation must match
        // the authenticated account's verified contact details.
        if (
            invitation.recipientEmail &&
            (
                !user.emailVerified ||
                normalizeEmail(user.email) !== invitation.recipientEmail
            )
        ) {
            return res.status(403).json({
                success: false,
                message: "The invitation email does not match your verified account",
            });
        }

        if (
            invitation.recipientMobile &&
            (
                !user.mobileVerified ||
                normalizeMobile(user.mobile) !== invitation.recipientMobile
            )
        ) {
            return res.status(403).json({
                success: false,
                message: "The invitation mobile does not match your verified account",
            });
        }

        let membership;

        await dbSession.withTransaction(async () => {
            // Recheck inside the transaction to prevent double acceptance.
            const currentInvitation = await HouseholdInvitation.findOne({
                _id: invitation._id,
                status: "PENDING",
                expiresAt: { $gt: new Date() },
            }).session(dbSession);

            if (!currentInvitation) {
                const error = new Error("Invitation has already been used");
                error.statusCode = 409;
                throw error;
            }

            const existingMembership = await HouseholdMember.findOne({
                householdId: currentInvitation.householdId,
                userId: user._id,
            }).session(dbSession);

            if (existingMembership) {
                const error = new Error(
                    "You already have access to this household"
                );
                error.statusCode = 409;
                throw error;
            }

            // Link an existing family Person, when requested.
            if (currentInvitation.linkPersonId) {
                const person = await Person.findOne({
                    _id: currentInvitation.linkPersonId,
                    householdId: currentInvitation.householdId,
                }).session(dbSession);

                if (!person) {
                    const error = new Error("Person to link was not found");
                    error.statusCode = 404;
                    throw error;
                }

                if (
                    person.linkedUserId &&
                    person.linkedUserId.toString() !== user._id.toString()
                ) {
                    const error = new Error(
                        "This Person is already linked to another login"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                const anotherPerson = await Person.findOne({
                    householdId: currentInvitation.householdId,
                    linkedUserId: user._id,
                    _id: { $ne: person._id },
                }).session(dbSession);

                if (anotherPerson) {
                    const error = new Error(
                        "This login is already linked to another Person in this household"
                    );
                    error.statusCode = 409;
                    throw error;
                }

                person.linkedUserId = user._id;

                await person.save({ session: dbSession });
            }

            const createdMembers = await HouseholdMember.create(
                [
                    {
                        householdId: currentInvitation.householdId,
                        userId: user._id,
                        role: currentInvitation.role,
                        accessScope: currentInvitation.accessScope,
                        personIds: currentInvitation.personIds,
                        status: "ACTIVE",
                        grantedBy: currentInvitation.invitedBy,
                    },
                ],
                { session: dbSession }
            );

            membership = createdMembers[0];

            currentInvitation.status = "ACCEPTED";
            currentInvitation.acceptedBy = user._id;
            currentInvitation.acceptedAt = new Date();

            await currentInvitation.save({ session: dbSession });
        });

        return res.status(200).json({
            success: true,
            message: "Invitation accepted successfully",
            data: {
                householdId: membership.householdId,
                role: membership.role,
                accessScope: membership.accessScope,
                personIds: membership.personIds,
            },
        });
    } catch (error) {
        next(error);
    } finally {
        await dbSession.endSession();
    }
};

module.exports = {
    createInvitation,
    acceptInvitation,
};