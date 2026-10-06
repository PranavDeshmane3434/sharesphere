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

  return (
    <div>
      <h2>Transaction history</h2>

      {loading && <p className="loading-text">Loading...</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && transactions.length === 0 && (
        <p className="empty-state">No transactions yet — upload or download a resource to get started.</p>
      )}

      <ul className="item-list" style={{ marginTop: transactions.length ? '1.5rem' : 0 }}>
        {transactions.map(t => (
          <li className="txn-row" key={t.id}>
            <div>
              <div>{t.type === 'EARN' ? 'Uploaded' : 'Downloaded'} "{t.resourceTitle || 'resource'}"</div>
              <div className="txn-meta">{new Date(t.createdAt).toLocaleString()}</div>
            </div>
            <div className={`txn-amount ${t.type === 'EARN' ? 'earn' : 'spend'}`}>
              {t.type === 'EARN' ? '+' : '-'}{t.amount}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}