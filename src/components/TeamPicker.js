'use client';

export default function TeamPicker({ title, profiles, onSelect, onClose }) {
  return (
    <div className="sheet-overlay sheet-overlay-picker" onClick={onClose}>
      <div className="bottom-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="picker-title">{title || 'Select team member'}</div>
        {profiles.map((m) => (
          <div
            key={m.id}
            className="picker-option"
            onClick={() => onSelect(m)}
          >
            <div
              className="avatar"
              style={{ background: m.avatar_color || '#6366f1' }}
            >
              {m.initial}
            </div>
            <span className="picker-option-label">{m.full_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
