import { useState } from 'react';

export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can fail (e.g. insecure context) - fail silently.
    }
  }

  return (
    <button
      onClick={handleCopy}
      className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
      type="button"
    >
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}
