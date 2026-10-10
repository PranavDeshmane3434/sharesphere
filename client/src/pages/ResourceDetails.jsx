import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext";
import { CATEGORY_LABEL, formatSize, formatDate } from "../constants";

function BackButton() {
  return (
    <Link to="/browse" className="back-btn">
      <span className="back-arrow" aria-hidden="true">
        ←
      </span>
      Back to Browse
    </Link>
  );
}

export default function ResourceDetails() {
  const { id } = useParams();
  const { refreshUser } = useAuth();

  const [resource, setResource] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState("");

  const [actionError, setActionError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);

  const fetchResource = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get(`/resources/${id}`);
      setResource(data);
      setNotFound(false);
    } catch (err) {
      if (err.response?.status === 404) {
        setNotFound(true);
      } else {
        setError(
          err.response?.data?.error?.message || "Failed to load resource",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    setReportSent(false);
    setReporting(false);
    fetchResource();
  }, [fetchResource]);

  async function handleDownload() {
    setActionError("");
    setDownloading(true);
    try {
      const { data } = await api.post(`/resources/${id}/download`);

      const fileResponse = await fetch(data.downloadUrl);
      if (!fileResponse.ok)
        throw new Error("Failed to fetch file from storage");

      const blob = await fileResponse.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = data.title || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      await refreshUser();
      await fetchResource();
    } catch (err) {
      if (err.response?.status === 402) {
        setActionError("Not enough credits to download this resource.");
      } else if (err.response?.status === 404) {
        setActionError("This resource is no longer available.");
      } else {
        setActionError(
          err.response?.data?.error?.message ||
            err.message ||
            "Download failed",
        );
      }
    } finally {
      setDownloading(false);
    }
  }

  async function handleToggleLike() {
    setActionError("");
    try {
      if (resource.liked_by_me) {
        await api.delete(`/resources/${id}/like`);
      } else {
        await api.put(`/resources/${id}/like`);
      }
      await fetchResource();
    } catch (err) {
      setActionError(err.response?.data?.error?.message || "Action failed");
    }
  }

  async function handleSubmitReport() {
    setActionError("");
    try {
      await api.post(`/resources/${id}/report`, {
        reason: reportReason.trim(),
      });
      setReporting(false);
      setReportReason("");
      setReportSent(true);
    } catch (err) {
      if (err.response?.status === 409) {
        setActionError("You already reported this resource.");
      } else {
        setActionError(err.response?.data?.error?.message || "Report failed");
      }
    }
  }

  if (loading) {
    return (
      <div className="detail-page">
        <p className="loading-text">Loading...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="detail-page">
        <BackButton />
        <p className="empty-state">
          This resource doesn't exist or is no longer available.
        </p>
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="detail-page">
        <BackButton />
        <p className="error-text">{error || "Failed to load resource"}</p>
      </div>
    );
  }

  const details = [
    ["Subject", resource.subject],
    ["Semester", resource.semester && `Semester ${resource.semester}`],
    ["Unit", resource.unit && `Unit ${resource.unit}`],
    ["Academic year", resource.academic_year],
    ["Category", resource.category && CATEGORY_LABEL[resource.category]],
    ["File type", resource.type],
  ].filter(([, value]) => value);

  const byline = `${
    resource.is_mine
      ? "Uploaded by you"
      : `Uploaded by ${resource.uploader_name}`
  } · ${formatDate(resource.created_at)}`;

  return (
    <div className="detail-page">
      <BackButton />

      <header className="detail-hero">
        <div className="detail-tags">
          {resource.category && (
            <span className="tag tag-accent">
              {CATEGORY_LABEL[resource.category]}
            </span>
          )}
          <span className="tag">{resource.type}</span>
        </div>
        <h1 className="detail-title">{resource.title}</h1>
        <p className="detail-byline">{byline}</p>
      </header>

      <div className="stat-row">
        <div className="stat">
          <div className="stat-value">{resource.like_count}</div>
          <div className="stat-label">Likes</div>
        </div>
        <div className="stat">
          <div className="stat-value">{resource.download_count}</div>
          <div className="stat-label">Downloads</div>
        </div>
        <div className="stat">
          <div className="stat-value">{formatSize(resource.size_bytes)}</div>
          <div className="stat-label">File size</div>
        </div>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          <section className="detail-section">
            <h2 className="section-label">About this resource</h2>
            {resource.description ? (
              <p className="detail-desc">{resource.description}</p>
            ) : (
              <p className="detail-desc empty">No description provided.</p>
            )}
          </section>

          {details.length > 0 && (
            <section className="detail-section">
              <h2 className="section-label">Resource details</h2>
              <dl className="detail-grid">
                {details.map(([label, value]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>

        <aside className="detail-aside">
          <div className="action-card">
            <button
              className="btn btn-primary"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading
                ? "Downloading..."
                : resource.is_mine
                  ? "Download — free"
                  : "Download — 2 credits"}
            </button>

            {!resource.is_mine && (
              <div className="action-secondary">
                <button className="btn" onClick={handleToggleLike}>
                  {resource.liked_by_me ? "♥ Liked" : "♡ Like"}
                </button>
                {!reporting && !reportSent && (
                  <button
                    className="btn"
                    onClick={() => {
                      setActionError("");
                      setReporting(true);
                    }}
                  >
                    Report
                  </button>
                )}
              </div>
            )}

            {actionError && <p className="error-text">{actionError}</p>}
            {reportSent && (
              <p className="success-text">
                Report submitted. An admin will review it.
              </p>
            )}

            {reporting && (
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
                  onClick={handleSubmitReport}
                  disabled={reportReason.trim().length < 5}
                >
                  Submit
                </button>
                <button
                  className="btn"
                  onClick={() => {
                    setReporting(false);
                    setReportReason("");
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
