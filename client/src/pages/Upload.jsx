import { useState } from 'react';
import api from '../api/client';

const ALLOWED_TYPES = ['PDF', 'PPT', 'PPTX', 'DOC', 'DOCX', 'TXT'];

export default function Upload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('PDF');
  const [status, setStatus] = useState('idle'); // idle | uploading | confirming | done | error
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Choose a file first');
      return;
    }

    if (file.size <= 0) {
      setError('Selected file is empty');
      return;
    }

    try {
      // Step 1: ask backend for a presigned upload URL
      setStatus('uploading');

      const { data: uploadInfo } = await api.post('/resources/upload-url', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        type,
      });

      // Step 2: upload the actual file directly to Backblaze B2
      const uploadResponse = await fetch(uploadInfo.presignedPutUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error('File upload to storage failed');
      }

      // Step 3: tell our backend the upload is complete
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
    } catch (err) {
      console.error(
        'UPLOAD ERROR:',
        JSON.stringify(err.response?.data || err.message, null, 2)
      );

      setError(
        err.response?.data?.error?.message ||
        err.message ||
        'Upload failed'
      );

      setStatus('error');
    }
  }

  return (
    <div>
      <h2>Upload a Resource</h2>

      <form onSubmit={handleSubmit}>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          required
        />

        <input
          type="text"
          placeholder="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <textarea
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {ALLOWED_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <button
          type="submit"
          disabled={status === 'uploading' || status === 'confirming'}
        >
          {status === 'uploading'
            ? 'Uploading...'
            : status === 'confirming'
            ? 'Confirming...'
            : 'Upload'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}

      {result && (
        <p style={{ color: 'green' }}>
          Uploaded "{result.title}" successfully! You earned credits.
        </p>
      )}
    </div>
  );
}
