import { useState, useEffect, useCallback } from "react";
import api from "../api/client";

const STATUS_CLASS = {
  PENDING: "status-pending",
  DISMISSED: "status-dismissed",
  ACTION_TAKEN: "status-action",
};

export default function Admin() {
  const [reports, setReports] = useState([]);
  const [statusFilter, setStatusFilter] = useState("PENDING");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actingOnId, setActingOnId] = useState(null);

  const [moderated, setModerated] = useState([]);
  const [moderatedLoading, setModeratedLoading] = useState(false);

  // -------------------------
  // Fetch hidden/removed resources
  // -------------------------
  const fetchModerated = useCallback(async () => {
    setModeratedLoading(true);

    try {
      const { data } = await api.get("/admin/resources");
      setModerated(data);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Failed to load moderated resources",
      );
    } finally {
      setModeratedLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModerated();
  }, [fetchModerated]);

  // -------------------------
  // Restore resource
  // -------------------------
  async function handleRestore(resourceId) {
    setError("");

    try {
      await api.patch(
        `/admin/resources/${resourceId}/status`,
        {
          status: "ACTIVE",
        },
      );

      await fetchModerated();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Restore failed",
      );
    }
  }

  // -------------------------
  // Fetch reports
  // -------------------------
  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError("");
    setReports([]);

    try {
      const { data } = await api.get(
        "/admin/reports",
        {
          params: statusFilter
            ? { status: statusFilter }
            : {},
        },
      );

      setReports(data);
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Failed to load reports",
      );
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // -------------------------
  // Resolve report
  // -------------------------
  async function handleResolve(reportId, decision) {
    setActingOnId(reportId);
    setError("");

    try {
      await api.post(
        `/admin/reports/${reportId}/resolve`,
        {
          decision,
        },
      );

      await fetchReports();
      await fetchModerated();
    } catch (err) {
      setError(
        err.response?.data?.error?.message ||
          "Action failed",
      );
    } finally {
      setActingOnId(null);
    }
  }

  return (
    <div>
      {/* =========================
          REPORTS
      ========================= */}

      <h2>Reports</h2>

      <div className="filter-row">
        <select
          className="field"
          style={{
            width: "auto",
            marginBottom: 0,
          }}
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value)
          }
        >
          <option value="PENDING">
            Pending
          </option>

          <option value="DISMISSED">
            Dismissed
          </option>

          <option value="ACTION_TAKEN">
            Action taken
          </option>

          <option value="">
            All
          </option>
        </select>
      </div>

      {loading && (
        <p className="loading-text">
          Loading...
        </p>
      )}

      {error && (
        <p className="error-text">
          {error}
        </p>
      )}

      {!loading && reports.length === 0 && (
        <p className="empty-state">
          No reports in this view.
        </p>
      )}

      <ul className="item-list">
        {reports.map((r) => (
          <li
            className="item-row"
            key={r.id}
          >
            <p className="item-title">
              {r.resource?.title}
            </p>

            <p className="item-meta">
              Reported by{" "}
              {r.reporter?.email} · resource
              status{" "}
              {r.resource?.status}{" "}
              <span
                className={`status-pill ${
                  STATUS_CLASS[r.status]
                }`}
              >
                {r.status
                  .replace("_", " ")
                  .toLowerCase()}
              </span>
            </p>

            <p className="item-desc">
              {r.reason}
            </p>

            {r.reviewedBy && (
              <p className="item-meta">
                Reviewed{" "}
                {new Date(
                  r.reviewedAt,
                ).toLocaleString()}
              </p>
            )}

            {r.status === "PENDING" && (
              <div className="item-actions">
                <button
                  className="btn"
                  disabled={
                    actingOnId === r.id
                  }
                  onClick={() =>
                    handleResolve(
                      r.id,
                      "DISMISS",
                    )
                  }
                >
                  Dismiss
                </button>

                <button
                  className="btn"
                  disabled={
                    actingOnId === r.id
                  }
                  onClick={() =>
                    handleResolve(
                      r.id,
                      "HIDE",
                    )
                  }
                >
                  Hide resource
                </button>

                <button
                  className="btn btn-danger"
                  disabled={
                    actingOnId === r.id
                  }
                  onClick={() =>
                    handleResolve(
                      r.id,
                      "REMOVE",
                    )
                  }
                >
                  Remove resource
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {/* =========================
          HIDDEN / REMOVED RESOURCES
      ========================= */}

      <h2
        style={{
          marginTop: "2.5rem",
        }}
      >
        Hidden and removed resources
      </h2>

      {moderatedLoading && (
        <p className="loading-text">
          Loading...
        </p>
      )}

      {!moderatedLoading &&
        moderated.length === 0 && (
          <p className="empty-state">
            Nothing hidden or removed.
          </p>
        )}

      <ul className="item-list">
        {moderated.map((r) => (
          <li
            className="item-row"
            key={r.id}
          >
            <p className="item-title">
              {r.title}
            </p>

            <p className="item-meta">
              Uploaded by{" "}
              {r.uploader?.email} ·{" "}
              <span
                className={`status-pill ${
                  r.status === "HIDDEN"
                    ? "status-pending"
                    : "status-action"
                }`}
              >
                {r.status.toLowerCase()}
              </span>
            </p>

            {r.status === "HIDDEN" && (
              <div className="item-actions">
                <button
                  className="btn btn-primary"
                  onClick={() =>
                    handleRestore(r.id)
                  }
                >
                  Restore to active
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}