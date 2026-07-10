'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const projectPresets = ['#8b5cf6', '#6366f1', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6'];

export default function AdminProjectsPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedProject, setSelectedProject] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [color, setColor] = useState('#8b5cf6');

  async function load() {
    setLoading(true);
    const [projectsRes, tasksRes] = await Promise.all([
      supabase.from('projects').select('*').order('name'),
      supabase.from('tasks').select('id, project_id'),
    ]);
    setProjects(projectsRes.data || []);
    setTasks(tasksRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setName('');
    setColor('#8b5cf6');
    setFormError('');
  }

  function handleOpenAdd() {
    resetForm();
    setModalMode('add');
    setShowModal(true);
  }

  function handleOpenEdit(project) {
    resetForm();
    setModalMode('edit');
    setSelectedProject(project);
    setName(project.name);
    setColor(project.color);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (modalMode === 'add') {
      const { error } = await supabase
        .from('projects')
        .insert({
          name,
          color,
          created_by: user?.id,
        });

      if (error) {
        setFormError(error.message);
      } else {
        setShowModal(false);
        load();
      }
    } else {
      const { error } = await supabase
        .from('projects')
        .update({ name, color })
        .eq('id', selectedProject.id);

      if (error) {
        setFormError(error.message);
      } else {
        setShowModal(false);
        load();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(projectId) {
    if (!confirm('Are you sure you want to delete this project? Task associations will be cleared.')) {
      return;
    }

    setLoading(true);
    // Unassign tasks from this project (in case cascade isn't set up, although our schema says ON DELETE SET NULL)
    await supabase.from('tasks').update({ project_id: null }).eq('project_id', projectId);

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (error) {
      alert(error.message);
    } else {
      load();
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="admin-title" style={{ marginBottom: 0 }}>Projects</div>
        <button className="admin-btn-add" onClick={handleOpenAdd}>
          Add Project
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Color</th>
              <th>Name</th>
              <th>Tasks Count</th>
              <th>Created Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const taskCount = tasks.filter((t) => t.project_id === p.id).length;
              return (
                <tr key={p.id}>
                  <td>
                    <div
                      className="color-swatch"
                      style={{ background: p.color }}
                    />
                  </td>
                  <td>{p.name}</td>
                  <td>{taskCount}</td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="admin-btn admin-btn-edit"
                        onClick={() => handleOpenEdit(p)}
                      >
                        Edit
                      </button>
                      <button
                        className="admin-btn admin-btn-delete"
                        onClick={() => handleDelete(p.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-title">
              {modalMode === 'add' ? 'Add Project' : 'Edit Project'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Project Name</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Marketing Q3"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Color Preset</label>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                  {projectPresets.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="color-swatch"
                      style={{
                        background: c,
                        width: 24,
                        height: 24,
                        border: color === c ? '2px solid #111827' : '1px solid #e5e7eb',
                        transform: color === c ? 'scale(1.1)' : 'none',
                        transition: 'transform 200ms ease',
                      }}
                      onClick={() => setColor(c)}
                    />
                  ))}
                </div>
              </div>

              {formError && <div className="form-error">{formError}</div>}

              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-btn-cancel"
                  onClick={() => setShowModal(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="modal-btn-submit"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
