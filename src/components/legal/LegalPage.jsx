import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Termly-backed legal page wrapper. Injects the embed script once
 * and renders the policy container Termly hydrates. The dark CSS
 * override below forces the Termly viewer (which ships with white
 * styling) onto the app's dark theme.
 *
 * Pass the Termly UUID for the relevant policy.
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

        {/* Termly embed target. The data-id is the policy UUID. */}
        <div className="bg-[#1a1f2e] border border-slate-800 rounded-2xl p-6 termly-host">
          <div name="termly-embed" data-id={uuid} />
        </div>
      </div>

      <style>{`
        /* Force Termly's default white viewer onto the dark theme. */
        .termly-host *, .termly-host {
          color: #e2e8f0 !important;
          background-color: transparent !important;
        }
        .termly-host a { color: #37F2D1 !important; }
        .termly-host h1, .termly-host h2, .termly-host h3, .termly-host h4 {
          color: #ffffff !important;
        }
        .termly-host hr { border-color: #1e293b !important; }
      `}</style>
    </div>
  );
}
