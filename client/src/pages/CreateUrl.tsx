import { useNavigate } from 'react-router-dom';
import ShortenForm from '../components/ShortenForm';

export default function CreateUrl() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Create a short URL</h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <ShortenForm onCreated={() => navigate('/dashboard')} />
      </div>
    </div>
  );
}
