import Spinner from "./Spinner";

export default function Button({
  variant = "primary", // primary | secondary | ghost
  size = "md", // md | sm
  loading = false,
  fullWidth = false,
  icon: Icon,
  children,
  className = "",
  disabled,
  type = "button",
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    size === "sm" ? "btn--sm" : "",
    fullWidth ? "btn--full" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner size={16} label="Please wait" /> : Icon && <Icon size={17} />}
      <span>{children}</span>
    </button>
  );
}
