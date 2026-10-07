import { Link } from "react-router-dom";
import { Banknote, Home, ShieldCheck, Users } from "lucide-react";
import Avatar from "../components/ui/Avatar";
import EmptyState from "../components/ui/EmptyState";
import useAuth from "../hooks/useAuth";
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

export default function DashboardPage() {
  useDocumentTitle("Dashboard");
  const { user, household, members, householdLoading } = useAuth();

  const firstName = user?.name?.split(" ")[0] || "there";
  const loading = householdLoading && !household;
  const myRole = members.find((m) => m.userId?._id === user?._id)?.role;

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
        <Stat icon={Home} label="Household" value={household?.name} loading={loading} />
        <Stat icon={Users} label="People" value={members.length} loading={loading} />
        <Stat icon={Banknote} label="Base currency" value={household?.baseCurrency} loading={loading} />
        <Stat icon={ShieldCheck} label="Your role" value={titleCase(myRole)} loading={loading} />
      </section>

      <section className="panel">
        <div className="panel__header">
          <h2>Household members</h2>
          <Link to="/people" className="panel__link">
            Manage people
          </Link>
        </div>

        {loading ? (
          <ul className="list">
            {[0, 1, 2].map((i) => (
              <li key={i} className="list__row">
                <span className="skeleton skeleton--avatar" />
                <span className="skeleton skeleton--line" />
              </li>
            ))}
          </ul>
        ) : members.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No members yet"
            description="Add the people whose assets you manage."
          />
        ) : (
          <ul className="list">
            {members.map((member) => {
              const person = member.personId;
              const name = person?.name || member.userId?.name || "Unnamed";
              const isMe = member.userId?._id === user?._id;
              return (
                <li key={member._id} className="list__row">
                  <Avatar name={name} size={42} />
                  <div className="list__main">
                    <strong>
                      {name}
                      {isMe && <span className="tag tag--you">You</span>}
                    </strong>
                    <span>
                      {person?.relationship && person.relationship !== "SELF"
                        ? titleCase(person.relationship)
                        : member.userId?.email || "Account holder"}
                    </span>
                  </div>
                  <span className="tag">{titleCase(member.role)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {household && (
        <p className="page__note">
          Household created on {formatDate(household.createdAt)}.
        </p>
      )}
    </div>
  );
}
