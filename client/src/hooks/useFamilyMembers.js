import { useCallback, useEffect, useState } from "react";
import { getFamilyMembers } from "../services/family.service";
import { getErrorMessage } from "../services/api";

/*
 * Loads the Person records (family members) of a household.
 * Same data the Family page shows, so counts always agree.
 *
 *   const { familyMembers, loading, error, reload } = useFamilyMembers(householdId);
 */
export default function useFamilyMembers(householdId) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(Boolean(householdId));
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!householdId) {
      setFamilyMembers([]);
      setLoading(false);
      return undefined;
    }

    let active = true;
    setLoading(true);
    setError("");

    getFamilyMembers(householdId)
      .then((data) => {
        if (active) setFamilyMembers(data);
      })
      .catch((err) => {
        if (active)
          setError(getErrorMessage(err, "Couldn't load family members."));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [householdId, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  return { familyMembers, loading, error, reload };
}
