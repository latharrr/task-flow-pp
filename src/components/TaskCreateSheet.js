'use client';
import { useRef, useState } from 'react';
import { todayStr, addDays, PRIORITY_OPTIONS } from '@/lib/utils';

const DUE_OPTIONS = [
  { key: 'today', label: 'Today' },
  { key: 'tomorrow', label: 'Tomorrow' },
  { key: 'week', label: 'This Week' },
];

function resolveDueDate(key) {
  const today = todayStr();
  if (key === 'tomorrow') return addDays(today, 1);
  if (key === 'week') return addDays(today, 3);
  return today;
}

let rowSeq = 0;
function makeRow(name = '') {
  rowSeq += 1;
  return { key: 'row-' + rowSeq, name, priority: 'medium', due: 'today' };
}

export default function TaskCreateSheet({ initialName, onClose, onCreate }) {
  const [rows, setRows] = useState(() => [makeRow(initialName || '')]);
  const [saving, setSaving] = useState(false);
  const inputRefs = useRef({});

  function updateRow(key, patch) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function addRow() {
    const row = makeRow();
    setRows((prev) => [...prev, row]);
    setTimeout(() => inputRefs.current[row.key]?.focus(), 50);
  }

  function removeRow(key) {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  }

  const validRows = rows.filter((r) => r.name.trim().length > 0);

  async function handleSubmit() {
    if (validRows.length === 0 || saving) return;
    setSaving(true);
    await onCreate(
      validRows.map((r) => ({
        name: r.name.trim(),
        priority: r.priority,
        date: resolveDueDate(r.due),
        deadline: DUE_OPTIONS.find((d) => d.key === r.due)?.label || 'Today',
      }))
    );
    setSaving(false);
  }

  return (
    <div className="sheet-overlay sheet-overlay-picker" onClick={onClose}>
      <div className="bottom-sheet task-create-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" />
        <div className="picker-title" style={{ marginBottom: 2 }}>Add tasks for today</div>
        <div className="task-create-subtitle">
          Add a few at once, each with its own priority and due date.
        </div>

        <div className="task-create-rows">
          {rows.map((row, i) => (
            <div key={row.key} className="task-create-row">
              <div className="task-create-row-top">
                <span className="task-create-index">{i + 1}</span>
                <input
                  ref={(el) => { inputRefs.current[row.key] = el; }}
                  className="task-create-input"
                  placeholder="Task name"
                  value={row.name}
                  onChange={(e) => updateRow(row.key, { name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (i === rows.length - 1) addRow();
                    }
                  }}
                  autoFocus={i === 0}
                />
                {rows.length > 1 && (
                  <button
                    type="button"
                    className="task-create-remove"
                    onClick={() => removeRow(row.key)}
                    aria-label="Remove task"
                  >
                    ×
                  </button>
                )}
              </div>
              <div className="task-create-options">
                {PRIORITY_OPTIONS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    className={`task-create-chip${row.priority === p ? ' task-create-chip-active' : ''}`}
                    onClick={() => updateRow(row.key, { priority: p })}
                  >
                    {p}
                  </button>
                ))}
                <span className="task-create-divider" />
                {DUE_OPTIONS.map((d) => (
                  <button
                    key={d.key}
                    type="button"
                    className={`task-create-chip${row.due === d.key ? ' task-create-chip-active' : ''}`}
                    onClick={() => updateRow(row.key, { due: d.key })}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="task-create-add-row" onClick={addRow}>
          + Add another task
        </button>

        <button
          type="button"
          className="btn-primary"
          style={{ marginTop: 14 }}
          disabled={validRows.length === 0 || saving}
          onClick={handleSubmit}
        >
          {saving
            ? 'Creating…'
            : `Create ${validRows.length || ''} Task${validRows.length === 1 ? '' : 's'}`}
        </button>
      </div>
    </div>
  );
}
