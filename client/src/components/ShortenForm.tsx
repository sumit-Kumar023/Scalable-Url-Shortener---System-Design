import { useState, FormEvent } from 'react';
import { createUrlRequest } from '../services/urlService';
import { getApiErrorMessage } from '../services/api';
import { ShortUrl } from '../types';
import CopyButton from './CopyButton';

const EXPIRATION_OPTIONS = [
  { value: '', label: 'Never' },
  { value: '1h', label: '1 hour' },
  { value: '24h', label: '24 hours' },
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
];

interface Props {
  requireAuthToSubmit?: boolean;
  onCreated?: (url: ShortUrl) => void;
}

export default function ShortenForm({ onCreated }: Props) {
  const [originalUrl, setOriginalUrl] = useState('');
  const [customAlias, setCustomAlias] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [result, setResult] = useState<ShortUrl | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setSubmitting(true);
    try {
      const url = await createUrlRequest({
        originalUrl,
        customAlias: customAlias || undefined,
        expiresAt: expiresAt || undefined,
      });
      setResult(url);
      setOriginalUrl('');
      setCustomAlias('');
      setExpiresAt('');
      onCreated?.(url);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <input
          type="text"
          required
          placeholder="Paste a long URL, e.g. https://example.com/very/long/path"
          value={originalUrl}
          onChange={(e) => setOriginalUrl(e.target.value)}
          className="w-full flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <button
          type="submit"
          disabled={submitting}
          className="whitespace-nowrap rounded-md bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
        >
          {submitting ? 'Shortening...' : 'Shorten URL'}
        </button>
      </form>

      <div className="mt-3 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          placeholder="Custom alias (optional)"
          value={customAlias}
          onChange={(e) => setCustomAlias(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
        <select
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          {EXPIRATION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              Expires: {opt.label}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-brand-100 bg-brand-50 px-4 py-3">
          <a
            href={result.shortUrl}
            target="_blank"
            rel="noreferrer"
            className="truncate text-sm font-semibold text-brand-700 hover:underline"
          >
            {result.shortUrl}
          </a>
          <CopyButton text={result.shortUrl} />
        </div>
      )}
    </div>
  );
}
