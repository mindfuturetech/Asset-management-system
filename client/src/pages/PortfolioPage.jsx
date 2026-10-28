import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Coins, TrendingUp, Home, ArrowRight } from "lucide-react";
import useAuth from "../hooks/useAuth";
import useFamilyMembers from "../hooks/useFamilyMembers";
import useDocumentTitle from "../hooks/useDocumentTitle";
import {
    preciousMetalApi,
    totalPurchaseValue,
} from "../services/preciousMetal.service";
import "../styles/portfolio.css";

function formatINR(n) {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
    }).format(n || 0);
}

function Tile({ to, icon: Icon, title, subtitle, value, loading, accent }) {
    const body = (
        <div className={`ptile ptile--${accent}`}>
            <span className="ptile__icon">
                <Icon size={22} />
            </span>
            <div className="ptile__body">
                <h3>{title}</h3>
                <p>{subtitle}</p>
                {loading ? (
                    <span className="skeleton skeleton--line ptile__skeleton" />
                ) : (
                    <span className="ptile__value">{value}</span>
                )}
            </div>
            {to && <ArrowRight size={18} className="ptile__arrow" />}
        </div>
    );

    if (!to)
        return <div className="ptile-wrap ptile-wrap--soon">{body}</div>;

    return (
        <Link to={to} className="ptile-wrap">
            {body}
        </Link>
    );
}

export default function PortfolioPage() {
    useDocumentTitle("Portfolio");

    const { household } = useAuth();
    const householdId = household?._id ?? household?.id;
    const { familyMembers, loading: familyLoading } = useFamilyMembers(householdId);

    const [metalsValue, setMetalsValue] = useState(0);
    const [metalsLoading, setMetalsLoading] = useState(false);

    useEffect(() => {
        if (!familyMembers.length) {
            setMetalsValue(0);
            return;
        }
        let cancelled = false;
        setMetalsLoading(true);
        preciousMetalApi
            .getHouseholdMetals(familyMembers)
            .then((rows) => {
                if (!cancelled) setMetalsValue(totalPurchaseValue(rows));
            })
            .catch(() => {
                if (!cancelled) setMetalsValue(0);
            })
            .finally(() => {
                if (!cancelled) setMetalsLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [familyMembers]);

    const loading = familyLoading || metalsLoading;

    return (
        <div className="page">
            <header className="page__header">
                <div>
                    <h1>Portfolio</h1>
                    <p>Your household's assets, all in one place.</p>
                </div>
            </header>

            <section className="pgrid" aria-label="Asset categories">
                <Tile
                    to="/portfolio/precious-metals"
                    icon={Coins}
                    title="Precious Metals"
                    subtitle="Gold, silver & platinum"
                    value={formatINR(metalsValue)}
                    loading={loading}
                    accent="gold"
                />
                <Tile
                    to={null}
                    icon={TrendingUp}
                    title="Stocks"
                    subtitle="Coming soon"
                    value="—"
                    accent="stocks"
                />
                <Tile
                    to={null}
                    icon={Home}
                    title="Real Estate"
                    subtitle="Coming soon"
                    value="—"
                    accent="estate"
                />
            </section>
        </div>
    );
}