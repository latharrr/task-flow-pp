export default function EmptyState({ icon, title, actionLabel, onAction }) {
  return (
    <div className="empty-state">
      {icon && <div style={{ marginBottom: 14 }}>{icon}</div>}
      <div className="empty-state-title">{title}</div>
      {actionLabel && (
        <button className="empty-state-btn" onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
}
