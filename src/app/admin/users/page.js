'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

const avatarColors = ['#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#6b7280'];

export default function AdminUsersPage() {
  const supabase = createClient();
  const [profiles, setProfiles] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' | 'edit'
  const [selectedUser, setSelectedUser] = useState(null);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('member');
  const [maxTasks, setMaxTasks] = useState(6);

  async function load() {
    setLoading(true);
    const [profilesRes, tasksRes] = await Promise.all([
      supabase.from('profiles').select('*').order('full_name'),
      supabase.from('tasks').select('id, assignee_id, status'),
    ]);
    setProfiles(profilesRes.data || []);
    setTasks(tasksRes.data || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function resetForm() {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('member');
    setMaxTasks(6);
    setFormError('');
  }

  function handleOpenAdd() {
    resetForm();
    setModalMode('add');
    setShowModal(true);
  }

  function handleOpenEdit(user) {
    resetForm();
    setModalMode('edit');
    setSelectedUser(user);
    setFullName(user.full_name);
    setEmail(user.email);
    setRole(user.role);
    setMaxTasks(user.max_tasks);
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);

    const initial = fullName.charAt(0).toUpperCase();
    const avatarColor = avatarColors[Math.floor(Math.random() * avatarColors.length)];

    if (modalMode === 'add') {
      try {
        const res = await fetch('/api/admin/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            full_name: fullName,
            initial,
            role,
            max_tasks: parseInt(maxTasks, 10),
            avatar_color: avatarColor,
          }),
        });
        const data = await res.json();
        if (data.error) {
          setFormError(data.error);
        } else {
          setShowModal(false);
          load();
        }
      } catch (err) {
        setFormError('Failed to create user. Please try again.');
      }
    } else {
      // Edit mode (profiles update only)
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName,
          initial,
          role,
          max_tasks: parseInt(maxTasks, 10),
        })
        .eq('id', selectedUser.id);

      if (error) {
        setFormError(error.message);
      } else {
        setShowModal(false);
        load();
      }
    }
    setSubmitting(false);
  }

  async function handleDelete(userId) {
    if (!confirm('Are you sure you want to remove this team member? All their tasks will be unassigned.')) {
      return;
    }
    
    setLoading(true);
    try {
      const res = await fetch('/api/admin/delete-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        load();
      }
    } catch (err) {
      alert('Failed to delete user.');
    }
    setLoading(false);
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div className="admin-title" style={{ marginBottom: 0 }}>Team Members</div>
        <button className="admin-btn-add" onClick={handleOpenAdd}>
          Add Team Member
        </button>
      </div>

      {loading ? (
        <div style={{ color: '#6b7280', fontSize: 14 }}>Loading...</div>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Max Tasks</th>
              <th>Active Tasks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => {
              const activeCount = tasks.filter((t) => t.assignee_id === p.id && t.status !== 'done').length;
              return (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div className="avatar avatar-sm" style={{ background: p.avatar_color || '#6366f1' }}>
                        {p.initial}
                      </div>
                      {p.full_name}
                    </div>
                  </td>
                  <td>{p.email}</td>
                  <td>
                    <span className={`role-badge role-badge-${p.role}`}>
                      {p.role}
                    </span>
                  </td>
                  <td>{p.max_tasks}</td>
                  <td>{activeCount}</td>
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
              {modalMode === 'add' ? 'Add Team Member' : 'Edit Team Member'}
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Rohan Sharma"
                  required
                />
              </div>

              {modalMode === 'add' && (
                <>
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      className="form-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. rohan@company.com"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      className="form-input"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  className="form-select"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Max Tasks Capacity</label>
                <input
                  className="form-input"
                  type="number"
                  min={1}
                  max={20}
                  value={maxTasks}
                  onChange={(e) => setMaxTasks(e.target.value)}
                  required
                />
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
