import { CircleAlert, Info } from "lucide-react";

export default function Alert({ type = "error", children }) {
  if (!children) return null;
  const Icon = type === "error" ? CircleAlert : Info;

  return (
    <div
      className={`alert alert--${type}`}
      role={type === "error" ? "alert" : "status"}
    >
      <Icon size={18} aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}
