interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "neutral" | "warn" | "danger" | "success";
  onClick?: () => void;
}

export function StatCard({ label, value, tone = "neutral", onClick }: StatCardProps) {
  return (
    <section
      className={`stat-card stat-card--${tone}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      style={onClick ? { cursor: "pointer" } : undefined}
      title={onClick ? "點選查看詳情" : undefined}
    >
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
