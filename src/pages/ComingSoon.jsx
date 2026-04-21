import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";

/**
 * Reusable "coming soon" page.
 *
 * New sidebar sections link to routes whose full pages live in
 * follow-up tasks. Rendering this placeholder lets the sidebar wire
 * up cleanly now and the real pages drop in without needing any
 * routing changes.
 */
export default function ComingSoon({
  title = "Coming Soon",
  subtitle = "This corner of the tavern is still being built.",
  icon: Icon = Sparkles,
}) {
  return (
    <div className="min-h-screen bg-[#050816] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#1E2430] border border-[#2a3441] mb-4">
          <Icon className="w-8 h-8 text-[#37F2D1]" />
        </div>
        <h1 className="text-3xl font-black text-white">{title}</h1>
        <p className="text-sm text-slate-400 mt-2">{subtitle}</p>
        <Link
          to="/"
          className="mt-6 inline-flex items-center gap-1 text-xs text-[#37F2D1] hover:underline"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back Home
        </Link>
      </div>
    </div>
  );
}
