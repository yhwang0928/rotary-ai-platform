interface StatCardProps {
  label: string;
  value: number | string;
  tone?: "neutral" | "warn" | "danger" | "success";
}

export function StatCard({ label, value, tone = "neutral" }: StatCardProps) {
  return (
    <section className={`stat-card stat-card--${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </section>
  );
}
