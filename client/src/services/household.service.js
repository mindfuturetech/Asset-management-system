import { api } from "./api";

/*
 * GET /households/me  (protected)
 * -> { household, members }
 *    members[]: { _id, role, personId: Person, userId: { _id, name, email, mobile, status } | null }
 */
export const getMyHousehold = async () => {
  const { data } = await api.get("/households/me");
  return data.data;
};
