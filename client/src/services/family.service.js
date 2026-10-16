import { api } from "./api";

/*
 * Family members in the signed-in user's household (protected).
 * Every call is scoped to a household:
 *
 *   GET  /:householdId/people   -> Person[]
 *   POST /:householdId/people   { name, relationship?, dateOfBirth? } -> Person
 *
 * (Endpoints are unchanged on purpose; only the naming on the frontend is "family".)
 */

export const getFamilyMembers = async (householdId) => {
  const { data } = await api.get(`/people/${householdId}/people`);
  return data.data;
};

export const createFamilyMember = async (
  householdId,
  { name, relationship, dateOfBirth },
) => {
  const { data } = await api.post(`/people/${householdId}/people`, {
    name,
    relationship: relationship || "",
    dateOfBirth: dateOfBirth || null,
  });
  return data.data;
};
