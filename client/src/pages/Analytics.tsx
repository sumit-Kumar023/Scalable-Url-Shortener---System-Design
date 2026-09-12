import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import StatCard from '../components/StatCard';
import CopyButton from '../components/CopyButton';
import { getUrlAnalyticsRequest } from '../services/urlService';
import { getApiErrorMessage } from '../services/api';
import { UrlAnalytics } from '../types';

export default function Analytics() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<UrlAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getUrlAnalyticsRequest(id)
      .then(setData)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-slate-500">Loading...</div>;
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-red-600">{error ?? 'Not found'}</p>
        <Link to="/dashboard" className="mt-4 inline-block text-sm text-brand-600 hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link to="/dashboard" className="text-sm text-brand-600 hover:underline">
        &larr; Back to dashboard
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-slate-900">Link analytics</h1>

      <div className="mt-4 flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-4">
        <a href={data.shortUrl} target="_blank" rel="noreferrer" className="font-medium text-brand-600 hover:underline">
          {data.shortUrl}
        </a>
        <CopyButton text={data.shortUrl} />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total Clicks" value={data.totalClicks} />
        <StatCard
          label="Last Clicked"
          value={data.lastClickedAt ? new Date(data.lastClickedAt).toLocaleString() : 'Never'}
        />
        <StatCard label="Status" value={data.isActive ? 'Active' : 'Disabled'} />
        <StatCard label="Created" value={new Date(data.createdAt).toLocaleDateString()} />
        <StatCard label="Expires" value={data.expiresAt ? new Date(data.expiresAt).toLocaleDateString() : 'Never'} />
      </div>
    </div>
  );
}
