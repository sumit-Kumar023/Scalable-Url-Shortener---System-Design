import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2 text-lg font-bold text-brand-600">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-brand-500" />
          SinkLy
        </Link>
        <nav className="flex items-center gap-4 text-sm font-medium text-slate-600">
          {user ? (
            <>
              <Link to="/dashboard" className="hover:text-brand-600">Dashboard</Link>
              <span className="hidden text-slate-400 sm:inline">{user.email}</span>
              <button
                onClick={handleLogout}
                className="rounded-md bg-slate-100 px-3 py-1.5 hover:bg-slate-200"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-brand-600">Log in</Link>
              <Link
                to="/register"
                className="rounded-md bg-brand-600 px-3 py-1.5 text-white hover:bg-brand-700"
              >
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
