import { getInitials } from "../../utils/validators";

export default function Avatar({ name, size = 36 }) {
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {getInitials(name)}
    </span>
  );
}
