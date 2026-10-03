import { useState, useEffect } from 'react';
import api from '../api/client';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/me/transactions')
      .then(({ data }) => setTransactions(data.results))
      .catch(err => setError(err.response?.data?.error?.message || 'Failed to load transactions'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p>Loading...</p>;
  if (error) return <p style={{ color: 'red' }}>{error}</p>;

  return (
    <div>
      <h2>Transaction History</h2>
      {transactions.length === 0 && <p>No transactions yet.</p>}
      <ul>
        {transactions.map(t => (
          <li key={t.id}>
            <span style={{ color: t.type === 'EARN' ? 'green' : 'red' }}>
              {t.type === 'EARN' ? '+' : '-'}{t.amount}
            </span>
            {' — '}{t.type === 'EARN' ? 'Uploaded' : 'Downloaded'} "{t.resourceTitle || 'resource'}"
            {' — '}{new Date(t.createdAt).toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}