import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function PageNotFound() {
  return (
    <div className="min-h-screen bg-[#0f1219] flex flex-col items-center justify-center text-center px-4">
      <Compass className="w-20 h-20 text-[#37F2D1] mb-6 animate-spin-slow" />
      <h1 className="text-6xl font-bold text-white mb-2">404</h1>
      <p className="text-xl text-slate-400 mb-2">You've wandered off the map.</p>
      <p className="text-slate-500 mb-8">
        This page doesn't exist — or maybe it's been banished to another plane.
      </p>
      <Link
        to="/"
        className="px-6 py-3 bg-[#37F2D1] text-[#1E2430] font-semibold rounded-lg hover:bg-[#2dd9bd] transition"
      >
        Return to Safety
      </Link>
    </div>
  );
}
