import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FILE_TYPES,
  SEMESTERS,
  UNITS,
} from "../constants";

const SORT_OPTIONS = [
  { key: "newest", label: "Newest" },
  { key: "oldest", label: "Oldest" },
  { key: "most_downloaded", label: "Most downloaded" },
  { key: "most_liked", label: "Most liked" },
  { key: "size_asc", label: "Smallest" },
  { key: "size_desc", label: "Largest" },
];

const EMPTY_FILTERS = {
  subject: "",
  semester: "",
  category: "",
  type: "",
  unit: "",
  academicYear: "",
};

function formatSize(bytes) {
  const n = Number(bytes);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function Browse() {
  const [resources, setResources] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);

  const [q, setQ] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [sort, setSort] = useState("newest");
  const [filterOptions, setFilterOptions] = useState({
    subjects: [],
    academicYears: [],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [downloadingId, setDownloadingId] = useState(null);
  const [downloadError, setDownloadError] = useState("");

  const [reportingId, setReportingId] = useState(null);
  const [reportReason, setReportReason] = useState("");
  const [actionError, setActionError] = useState("");

  const { user, refreshUser } = useAuth();

  const anyFilterActive = Object.values(filters).some(Boolean);

  useEffect(() => {
    api
      .get("/resources/filters")
      .then(({ data }) => setFilterOptions(data))
      .catch(() => {}); // dropdown values are optional, never block Browse
  }, []);

  const fetchResources = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { page, limit, sort };
      if (q) params.q = q;
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });

      const { data } = await api.get("/resources", { params });
      setResources(data.results);
      setTotal(data.total);
    } catch (err) {
      setError(
        err.response?.data?.error?.message || "Failed to load resources",
      );
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, filters, sort]);

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  function handleSearchSubmit(e) {
    e.preventDefault();
    setPage(1);
    fetchResources();
  }

  function setFilter(key, value) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(1);
  }

  async function handleDownload(resourceId, title) {
    setDownloadError("");
    setDownloadingId(resourceId);
    try {
      const { data } = await api.post(`/resources/${resourceId}/download`);

      const fileResponse = await fetch(data.downloadUrl);
      if (!fileResponse.ok)
        throw new Error("Failed to fetch file from storage");

      const blob = await fileResponse.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = title || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      await refreshUser();
      await fetchResources();
    } catch (err) {
      if (err.response?.status === 402) {
        setDownloadError("Not enough credits to download this resource.");
      } else if (err.response?.status === 404) {
        setDownloadError("This resource is no longer available.");
      } else {
        setDownloadError(
          err.response?.data?.error?.message ||
            err.message ||
            "Download failed",
        );
      }
    } finally {
      setDownloadingId(null);
    }
  }

  async function handleToggleLike(resource) {
    setActionError("");
    try {
      if (resource.liked_by_me) {
        await api.delete(`/resources/${resource.id}/like`);
      } else {
        await api.put(`/resources/${resource.id}/like`);
      }
      await fetchResources();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || "Action failed");
    }
  }

  async function handleSubmitReport(resourceId) {
    setActionError("");
    try {
      await api.post(`/resources/${resourceId}/report`, {
        reason: reportReason.trim(),
      });
      setReportingId(null);
      setReportReason("");
      await fetchResources();
    } catch (err) {
      if (err.response?.status === 409) {
        setActionError("You already reported this resource.");
      } else {
        setActionError(err.response?.data?.error?.message || "Report failed");
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <div>
      <div className="browse-header">
        <h2 style={{ margin: 0 }}>Browse resources</h2>
        {user && user.role !== "ADMIN" && (
          <span className="credit-badge">{user.credits} credits</span>
        )}
      </div>

      {/* Search */}
      <form onSubmit={handleSearchSubmit} style={{ maxWidth: "none" }}>
        <div className="search-row">
          <input
            className="field"
            type="text"
            placeholder="Search title or description"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="btn btn-primary" type="submit">
            Search
          </button>
        </div>
      </form>

      {/* Filters */}
      <div className="filter-grid">
        <select
          className="field"
          value={filters.subject}
          onChange={(e) => setFilter("subject", e.target.value)}
        >
          <option value="">All subjects</option>
          {filterOptions.subjects.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={filters.semester}
          onChange={(e) => setFilter("semester", e.target.value)}
        >
          <option value="">All semesters</option>
          {SEMESTERS.map((s) => (
            <option key={s} value={s}>
              Semester {s}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={filters.category}
          onChange={(e) => setFilter("category", e.target.value)}
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={filters.type}
          onChange={(e) => setFilter("type", e.target.value)}
        >
          <option value="">All file types</option>
          {FILE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={filters.unit}
          onChange={(e) => setFilter("unit", e.target.value)}
        >
          <option value="">All units</option>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              Unit {u}
            </option>
          ))}
        </select>
        <select
          className="field"
          value={filters.academicYear}
          onChange={(e) => setFilter("academicYear", e.target.value)}
        >
          <option value="">All years</option>
          {filterOptions.academicYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <div className="filter-actions">
        {anyFilterActive && (
          <button type="button" className="btn-text" onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {/* Sorting: exactly one option */}
      <div className="sort-row">
        <label htmlFor="sort-select">Sort by</label>
        <select
          id="sort-select"
          className="field"
          value={sort}
          onChange={(e) => {
            setSort(e.target.value);
            setPage(1);
          }}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {downloadError && <p className="error-text">{downloadError}</p>}
      {actionError && <p className="error-text">{actionError}</p>}
      {!loading && resources.length === 0 && (
        <p className="empty-state">No resources found.</p>
      )}

      <ul className="item-list">
        {resources.map((r) => {
          const academicLine = [
            r.subject,
            r.semester && `Semester ${r.semester}`,
            r.unit && `Unit ${r.unit}`,
            r.academic_year,
          ]
            .filter(Boolean)
            .join(" · ");
          const fileLine = [
            r.category && CATEGORY_LABEL[r.category],
            r.type,
            formatSize(r.size_bytes),
          ]
            .filter(Boolean)
            .join(" · ");

          return (
            <li className="item-row" key={r.id}>
              <div className="item-title-row">
                <Link to={`/resources/${r.id}`} className="item-title-link">
                  {r.title}
                </Link>
                {/* Visual cue only; the title link above is the real, keyboard-focusable one */}
                <Link
                  to={`/resources/${r.id}`}
                  className="view-link"
                  tabIndex={-1}
                  aria-hidden="true"
                >
                  View details
                </Link>
              </div>
              {academicLine && <p className="item-meta">{academicLine}</p>}
              <p className="item-meta">{fileLine}</p>
              <p className="item-stats">
                {r.like_count} likes · {r.download_count} downloads
              </p>
              {r.description && <p className="item-desc">{r.description}</p>}

              {r.is_mine ? (
                <>
                  <p className="item-meta">Uploaded by you</p>
                  <div className="item-actions">
                    <button
                      className="btn btn-primary"
                      style={{ marginLeft: "auto" }}
                      onClick={() => handleDownload(r.id, r.title)}
                      disabled={downloadingId === r.id}
                    >
                      {downloadingId === r.id
                        ? "Downloading..."
                        : "Download — free"}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="item-actions">
                    <button className="btn" onClick={() => handleToggleLike(r)}>
                      {r.liked_by_me ? "♥" : "♡"} {r.like_count}
                    </button>

                    {reportingId !== r.id && (
                      <button
                        className="btn"
                        onClick={() => {
                          setActionError("");
                          setReportingId(r.id);
                          setReportReason("");
                        }}
                      >
                        Report
                      </button>
                    )}

                    <button
                      className="btn btn-primary"
                      style={{ marginLeft: "auto" }}
                      onClick={() => handleDownload(r.id, r.title)}
                      disabled={downloadingId === r.id}
                    >
                      {downloadingId === r.id
                        ? "Downloading..."
                        : "Download — 2 credits"}
                    </button>
                  </div>

                  {reportingId === r.id && (
                    <div className="report-inline">
                      <input
                        className="field"
                        type="text"
                        placeholder="Reason (min 5 characters)"
                        value={reportReason}
                        onChange={(e) => setReportReason(e.target.value)}
                      />
                      <button
                        className="btn"
                        onClick={() => handleSubmitReport(r.id)}
                        disabled={reportReason.trim().length < 5}
                      >
                        Submit
                      </button>
                      <button
                        className="btn"
                        onClick={() => {
                          setReportingId(null);
                          setReportReason("");
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>

      <div className="pagination">
        <button
          className="btn"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <button
          className="btn"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
