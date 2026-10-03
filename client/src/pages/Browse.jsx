
import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALLOWED_TYPES = ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'];

function formatSize(bytes) {
  const n = Number(bytes);

  if (n < 1024) {
    return `${n} B`;
  }

  if (n < 1024 * 1024) {
    return `${(n / 1024).toFixed(1)} KB`;
  }

  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Browse() {
  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [q, setQ] = useState('');
  const [type, setType] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState('');

  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState('');
  const [actionError, setActionError] = useState('');

  const { user, refreshUser } = useAuth();

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const params = {
        page,
        limit,
      };

      if (q) {
        params.q = q;
      }

      if (type) {
        params.type = type;
      }

      const { data } = await api.get('/resources', { params });

      setResources(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
        'Failed to load resources'
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, type]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    fetchResources();
  }

  async function handleDownload(resourceId, title) {
    setDownloadError('');
    setDownloadingId(resourceId);

    try {
      const { data } = await api.post(
        `/resources/${resourceId}/download`
      );

      // Fetch the actual file from the signed B2 URL.
      const fileResponse = await fetch(data.downloadUrl);

      if (!fileResponse.ok) {
        throw new Error('Failed to fetch file from storage');
      }

      const blob = await fileResponse.blob();

      // Create a temporary browser URL so we download
      // the file instead of navigating to the B2 domain.
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = title || 'download';

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(blobUrl);

      // Refresh the displayed credit balance.
      await refreshUser();
    } catch (err) {
      if (err.response?.status === 402) {
        setDownloadError(
          'Not enough credits to download this resource.'
        );
      } else if (err.response?.status === 404) {
        setDownloadError(
          'This resource is no longer available.'
        );
      } else {
        setDownloadError(
          err.response?.data?.error?.message ||
          err.message ||
          'Download failed'
        );
      }
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleToggleLike(resource) {
    setActionError('');

    try {
      if (resource.liked_by_me) {
        await api.delete(`/resources/${resource.id}/like`);
      } else {
        await api.put(`/resources/${resource.id}/like`);
      }

      // Refresh the count and liked state from the backend.
      await fetchResources();
    } catch (err) {
      setActionError(
        err.response?.data?.error?.message ||
        'Action failed'
      );
    }
  }

  async function handleSubmitReport(resourceId) {
    setActionError('');

    try {
      await api.post(`/resources/${resourceId}/report`, {
        reason: reportReason.trim(),
      });

      setReportingId(null);
      setReportReason('');

      await fetchResources();
    } catch (err) {
      if (err.response?.status === 409) {
        setActionError(
          'You already reported this resource.'
        );
      } else {
        setActionError(
          err.response?.data?.error?.message ||
          'Report failed'
        );
      }
    }
  }

  const totalPages = Math.max(
    1,
    Math.ceil(total / limit)
  );

  return (
    <div>
      <h2>Browse Resources</h2>

      {user && (
        <p>
          Your credits: {user.credits}
        </p>
      )}

      <form onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search title/description..."
          value={q}
          onChange={e => setQ(e.target.value)}
        />

        <select
          value={type}
          onChange={e => {
            setType(e.target.value);
            setPage(1);
          }}
        >
          <option value="">
            All types
          </option>

          {ALLOWED_TYPES.map(t => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button type="submit">
          Search
        </button>
      </form>

      {loading && (
        <p>
          Loading...
        </p>
      )}

      {error && (
        <p style={{ color: 'red' }}>
          {error}
        </p>
      )}

      {downloadError && (
        <p style={{ color: 'red' }}>
          {downloadError}
        </p>
      )}

      {actionError && (
        <p style={{ color: 'red' }}>
          {actionError}
        </p>
      )}

      {!loading && resources.length === 0 && (
        <p>
          No resources found.
        </p>
      )}

      <ul>
        {resources.map(r => (
          <li key={r.id}>
            <strong>
              {r.title}
            </strong>{' '}

            (
              {r.type}, {formatSize(r.size_bytes)}
            )

            {r.description && (
              <p>
                {r.description}
              </p>
            )}

            {/* Like */}
            <button
              onClick={() => handleToggleLike(r)}
            >
              {r.liked_by_me ? '♥' : '♡'}{' '}
              {r.like_count}
            </button>

            {' '}

            {/* Report */}
            {reportingId === r.id ? (
              <span>
                <input
                  type="text"
                  placeholder="Reason (min 5 chars)"
                  value={reportReason}
                  onChange={e =>
                    setReportReason(e.target.value)
                  }
                />

                <button
                  onClick={() =>
                    handleSubmitReport(r.id)
                  }
                  disabled={
                    reportReason.trim().length < 5
                  }
                >
                  Submit
                </button>

                <button
                  onClick={() => {
                    setReportingId(null);
                    setReportReason('');
                  }}
                >
                  Cancel
                </button>
              </span>
            ) : (
              <button
                onClick={() => {
                  setActionError('');
                  setReportingId(r.id);
                  setReportReason('');
                }}
              >
                Report
              </button>
            )}

            {' '}

            {/* Download */}
            <button
              onClick={() =>
                handleDownload(r.id, r.title)
              }
              disabled={
                downloadingId === r.id
              }
            >
              {downloadingId === r.id
                ? 'Downloading...'
                : 'Download (2 credits)'}
            </button>
          </li>
        ))}
      </ul>

      <div>
        <button
          disabled={page <= 1}
          onClick={() =>
            setPage(p => p - 1)
          }
        >
          Previous
        </button>

        <span>
          {' '}
          Page {page} of {totalPages} ({total} total){' '}
        </span>

        <button
          disabled={page >= totalPages}
          onClick={() =>
            setPage(p => p + 1)
          }
        >
          Next
        </button>
      </div>
    </div>
  );
}

