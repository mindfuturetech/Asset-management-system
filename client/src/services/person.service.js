import { api } from "./api";

/*
 * People in the signed-in user's household (protected).
 *
 *   GET  /people   -> Person[]
 *   POST /people   { name, relationship?, dateOfBirth? } -> Person
 */

export const getPeople = async () => {
  const { data } = await api.get("/people");
  return data.data;
};

export const createPerson = async ({ name, relationship, dateOfBirth }) => {
  const { data } = await api.post("/people", {
    name,
    relationship: relationship || "",
    dateOfBirth: dateOfBirth || null,
  });
  return data.data;
};
