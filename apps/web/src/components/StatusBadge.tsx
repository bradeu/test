export function StatusBadge({ status }: { status: "up" | "down" | "unknown" }) {
  const label = status === "up" ? "UP" : status === "down" ? "DOWN" : "PENDING";
  return <span className={`badge badge-${status}`}>{label}</span>;
}
