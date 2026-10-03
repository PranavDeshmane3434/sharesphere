import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actingOnId, setActingOnId] = useState(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError('');
    setReports([]); // clear stale data 
    try {
      const { data } = await api.get('/admin/reports', {
        params: statusFilter ? { status: statusFilter } : {},
      });
      setReports(data);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  async function handleResolve(reportId, decision) {
    setActingOnId(reportId);
    setError('');
    try {
      await api.post(`/admin/reports/${reportId}/resolve`, { decision });
      fetchReports(); // refresh the list — resolved report drops out of PENDING view
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Action failed');
    } finally {
      setActingOnId(null);
    }
  }

  return (
    <div>
      <h2>Admin — Reports</h2>

      <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
        <option value="PENDING">Pending</option>
        <option value="DISMISSED">Dismissed</option>
        <option value="ACTION_TAKEN">Action Taken</option>
        <option value="">All</option>
      </select>

      {loading && <p>Loading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {!loading && reports.length === 0 && <p>No reports in this view.</p>}

      <ul>
        {reports.map(r => (
          <li key={r.id}>
            <p><strong>Resource:</strong> {r.resource?.title} ({r.resource?.status})</p>
            <p><strong>Reason:</strong> {r.reason}</p>
            <p><strong>Reported by:</strong> {r.reporter?.email}</p>
            <p><strong>Status:</strong> {r.status}</p>
            {r.reviewedBy && <p><strong>Reviewed:</strong> {new Date(r.reviewedAt).toLocaleString()}</p>}

            {r.status === 'PENDING' && (
              <div>
                <button disabled={actingOnId === r.id} onClick={() => handleResolve(r.id, 'DISMISS')}>
                  Dismiss
                </button>
                <button disabled={actingOnId === r.id} onClick={() => handleResolve(r.id, 'HIDE')}>
                  Hide Resource
                </button>
                <button disabled={actingOnId === r.id} onClick={() => handleResolve(r.id, 'REMOVE')}>
                  Remove Resource
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}