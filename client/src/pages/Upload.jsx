import { useState, useRef } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';

const ALLOWED_TYPES = ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PDF');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { refreshUser } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Choose a file first');
      return;
    }

    try {
      setStatus('uploading');
      const { data: uploadInfo } = await api.post('/resources/upload-url', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        type,
      });

      await fetch(uploadInfo.presignedPutUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });

      setStatus('confirming');
      const { data: resource } = await api.post('/resources/confirm', {
        uploadId: uploadInfo.uploadId,
        objectKey: uploadInfo.objectKey,
        title,
        description,
        type,
      });

      setResult(resource);
      setStatus('done');
      setFile(null);
      setTitle('');
      setDescription('');

      await refreshUser();
    } catch (err) {
      setError(err.response?.data?.error?.message || err.message || 'Upload failed');
      setStatus('error');
    }
  }

  const busy = status === 'uploading' || status === 'confirming';

  return (
    <div className="upload-wrap">
      <div className="upload-card">
        <h2>Upload a resource</h2>
        <form onSubmit={handleSubmit}>
          <div
            className={`file-drop${file ? ' has-file' : ''}`}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={e => setFile(e.target.files[0])}
              required
            />
            {file ? file.name : 'Click to choose a file, or drag one here'}
          </div>

          <input
            className="field"
            type="text"
            placeholder="Title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            required
          />
          <textarea
            className="field"
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
          <select className="field" value={type} onChange={e => setType(e.target.value)}>
            {ALLOWED_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <button className="btn btn-primary" type="submit" disabled={busy} style={{ width: '100%' }}>
            {status === 'uploading' ? 'Uploading...' : status === 'confirming' ? 'Confirming...' : 'Upload'}
          </button>
        </form>

        {status === 'uploading' && <p className="status-text">Sending file to storage...</p>}
        {status === 'confirming' && <p className="status-text">Confirming with server...</p>}
        {error && <p className="error-text">{error}</p>}
        {result && <p className="success-text">Uploaded "{result.title}" — credits added to your balance.</p>}
      </div>
    </div>
  );
}