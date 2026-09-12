import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ShortUrl } from '../types';
import CopyButton from './CopyButton';

interface Props {
  urls: ShortUrl[];
  onDelete: (id: string) => void;
}

function statusBadge(url: ShortUrl) {
  if (!url.isActive) return <Badge color="bg-slate-200 text-slate-600">Disabled</Badge>;
  if (url.isExpired) return <Badge color="bg-amber-100 text-amber-700">Expired</Badge>;
  return <Badge color="bg-emerald-100 text-emerald-700">Active</Badge>;
}

function Badge({ color, children }: { color: string; children: ReactNode }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${color}`}>{children}</span>;
}

export default function UrlTable({ urls, onDelete }: Props) {
  if (urls.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
        You haven't created any short URLs yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3">Original URL</th>
            <th className="px-4 py-3">Short URL</th>
            <th className="px-4 py-3">Created</th>
            <th className="px-4 py-3">Expiration</th>
            <th className="px-4 py-3">Clicks</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {urls.map((url) => (
            <tr key={url.id}>
              <td className="max-w-[220px] truncate px-4 py-3 text-slate-700" title={url.originalUrl}>
                {url.originalUrl}
              </td>
              <td className="px-4 py-3">
                <a href={url.shortUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline">
                  {url.shortUrl.replace(/^https?:\/\//, '')}
                </a>
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {new Date(url.createdAt).toLocaleDateString()}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                {url.expiresAt ? new Date(url.expiresAt).toLocaleDateString() : 'Never'}
              </td>
              <td className="px-4 py-3 text-slate-700">{url.clickCount}</td>
              <td className="px-4 py-3">{statusBadge(url)}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <CopyButton text={url.shortUrl} />
                  <Link
                    to={`/analytics/${url.id}`}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                  >
                    Analytics
                  </Link>
                  <button
                    onClick={() => onDelete(url.id)}
                    className="rounded-md border border-red-200 px-2.5 py-1 text-xs font-medium text-red-600 hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
