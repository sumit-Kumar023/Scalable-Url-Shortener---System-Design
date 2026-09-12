import ShortenForm from '../components/ShortenForm';

export default function Landing() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
        Shorten links. <span className="text-brand-600">Track everything.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-xl text-slate-600">
        Snapr turns long URLs into short, shareable links with click analytics,
        custom aliases, and expiration control - backed by a Redis-cached,
        MongoDB-powered API.
      </p>

      <div className="mx-auto mt-10 max-w-xl rounded-xl border border-slate-200 bg-white p-6 text-left shadow-sm">
        <ShortenForm />
        <p className="mt-3 text-xs text-slate-400">
          Sign up to save your links, see click counts, and manage expiration.
        </p>
      </div>

      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 text-left sm:grid-cols-3">
        <Feature
          title="Fast redirects"
          body="Redirects are served from a Redis cache-aside layer, falling back to MongoDB automatically if a link isn't cached yet."
        />
        <Feature
          title="Built to scale"
          body="A stateless Express backend runs behind Nginx, so you can add more backend instances without any code changes."
        />
        <Feature
          title="Real analytics"
          body="Every link tracks click count and last-clicked time, visible in your dashboard the moment someone clicks it."
        />
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h3 className="font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-500">{body}</p>
    </div>
  );
}
