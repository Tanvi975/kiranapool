
export default function StatCard({
  label,
  value,
  note,
  icon,
  tone = 'violet',
}) {
  return (
    <article className="stat-card">
      <div className="stat-top">
        <span className="stat-label">{label}</span>

        <span
          className={`stat-icon ${tone}`}
          aria-hidden="true"
        >
          {icon}
        </span>
      </div>

      <div className="stat-value" aria-live="polite">
        {value}
      </div>

      <div className="stat-note">{note}</div>
    </article>
  );
}
