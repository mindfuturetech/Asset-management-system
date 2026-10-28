import { api } from "./api"; // <-- adjust import to your existing axios/fetch wrapper

const BASE = "/people";

export const preciousMetalApi = {
  // GET /people/:personId/precious-metals
  getAll: async (personId) => {
    const { data } = await api.get(`${BASE}/${personId}/precious-metals`);
    return data.data;
  },

  // POST /people/:personId/precious-metals
  create: async (personId, payload) => {
    const { data } = await api.post(
      `${BASE}/${personId}/precious-metals`,
      payload,
    );
    return data.data;
  },

  // PUT /people/:personId/precious-metals/:metalId
  update: async (personId, metalId, payload) => {
    const { data } = await api.put(
      `${BASE}/${personId}/precious-metals/${metalId}`,
      payload,
    );
    return data.data;
  },

  // DELETE /people/:personId/precious-metals/:metalId
  remove: async (personId, metalId) => {
    const { data } = await api.delete(
      `${BASE}/${personId}/precious-metals/${metalId}`,
    );
    return data;
  },

  // Household-wide aggregation: fetch every person's metals in parallel.
  // Returns flattened array with personId + personName attached.
  getHouseholdMetals: async (people) => {
    const results = await Promise.all(
      people.map(async (p) => {
        try {
          const metals = await preciousMetalApi.getAll(p._id);
          return metals.map((m) => ({
            ...m,
            personId: m.personId ?? p._id,
            personName: p.name,
          }));
        } catch {
          return []; // person inaccessible — skip silently
        }
      }),
    );
    return results.flat();
  },
};

// Weight normalization for total math
export const toGrams = (weight, unit) =>
  unit === "KILOGRAM" ? Number(weight) * 1000 : Number(weight);

export const totalPurchaseValue = (metals) =>
  metals.reduce((sum, m) => sum + Number(m.purchasePrice || 0), 0);

export const totalWeightGrams = (metals) =>
  metals.reduce((sum, m) => sum + toGrams(m.weight, m.weightUnit), 0);
