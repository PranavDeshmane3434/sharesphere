import { useState, useRef, useEffect } from 'react';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  CATEGORIES,
  SEMESTERS,
  UNITS,
  FILE_TYPES,
  detectFileType,
  academicYearOptions,
} from '../constants';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [semester, setSemester] = useState('');
  const [unit, setUnit] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [subjectOptions, setSubjectOptions] = useState([]);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);
  const { refreshUser } = useAuth();

  const years = academicYearOptions();
  const detectedType = file ? detectFileType(file.name) : null;

  useEffect(() => {
    api.get('/resources/filters')
      .then(({ data }) => setSubjectOptions(data.subjects))
      .catch(() => {}); // suggestions are optional, never block the form
  }, []);

  function handleFileChange(e) {
    const chosen = e.target.files[0] || null;
    setFile(chosen);
    setResult(null);
    if (chosen && !detectFileType(chosen.name)) {
      setError(`Unsupported file type. Allowed: ${FILE_TYPES.join(', ')}`);
    } else {
      setError('');
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResult(null);

    if (!file) {
      setError('Choose a file first');
      return;
    }
    if (!detectedType) {
      setError(`Unsupported file type. Allowed: ${FILE_TYPES.join(', ')}`);
      return;
    }
    if (!category) {
      setError('Choose a category');
      return;
    }

    try {
      setStatus('uploading');
      const { data: uploadInfo } = await api.post('/resources/upload-url', {
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        type: detectedType,
      });

      const putResponse = await fetch(uploadInfo.presignedPutUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'application/octet-stream' },
        body: file,
      });
      if (!putResponse.ok) throw new Error('Upload to storage failed');

      setStatus('confirming');
      const body = {
        uploadId: uploadInfo.uploadId,
        objectKey: uploadInfo.objectKey,
        title,
        type: detectedType,
        category,
      };
      if (description.trim()) body.description = description;
      if (subject.trim()) body.subject = subject.trim();
      if (semester) body.semester = Number(semester);
      if (unit) body.unit = Number(unit);
      if (academicYear) body.academicYear = academicYear;

      const { data: resource } = await api.post('/resources/confirm', body);

      setResult(resource);
      setStatus('done');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTitle('');
      setDescription('');
      setCategory('');
      setSubject('');
      setSemester('');
      setUnit('');
      setAcademicYear('');

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
            <input ref={fileInputRef} type="file" onChange={handleFileChange} />
            {file ? file.name : 'Click to choose a file'}
          </div>
          {detectedType && <p className="detected-type">Detected file type: {detectedType}</p>}

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

          <select
            className="field"
            value={category}
            onChange={e => setCategory(e.target.value)}
            required
          >
            <option value="">Choose a category</option>
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <input
            className="field"
            type="text"
            list="subject-suggestions"
            placeholder="Subject (e.g. DBMS)"
            maxLength={100}
            value={subject}
            onChange={e => setSubject(e.target.value)}
          />
          <datalist id="subject-suggestions">
            {subjectOptions.map(s => <option key={s} value={s} />)}
          </datalist>

          <div className="field-grid">
            <select className="field" value={semester} onChange={e => setSemester(e.target.value)}>
              <option value="">Semester</option>
              {SEMESTERS.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
            <select className="field" value={unit} onChange={e => setUnit(e.target.value)}>
              <option value="">Unit</option>
              {UNITS.map(u => <option key={u} value={u}>Unit {u}</option>)}
            </select>
            <select className="field" value={academicYear} onChange={e => setAcademicYear(e.target.value)}>
              <option value="">Academic year</option>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

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