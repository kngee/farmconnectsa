import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../firebase.js';
import { ROLES, ROLE_LABELS } from '../../roles.js';
import './UserManagement.css';

export default function UserManagement() {
  const { user: currentUser } = useOutletContext();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      try {
        const snapshot = await getDocs(collection(db, 'users'));
        const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        // Newest first; docs with pending serverTimestamp sort last
        data.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        setUsers(data);
      } catch (err) {
        console.error('Error fetching users:', err);
        setError('Could not load users. Check your Firestore connection and security rules.');
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleRoleChange = async (row, newRole) => {
    if (row.id === currentUser.uid) return;
    if (!window.confirm(`Change ${row.email} to ${ROLE_LABELS[newRole]}?`)) return;

    setSavingId(row.id);
    setError('');
    try {
      await updateDoc(doc(db, 'users', row.id), { role: newRole });
      setUsers((prev) => prev.map((u) => u.id === row.id ? { ...u, role: newRole } : u));
    } catch (err) {
      console.error('Error updating role:', err);
      setError(`Could not update the role for ${row.email}.`);
    } finally {
      setSavingId(null);
    }
  };

  const formatJoined = (createdAt) =>
    createdAt?.toDate?.().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' }) || '—';

  return (
    <main className="dashboard-main">
      <h1 className="dashboard-title">User Management</h1>
      <p className="dashboard-subtitle">
        Assign platform roles. Changes take effect the next time the user signs in or refreshes.
      </p>

      {loading && <div className="dashboard-state">Loading users…</div>}
      {!loading && error && <div className="dashboard-state dashboard-state--error">{error}</div>}

      {!loading && !error && (
        users.length === 0 ? (
          <div className="dashboard-state">No users yet — accounts appear here after their first sign-in.</div>
        ) : (
          <div className="user-table-wrapper">
            <table className="user-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((row) => {
                  const isSelf = row.id === currentUser.uid;
                  return (
                    <tr key={row.id}>
                      <td className="user-table__email">
                        {row.email}
                        {isSelf && <span className="user-table__you">(you)</span>}
                      </td>
                      <td>{row.displayName || '—'}</td>
                      <td>
                        <select
                          className="user-table__role"
                          value={row.role || ROLES.FARMER}
                          onChange={(e) => handleRoleChange(row, e.target.value)}
                          disabled={isSelf || savingId === row.id}
                          title={isSelf ? 'You cannot change your own role.' : undefined}
                        >
                          {Object.values(ROLES).map((r) => (
                            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                          ))}
                        </select>
                        {savingId === row.id && <span className="user-table__saving">Saving…</span>}
                      </td>
                      <td className="user-table__joined">{formatJoined(row.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </main>
  );
}
