
const statusConfig = {
  pending: {
    label: 'Pending',
    className: 'status-pending',
  },
  planned: {
    label: 'Planned',
    className: 'status-planned',
  },
  picked: {
    label: 'Picked up',
    className: 'status-picked',
  },
  'picked up': {
    label: 'Picked up',
    className: 'status-picked-up',
  },
  delivered: {
    label: 'Delivered',
    className: 'status-delivered',
  },
};

export default function StatusBadge({ status = 'pending' }) {
  const normalized = String(status || 'pending')
    .trim()
    .toLowerCase()
    .replaceAll('_', '-');

  const lookupKey = normalized.replaceAll('-', ' ');
  const config = statusConfig[normalized] || statusConfig[lookupKey];

  const fallbackLabel = normalized
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map(
      (word) => word.charAt(0).toUpperCase() + word.slice(1)
    )
    .join(' ') || 'Unknown';

  return (
    <span
      className={`status-badge ${config?.className || ''}`}
      title={config?.label || fallbackLabel}
    >
      {config?.label || fallbackLabel}
    </span>
  );
}
