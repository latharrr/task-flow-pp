'use client';
import { STATUS_META } from '@/lib/utils';

export default function StatusPicker({ onSelect, onClose }) {
  const statuses = ['blocked', 'inprogress', 'todo', 'done'];

  return (
    <div className="sheet-overlay sheet-overlay-picker" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="picker-title">Change status</div>
        {statuses.map((key) => (
          <div
            key={key}
            className="picker-option"
            onClick={() => onSelect(key)}
          >
            <span
              className="picker-option-dot"
              style={{ background: STATUS_META[key].dot }}
            />
            <span className="picker-option-label">
              {STATUS_META[key].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
