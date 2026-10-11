import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { StarsDisplay } from '../components/Stars';
import { CATEGORY_LABEL, formatSize, formatDate } from '../constants';

export default function Saved() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingId, setRemovingId] = useState(null);

  const fetchSaved = useCallback(async () => {
    setError('');
    try {
      const { data } = await api.get('/resources/saved', { params: { page, limit } });
      // Removed the last item on this page: step back one page
      if (data.results.length === 0 && page > 1) {
        setPage(page - 1);
        return;
      }
      setItems(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load saved resources');
    } finally {
      setLoading(false);
    }
  }, [page, limit]);

  useEffect(() => { fetchSaved(); }, [fetchSaved]);

  async function handleRemove(resourceId) {
    setError('');
    setRemovingId(resourceId);
    try {
      await api.delete(`/resources/${resourceId}/save`);
      await fetchSaved();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Could not remove this resource');
    } finally {
      setRemovingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="browse-header">
        <h2 style={{ margin: 0 }}>Saved resources</h2>
      </div>

      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}

      {!loading && items.length === 0 && (
        <p className="empty-state">
          You haven't saved anything yet. Use Save on a resource in{' '}
          <Link to="/browse">Browse</Link> and it will show up here.
        </p>
      )}

      <ul className="item-list">
        {items.map(r => {
          const academicLine = [
            r.subject,
            r.semester && `Semester ${r.semester}`,
            r.unit && `Unit ${r.unit}`,
            r.academic_year,
          ].filter(Boolean).join(' · ');
          const fileLine = [
            r.category && CATEGORY_LABEL[r.category],
            r.type,
            formatSize(r.size_bytes),
          ].filter(Boolean).join(' · ');

          return (
            <li className="item-row" key={r.id}>
              <div className="item-title-row">
                <Link to={`/resources/${r.id}`} className="item-title-link">{r.title}</Link>
              </div>
              {academicLine && <p className="item-meta">{academicLine}</p>}
              <p className="item-meta">{fileLine}</p>
              <p className="item-stats">{r.like_count} likes · {r.download_count} downloads</p>
              <p className="item-stats item-rating">
                {r.rating_count > 0 ? (
                  <>
                    <StarsDisplay value={r.rating_avg} />
                    <span>
                      {r.rating_avg.toFixed(1)} · {r.rating_count} {r.rating_count === 1 ? 'rating' : 'ratings'}
                    </span>
                  </>
                ) : (
                  <span>No ratings yet</span>
                )}
              </p>
              <p className="saved-meta">Saved {formatDate(r.saved_at)}</p>

              <div className="item-actions">
                <Link to={`/resources/${r.id}`} className="btn btn-primary">View details</Link>
                <button
                  className="btn"
                  onClick={() => handleRemove(r.id)}
                  disabled={removingId === r.id}
                >
                  {removingId === r.id ? 'Removing...' : 'Remove'}
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {total > limit && (
        <div className="pagination">
          <button className="btn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span>Page {page} of {totalPages} ({total} total)</span>
          <button className="btn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}