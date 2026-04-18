import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Termly-backed legal page wrapper. Injects the embed script once
 * and renders the policy container Termly hydrates.
 *
 * Termly ships with a black-on-white viewer. The previous
 * implementation tried to force it onto the dark theme with
 * !important CSS overrides, which left large blocks unreadable on
 * real content. Now we just give the embed a white background card
 * to live in and keep the dark page around it — clean on both sides.
 */
export default function LegalPage({ uuid, title }) {
  useEffect(() => {
    const existing = document.querySelector('script[src="https://app.termly.io/embed-policy.min.js"]');
    if (existing) return undefined;
    const script = document.createElement('script');
    script.src = 'https://app.termly.io/embed-policy.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => {
      try { document.body.removeChild(script); } catch { /* ignore */ }
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1219] text-white p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-[#37F2D1]">
            <ArrowLeft className="w-4 h-4" /> Back to app
          </Link>
        </div>
        {title && <h1 className="text-3xl font-bold mb-6 text-[#37F2D1]">{title}</h1>}

        {/* White container gives Termly's default viewer a readable
            background. We deliberately skip the dark-theme CSS
            overrides — the embed hydrates with its own typography. */}
        <div className="bg-white rounded-xl p-8 shadow-lg text-slate-900">
          <div name="termly-embed" data-id={uuid} />
        </div>
      </div>
    </div>
  );
}
