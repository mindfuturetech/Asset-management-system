import { Link } from "react-router-dom";
import { Banknote, Home, ShieldCheck, Users } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import Alert from "../components/ui/Alert";
import useAuth from "../hooks/useAuth";
import useFamilyMembers from "../hooks/useFamilyMembers";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { formatDate, titleCase } from "../utils/validators";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function Stat({ icon: Icon, label, value, loading }) {
  return (
    <div className="stat">
      <span className="stat__icon">
        <Icon size={20} />
      </span>
      <div>
        <p className="stat__label">{label}</p>
        {loading ? (
          <span className="skeleton skeleton--stat" />
        ) : (
          <p className="stat__value">{value}</p>
        )}
      </div>
    </div>
  );
}

// personId can arrive populated ({ _id, ... }) or as a bare id string.
// const idOf = (ref) => String(ref?._id ?? ref ?? "");

export default function DashboardPage() {
  useDocumentTitle("Dashboard");

  // `members` here = household ACCESS records (accounts with a role), not people.
  const { user, household, members, householdLoading } = useAuth();
  const householdId = household?._id ?? household?.id;

  // Person records = the family members, same source as the Family page.
  const {
    familyMembers,
    loading: familyLoading,
    error: familyError,
  } = useFamilyMembers(householdId);

  const firstName = user?.name?.split(" ")[0] || "there";
  const householdBusy = householdLoading && !household;
  const loading = householdBusy || familyLoading;

  const myRole = members.find((m) => m.userId?._id === user?._id)?.role;

  // personId -> access record, so each family member can show their role / login.
  // const accessByPerson = new Map(members.map((m) => [idOf(m.personId), m]));

  return (
    <div className="page">
      <header className="page__header">
        <div>
          <h1>
            {greeting()}, {firstName}
          </h1>
          <p>Here's your household at a glance.</p>
        </div>
      </header>

      <section className="stats" aria-label="Summary">
        <Stat icon={Home} label="Household" value={household?.name} loading={householdBusy} />
        <Stat
          icon={Users}
          label="Family members"
          value={familyError ? "—" : familyMembers.length}
          loading={loading}
        />
        <Stat icon={Banknote} label="Base currency" value={household?.baseCurrency} loading={householdBusy} />
        <Stat icon={ShieldCheck} label="Your role" value={titleCase(myRole)} loading={householdBusy} />
      </section>

      {/* <section className="panel">
        <div className="panel__header">
          <h2>Family members</h2>
          <Link to="/people" className="panel__link">
            Manage Family
          </Link>
        </div>

        {familyError && <Alert type="error">{familyError}</Alert>}

        {loading ? (
          <ul className="list">
            {[0, 1, 2].map((i) => (
              <li key={i} className="list__row">
                <span className="skeleton skeleton--avatar" />
                <span className="skeleton skeleton--line" />
              </li>
            ))}
          </ul>
        ) : familyMembers.length === 0 && !familyError ? (
          <EmptyState
            icon={Users}
            title="No family members yet"
            description="Add the people whose assets you manage."
          />
        ) : (
          <ul className="list">
            {familyMembers.map((person) => {
              const access = accessByPerson.get(String(person._id));
              const isMe =
                person.relationship === "SELF" ||
                (access?.userId?._id && access.userId._id === user?._id) ||
                (person.linkedUserId && String(person.linkedUserId) === String(user?._id));

              return (
                <li key={person._id} className="list__row">
                  <Avatar name={person.name} size={42} />
                  <div className="list__main">
                    <strong>
                      {person.name}
                      {isMe && <span className="tag tag--you">You</span>}
                    </strong>
                    <span>
                      {person.relationship && person.relationship !== "SELF"
                        ? titleCase(person.relationship)
                        : access?.userId?.email || "Account holder"}
                    </span>
                  </div>
                  <span className="tag">
                    {access ? titleCase(access.role) : "No login"}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section> */}

      {household && (
        <p className="page__note">
          Household created on {formatDate(household.createdAt)}.
        </p>
      )}
    </div>
  );
}