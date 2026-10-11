import { useState } from 'react';

// Read-only stars, rounded to the nearest whole star
export function StarsDisplay({ value }) {
  const filled = Math.round(value || 0);
  return (
    <span className="stars" aria-hidden="true">
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} className={n <= filled ? 'star on' : 'star'}>★</span>
      ))}
    </span>
  );
}

// Clickable stars with hover preview
export function StarsInput({ value, onSelect, disabled }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value || 0;

  return (
    <div
      className="stars-input"
      role="radiogroup"
      aria-label="Your rating"
      onMouseLeave={() => setHover(0)}
    >
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
          className={n <= shown ? 'star-btn on' : 'star-btn'}
          disabled={disabled}
          onMouseEnter={() => setHover(n)}
          onClick={() => onSelect(n)}
        >
          ★
        </button>
      ))}
    </div>
  );
}