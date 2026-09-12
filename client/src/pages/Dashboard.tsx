import { useEffect, useState, useCallback } from 'react';
import StatCard from '../components/StatCard';
import UrlTable from '../components/UrlTable';
import ShortenForm from '../components/ShortenForm';
import { listUrlsRequest, deleteUrlRequest } from '../services/urlService';
import { getApiErrorMessage } from '../services/api';
import { ShortUrl } from '../types';

export default function Dashboard() {
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const data = await listUrlsRequest();
      setUrls(data);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    if (!confirm('Delete this short URL? This cannot be undone.')) return;
    const previous = urls;
    setUrls(urls.filter((u) => u.id !== id));
    try {
      await deleteUrlRequest(id);
    } catch (err) {
      setError(getApiErrorMessage(err));
      setUrls(previous);
    }
  }

  const totalUrls = urls.length;
  const totalClicks = urls.reduce((sum, u) => sum + u.clickCount, 0);
  const activeUrls = urls.filter((u) => u.isActive && !u.isExpired).length;
  const expiredUrls = urls.filter((u) => u.isExpired).length;

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Create a new short URL</h2>
        <ShortenForm onCreated={refresh} />
      </div>

      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total URLs" value={totalUrls} />
        <StatCard label="Total Clicks" value={totalClicks} />
        <StatCard label="Active URLs" value={activeUrls} />
        <StatCard label="Expired URLs" value={expiredUrls} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-slate-700">Your links</h2>
        {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
        {loading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : (
          <UrlTable urls={urls} onDelete={handleDelete} />
        )}
      </div>
    </div>
  );
}
